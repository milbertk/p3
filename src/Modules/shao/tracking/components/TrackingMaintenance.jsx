import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaFloppyDisk,
  FaMagnifyingGlass,
  FaPlus,
  FaTrash,
  FaListCheck,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa6";
import "./TrackingMaintenance.scss";

import SaveStepTemplateService from "../services/SaveStepTemplateService";
import SearchStepTemplatesService from "../services/SearchStepTemplatesService";
import SelectStepTemplateService from "../services/SelectStepTemplateService";
import StepTemplateStatusService from "../services/StepTemplateStatusService";

const saveStepTemplateService = new SaveStepTemplateService();
const searchStepTemplatesService = new SearchStepTemplatesService();
const selectStepTemplateService = new SelectStepTemplateService();
const stepTemplateStatusService = new StepTemplateStatusService();

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

function readSelectedCompanyId() {
  try {
    const raw = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return String(parsed?.companyId || parsed?.id || "").trim();
  } catch {
    return "";
  }
}

const EMPTY_TEMPLATE = {
  stepTemplateId: "",
  name: "",
  internalCode: "",
  steps: [],
};

// The "done" step is ALWAYS the last one. This normalizes any step list so only
// the last step has isDoneStep = true (auto, not chosen by the user).
function markLastAsDone(steps) {
  const list = Array.isArray(steps) ? steps : [];
  const lastIndex = list.length - 1;
  return list.map((s, i) => ({ ...s, isDoneStep: i === lastIndex }));
}

function makeStep() {
  // notifyCustomer (2026-10-31): email the customer when an order item reaches
  // this step. New steps start unchecked (internal steps stay private).
  return { name: "", requiresPrevious: false, isDoneStep: false, notifyCustomer: false };
}

// onSaved(stepTemplateId) (2026-10-29): optional, called after a successful
// save (used by the product form to select the new process and close).
export default function TrackingMaintenance({ t, onSaved = null }) {
  const tr = useMemo(() => {
    return (key, fallback) => {
      try {
        if (typeof t !== "function") return fallback;
        const value = t(key);
        return !value || value === key ? fallback : value;
      } catch {
        return fallback;
      }
    };
  }, [t]);

  const [template, setTemplate] = useState(EMPTY_TEMPLATE);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  // Save feedback next to the Save button (2026-10-30): the message at the
  // top was out of sight in the pop-up, so Save looked like doing nothing.
  const [fieldErrors, setFieldErrors] = useState({});
  const feedbackRef = useRef(null);
  // Delete / disable (2026-10-30): state of the opened process and how much
  // it is used ({ products, orderItems }); null = not loaded yet.
  const [templateActive, setTemplateActive] = useState(true);
  const [usage, setUsage] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const inUse = Boolean(usage && (usage.products > 0 || usage.orderItems > 0));

  useEffect(() => {
    if ((error || message) && feedbackRef.current?.scrollIntoView) {
      feedbackRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error, message]);

  const isEditing = Boolean(template.stepTemplateId);

  useEffect(() => {
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;
    let active = true;
    searchStepTemplatesService
      .getTemplates({ companyId, includeInactive: true })
      .then((rows) => {
        if (active) setResults(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleSearch = async () => {
    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setError(tr("stepTemplate.errors.missingCompany", "No company is selected."));
      return;
    }
    setSearching(true);
    setError("");
    setMessage("");
    try {
      const rows = await searchStepTemplatesService.getTemplates({
        companyId,
        term: search.trim(),
        includeInactive: true,
      });
      setResults(Array.isArray(rows) ? rows : []);
      if (!rows || rows.length === 0) {
        setMessage(tr("stepTemplate.messages.noResults", "No templates found."));
      }
    } catch (err) {
      setError(err?.message || tr("stepTemplate.errors.search", "Could not search."));
    } finally {
      setSearching(false);
    }
  };

  const loadTemplate = async (row) => {
    const companyId = readSelectedCompanyId();
    if (!companyId) return;
    setError("");
    setMessage("");
    try {
      const bundle = await selectStepTemplateService.getBundle({
        companyId,
        stepTemplateId: row.stepTemplateId || row.step_template_id,
      });
      if (!bundle) return;
      const header = bundle.template || {};
      const steps = (bundle.steps || []).map((s) => ({
        name: s.name || "",
        requiresPrevious: Boolean(s.requiresPrevious ?? s.requires_previous),
        isDoneStep: Boolean(s.isDoneStep ?? s.is_done_step),
        notifyCustomer: Boolean(s.notifyCustomer ?? s.notify_customer),
      }));
      setTemplateActive(header.active !== false);
      setUsage(bundle.usage || null);
      setTemplate({
        stepTemplateId: header.stepTemplateId || header.step_template_id || "",
        name: header.name || "",
        internalCode: header.internalCode || header.internal_code || "",
        steps: markLastAsDone(steps),
      });
      setMessage(tr("stepTemplate.messages.loaded", "Template loaded. You can edit it."));
    } catch (err) {
      setError(err?.message || tr("stepTemplate.errors.select", "Could not load the template."));
    }
  };

  const handleNew = () => {
    setTemplateActive(true);
    setUsage(null);
    setTemplate(EMPTY_TEMPLATE);
    setMessage("");
    setError("");
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setError("");
    setFieldErrors((current) => ({ ...current, [name]: false }));
    setTemplate((current) => ({ ...current, [name]: value }));
  };

  const addStep = () => {
    setFieldErrors((current) => ({ ...current, steps: false }));
    setTemplate((current) => ({
      ...current,
      steps: markLastAsDone([...current.steps, makeStep()]),
    }));
  };

  const updateStepName = (index, value) => {
    setFieldErrors((current) => ({ ...current, steps: false }));
    setTemplate((current) => ({
      ...current,
      steps: current.steps.map((s, i) => (i === index ? { ...s, name: value } : s)),
    }));
  };

  const toggleNotifyCustomer = (index, checked) => {
    setTemplate((current) => ({
      ...current,
      steps: current.steps.map((s, i) => (i === index ? { ...s, notifyCustomer: checked } : s)),
    }));
  };

  const toggleRequiresPrevious = (index, checked) => {
    setTemplate((current) => ({
      ...current,
      steps: current.steps.map((s, i) => (i === index ? { ...s, requiresPrevious: checked } : s)),
    }));
  };

  const removeStep = (index) => {
    setTemplate((current) => ({
      ...current,
      steps: markLastAsDone(current.steps.filter((_, i) => i !== index)),
    }));
  };

  const moveStep = (index, delta) => {
    setTemplate((current) => {
      const next = [...current.steps];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, steps: markLastAsDone(next) };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    // Keep the submit inside this form (it can live in a pop-up of another form).
    event.stopPropagation();
    setMessage("");
    setError("");

    // Every missing field is marked in red; the first message is shown.
    const missing = {
      name: !template.name.trim(),
      internalCode: !template.internalCode.trim(),
      steps: !template.steps.some((s) => s.name.trim() !== ""),
    };
    setFieldErrors(missing);
    if (missing.name) {
      setError(tr("stepTemplate.errors.nameRequired", "Please enter a name."));
      return;
    }
    if (missing.internalCode) {
      setError(tr("stepTemplate.errors.codeRequired", "Please enter an internal code."));
      return;
    }
    const cleanSteps = markLastAsDone(template.steps.filter((s) => s.name.trim() !== ""));
    if (cleanSteps.length === 0) {
      setError(tr("stepTemplate.errors.stepsRequired", "Add at least one step."));
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setError(tr("stepTemplate.errors.missingCompany", "No company is selected."));
      return;
    }

    const bundle = {
      template: {
        stepTemplateId: template.stepTemplateId || "",
        name: template.name.trim(),
        internalCode: template.internalCode.trim(),
      },
      steps: cleanSteps.map((s, index) => ({
        name: s.name.trim(),
        stepOrder: index + 1,
        requiresPrevious: index === 0 ? false : Boolean(s.requiresPrevious),
        isDoneStep: Boolean(s.isDoneStep),
        notifyCustomer: Boolean(s.notifyCustomer),
      })),
    };

    setSaving(true);
    try {
      const response = await saveStepTemplateService.save({ companyId, bundle });
      const savedId =
        response?.result?.template?.stepTemplateId ||
        response?.result?.template?.step_template_id ||
        "";
      if (savedId) {
        setTemplate((current) => ({ ...current, stepTemplateId: savedId }));
      }
      const savedHeader = response?.result?.template || {};
      setTemplateActive(savedHeader.active !== false);
      setUsage(response?.result?.usage || { products: 0, orderItems: 0 });
      setMessage(tr("stepTemplate.messages.saved", "Template saved successfully."));
      if (typeof onSaved === "function") {
        onSaved(savedId ? String(savedId) : "");
      }
      const rows = await searchStepTemplatesService.getTemplates({ companyId, includeInactive: true });
      setResults(Array.isArray(rows) ? rows : []);
    } catch (err) {
      console.error("[TrackingMaintenance] save failed:", err);
      setError(err?.message || tr("stepTemplate.errors.save", "The template could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const refreshResults = async (companyId) => {
    try {
      const rows = await searchStepTemplatesService.getTemplates({ companyId, includeInactive: true });
      setResults(Array.isArray(rows) ? rows : []);
    } catch {
      /* the list refreshes on the next search */
    }
  };

  // Delete a process that no product or order uses (2026-10-30).
  const handleDelete = async () => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !template.stepTemplateId) return;
    const question = tr(
      "stepTemplate.confirmDelete",
      "Delete this process and its steps? This cannot be undone.",
    );
    if (!window.confirm(question)) return;
    setChangingStatus(true);
    setError("");
    setMessage("");
    try {
      await stepTemplateStatusService.remove({ companyId, stepTemplateId: template.stepTemplateId });
      setTemplate(EMPTY_TEMPLATE);
      setTemplateActive(true);
      setUsage(null);
      setFieldErrors({});
      setMessage(tr("stepTemplate.messages.deleted", "Process deleted."));
      await refreshResults(companyId);
    } catch (err) {
      console.error("[TrackingMaintenance] delete failed:", err);
      setError(err?.message || tr("stepTemplate.errors.delete", "The process could not be deleted."));
    } finally {
      setChangingStatus(false);
    }
  };

  // Disable / enable: a disabled process is not offered for products.
  const handleSetActive = async (active) => {
    const companyId = readSelectedCompanyId();
    if (!companyId || !template.stepTemplateId) return;
    setChangingStatus(true);
    setError("");
    setMessage("");
    try {
      await stepTemplateStatusService.setActive({ companyId, stepTemplateId: template.stepTemplateId, active });
      setTemplateActive(active);
      setMessage(
        active
          ? tr("stepTemplate.messages.enabled", "Process enabled. It is offered again for products.")
          : tr("stepTemplate.messages.disabled", "Process disabled. It is no longer offered for new products; products and orders that use it keep working."),
      );
      await refreshResults(companyId);
    } catch (err) {
      console.error("[TrackingMaintenance] status change failed:", err);
      setError(err?.message || tr("stepTemplate.errors.status", "The process status could not be changed."));
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <section className="tracking-maintenance">
      <header className="tracking-maintenance__header">
        <div>
          <p className="tracking-maintenance__eyebrow">
            {tr("stepTemplate.eyebrow", "Processes")}
          </p>
          <h1>
            {isEditing
              ? tr("stepTemplate.titleEdit", "Edit process")
              : tr("stepTemplate.title", "Create a process")}
          </h1>
          <p>
            {tr(
              "stepTemplate.description",
              "Define a reusable set of steps. Later you can assign it to a product.",
            )}
          </p>
        </div>
      </header>

      {message && <div className="tracking-alert tracking-alert--success">{message}</div>}
      {error && <div className="tracking-alert tracking-alert--error">{error}</div>}

      <div className="tracking-searchbar">
        <div className="tracking-searchbar__input">
          <FaMagnifyingGlass aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
            placeholder={tr("stepTemplate.search.placeholder", "Search by name or code")}
          />
          <button type="button" onClick={handleSearch} disabled={searching}>
            {searching
              ? tr("stepTemplate.actions.searching", "Searching...")
              : tr("stepTemplate.actions.search", "Search")}
          </button>
        </div>

        {results.length > 0 && (
          <ul className="tracking-search-results">
            {results.map((row) => (
              <li key={row.stepTemplateId || row.step_template_id}>
                <button type="button" onClick={() => loadTemplate(row)}>
                  <strong>
                    {row.name}
                    {row.active === false && (
                      <span className="tracking-badge tracking-badge--off">
                        {tr("stepTemplate.status.disabled", "Disabled")}
                      </span>
                    )}
                  </strong>
                  <small>{row.internalCode || row.internal_code}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleSave}>
        <div className="tracking-panel">
          <div className="tracking-panel__title">
            <span>1</span>
            <div>
              <h2>{tr("stepTemplate.section.info", "Process information")}</h2>
              <p>{tr("stepTemplate.section.infoHelp", "Give the process a name and a code.")}</p>
            </div>
          </div>

          <div className="tracking-grid">
            <div className="tracking-field">
              <label htmlFor="st-name">
                {tr("stepTemplate.fields.name", "Name")}
                <span className="tracking-required">*</span>
              </label>
              <input
                id="st-name"
                name="name"
                value={template.name}
                onChange={updateField}
                className={fieldErrors.name ? "tracking-input--invalid" : undefined}
                aria-invalid={Boolean(fieldErrors.name)}
              />
            </div>
            <div className="tracking-field">
              <label htmlFor="st-code">
                {tr("stepTemplate.fields.internalCode", "Internal code")}
                <span className="tracking-required">*</span>
              </label>
              <input
                id="st-code"
                name="internalCode"
                value={template.internalCode}
                onChange={updateField}
                className={fieldErrors.internalCode ? "tracking-input--invalid" : undefined}
                aria-invalid={Boolean(fieldErrors.internalCode)}
              />
            </div>
          </div>
        </div>

        <div className="tracking-panel">
          <div className="tracking-panel__title">
            <span>2</span>
            <div>
              <h2>{tr("stepTemplate.section.steps", "Steps")}</h2>
              <p>{tr("stepTemplate.section.stepsHelp", "Add the steps in order.")}</p>
            </div>
            <button type="button" className="tracking-add-step" onClick={addStep}>
              <FaPlus aria-hidden="true" /> {tr("stepTemplate.actions.addStep", "Add step")}
            </button>
          </div>

          {template.steps.length === 0 ? (
            <p className={`tracking-empty${fieldErrors.steps ? " tracking-empty--invalid" : ""}`}>
              <FaListCheck aria-hidden="true" />{" "}
              {tr("stepTemplate.steps.empty", "No steps yet. Add the first one.")}
            </p>
          ) : (
            <div className="tracking-steps">
              {template.steps.map((step, index) => (
                <div className="tracking-step-row" key={index}>
                  <span className="tracking-step-row__order">{index + 1}</span>

                  <input
                    className={`tracking-step-row__name${fieldErrors.steps && !step.name.trim() ? " tracking-input--invalid" : ""}`}
                    value={step.name}
                    onChange={(event) => updateStepName(index, event.target.value)}
                    placeholder={tr("stepTemplate.steps.namePlaceholder", "Step name")}
                  />

                  {index > 0 && (
                    <label className="tracking-step-row__requires">
                      <input
                        type="checkbox"
                        checked={Boolean(step.requiresPrevious)}
                        onChange={(event) => toggleRequiresPrevious(index, event.target.checked)}
                      />
                      <span>{tr("stepTemplate.steps.requiresPrevious", "Requires previous")}</span>
                    </label>
                  )}

                  <label
                    className="tracking-step-row__requires tracking-step-row__notify"
                    title={tr(
                      "stepTemplate.steps.notifyCustomerHelp",
                      "When an order item reaches this step, the customer receives an email. Leave it unchecked for internal steps.",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(step.notifyCustomer)}
                      onChange={(event) => toggleNotifyCustomer(index, event.target.checked)}
                    />
                    <span>{tr("stepTemplate.steps.notifyCustomer", "Notify the customer (email)")}</span>
                  </label>

                  {index === template.steps.length - 1 && (
                    <label className="tracking-step-row__done">
                      <input type="checkbox" checked readOnly disabled />
                      <span>{tr("stepTemplate.steps.finalStep", "Final step (done)")}</span>
                    </label>
                  )}

                  <div className="tracking-step-row__actions">
                    <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label={tr("stepTemplate.actions.moveUp", "Move up")}>
                      <FaArrowUp />
                    </button>
                    <button type="button" onClick={() => moveStep(index, 1)} disabled={index === template.steps.length - 1} aria-label={tr("stepTemplate.actions.moveDown", "Move down")}>
                      <FaArrowDown />
                    </button>
                    <button type="button" className="tracking-step-row__delete" onClick={() => removeStep(index)} aria-label={tr("stepTemplate.actions.removeStep", "Remove step")}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Same message next to the Save button (2026-10-30). */}
        {(error || message) && (
          <div
            ref={feedbackRef}
            role={error ? "alert" : "status"}
            className={`tracking-alert tracking-alert--footer tracking-alert--${error ? "error" : "success"}`}
          >
            {error || message}
          </div>
        )}

        <footer className="tracking-maintenance__footer">
          {isEditing && usage && (
            <span className="tracking-usage">
              {inUse
                ? `${tr("stepTemplate.usage.usedBy", "Used by")} ${usage.products} ${tr("stepTemplate.usage.products", "product(s)")}, ${usage.orderItems} ${tr("stepTemplate.usage.orders", "order item(s)")}`
                : tr("stepTemplate.usage.notUsed", "Not used by any product or order")}
              {!templateActive && (
                <span className="tracking-badge tracking-badge--off">
                  {tr("stepTemplate.status.disabled", "Disabled")}
                </span>
              )}
            </span>
          )}
          {isEditing && usage && !inUse && (
            <button
              type="button"
              className="tracking-button tracking-button--danger"
              onClick={handleDelete}
              disabled={changingStatus || saving}
            >
              {tr("stepTemplate.actions.delete", "Delete")}
            </button>
          )}
          {isEditing && usage && (inUse || !templateActive) && (
            <button
              type="button"
              className="tracking-button"
              onClick={() => handleSetActive(!templateActive)}
              disabled={changingStatus || saving}
            >
              {templateActive
                ? tr("stepTemplate.actions.disable", "Disable")
                : tr("stepTemplate.actions.enable", "Enable")}
            </button>
          )}
          <button type="button" className="tracking-button" onClick={handleNew}>
            {tr("stepTemplate.actions.new", "New")}
          </button>
          <button type="submit" className="tracking-button tracking-button--primary" disabled={saving}>
            <FaFloppyDisk aria-hidden="true" />
            {saving
              ? tr("stepTemplate.actions.saving", "Saving...")
              : tr("stepTemplate.actions.save", "Save process")}
          </button>
        </footer>
      </form>
    </section>
  );
}