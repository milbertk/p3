import { useEffect, useMemo, useState } from "react";
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

const saveStepTemplateService = new SaveStepTemplateService();
const searchStepTemplatesService = new SearchStepTemplatesService();
const selectStepTemplateService = new SelectStepTemplateService();

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

function makeStep() {
  return { name: "", requiresPrevious: false };
}

export default function TrackingMaintenance({ t }) {
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

  const isEditing = Boolean(template.stepTemplateId);

  useEffect(() => {
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;
    let active = true;
    searchStepTemplatesService
      .getTemplates({ companyId })
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
      }));
      setTemplate({
        stepTemplateId: header.stepTemplateId || header.step_template_id || "",
        name: header.name || "",
        internalCode: header.internalCode || header.internal_code || "",
        steps,
      });
      setMessage(tr("stepTemplate.messages.loaded", "Template loaded. You can edit it."));
    } catch (err) {
      setError(err?.message || tr("stepTemplate.errors.select", "Could not load the template."));
    }
  };

  const handleNew = () => {
    setTemplate(EMPTY_TEMPLATE);
    setMessage("");
    setError("");
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setError("");
    setTemplate((current) => ({ ...current, [name]: value }));
  };

  const addStep = () => {
    setTemplate((current) => ({ ...current, steps: [...current.steps, makeStep()] }));
  };

  const updateStepName = (index, value) => {
    setTemplate((current) => ({
      ...current,
      steps: current.steps.map((s, i) => (i === index ? { ...s, name: value } : s)),
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
      steps: current.steps.filter((_, i) => i !== index),
    }));
  };

  const moveStep = (index, delta) => {
    setTemplate((current) => {
      const next = [...current.steps];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, steps: next };
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!template.name.trim()) {
      setError(tr("stepTemplate.errors.nameRequired", "Please enter a name."));
      return;
    }
    if (!template.internalCode.trim()) {
      setError(tr("stepTemplate.errors.codeRequired", "Please enter an internal code."));
      return;
    }
    const cleanSteps = template.steps.filter((s) => s.name.trim() !== "");
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
      setMessage(tr("stepTemplate.messages.saved", "Template saved successfully."));
      const rows = await searchStepTemplatesService.getTemplates({ companyId });
      setResults(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err?.message || tr("stepTemplate.errors.save", "The template could not be saved."));
    } finally {
      setSaving(false);
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
                  <strong>{row.name}</strong>
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
              <input id="st-name" name="name" value={template.name} onChange={updateField} />
            </div>
            <div className="tracking-field">
              <label htmlFor="st-code">
                {tr("stepTemplate.fields.internalCode", "Internal code")}
                <span className="tracking-required">*</span>
              </label>
              <input id="st-code" name="internalCode" value={template.internalCode} onChange={updateField} />
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
            <p className="tracking-empty">
              <FaListCheck aria-hidden="true" />{" "}
              {tr("stepTemplate.steps.empty", "No steps yet. Add the first one.")}
            </p>
          ) : (
            <div className="tracking-steps">
              {template.steps.map((step, index) => (
                <div className="tracking-step-row" key={index}>
                  <span className="tracking-step-row__order">{index + 1}</span>

                  <input
                    className="tracking-step-row__name"
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

        <footer className="tracking-maintenance__footer">
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