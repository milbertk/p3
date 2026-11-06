import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaCheck,
  FaDesktop,
  FaEnvelope,
  FaExclamationTriangle,
  FaFileContract,
  FaGlobeAmericas,
  FaImage,
  FaLink,
  FaMagic,
  FaMoneyBillWave,
  FaPalette,
  FaSave,
  FaServer,
  FaTimes,
  FaUpload,
} from "react-icons/fa";

import SelectPageConfigurationService from "../services/SelectPageConfigurationService";
import SavePageConfigurationService from "../services/SavePageConfigurationService";
import PageConfigurationImageUploadService from "../services/PageConfigurationImageUploadService";
import CompanySmtpPanel from "./CompanySmtpPanel";
import { COMPANY_TIME_ZONE_EVENT } from "../../../../Shared/Components/HeaderTools/CompanyClock";
import { refreshCompanyPlan } from "../../../../Shared/Services/CompanyPlanService";
import {
  CURRENCIES,
  CURRENCY_SYMBOL_MAX_LENGTH,
  DEFAULT_CURRENCY_SYMBOL,
  isPreloadedCurrencySymbol,
} from "../../../../Shared/Utils/currencies";
import {
  SLUG_MAX_LENGTH,
  buildStoreUrl,
  normalizeSlug,
  slugProblem,
  storeKey,
} from "../../../../Shared/Utils/storeLink";
import {
  DEFAULT_TIME_ZONE,
  TIME_ZONE_LABEL_MAX_LENGTH,
  browserTimeZone,
  isValidTimeZone,
  sortedTimeZones,
  timeInZone,
  zoneOffsets,
  zoneOptionLabel,
} from "../../../../Shared/Utils/timeZones";

import "./PageConfiguration.scss";

// Must stay in sync with allowedFonts in the backend business layer.
const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Trebuchet MS", label: "Trebuchet MS" },
];

// The two images a company uploads for its customer page (showcase).
// ratio is width / height; tolerance is how far (relative) the uploaded image
// may deviate from it before a warning is shown. Images are never rejected
// for their size: the warning only guides the user.
const IMAGE_KINDS = {
  logo: { ratio: 1, tolerance: 0.05 }, // square, e.g. 512 x 512 px
  header: { ratio: 4, tolerance: 0.25 }, // wide rectangle, e.g. 1920 x 480 px
};

const EMPTY_IMAGE = { url: "", path: "", file: null };

// Languages for the messages sent to customers (more can be added later).
// Must stay in sync with allowedNotificationLanguages in the backend.
const NOTIFICATION_LANGUAGES = ["en", "es"];
const DEFAULT_NOTIFICATION_LANGUAGE = "en";

const OTHER_CURRENCY_VALUE = "__other__";

// Same limit as shao (maxLegalTextLength).
const LEGAL_TEXT_MAX_LENGTH = 20000;

const EMPTY_CONFIGURATION = {
  displayName: "",
  fontFamily: "",
  slug: "",
  // One currency for the whole store + how customers pay (2026-10-22).
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
  currencyOther: false, // UI only: symbol typed by hand
  paymentInstructions: "",
  notificationEmail: "",
  contactWhatsapp: "",
  // Store "Contact us" + customer service (2026-10-31).
  socialLink: "",
  socialLinkType: "FACEBOOK",
  customerServiceEmail: "",
  notificationLanguage: DEFAULT_NOTIFICATION_LANGUAGE,
  // Use the AlephK general email while the company has no SMTP (2026-10-30).
  useDefaultSmtp: false,
  // Legal texts for the store (2026-10-24). Empty = the store shows nothing.
  termsText: "",
  privacyText: "",
  // Company time zone (2026-11-04): IANA name, e.g. "America/Costa_Rica".
  // The server works in GMT; "now" and "today" use this zone.
  timeZone: DEFAULT_TIME_ZONE,
  timeZoneLabel: "",
  logo: EMPTY_IMAGE,
  header: EMPTY_IMAGE,
};

// Social network of the company link (2026-10-31): only chooses the icon in the store.
const SOCIAL_LINK_TYPES = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "OTHER"];

// Selected company is persisted by the header/menu. Read it from localStorage.
const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const selectPageConfigurationService = new SelectPageConfigurationService();
const savePageConfigurationService = new SavePageConfigurationService();
const imageUploadService = new PageConfigurationImageUploadService();

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

// Maps a backend configuration (or null) to the form state.
function toFormState(result) {
  return {
    displayName: result?.displayName || "",
    fontFamily: result?.fontFamily || "",
    slug: result?.slug || "",
    currencySymbol: String(result?.currencySymbol || "").trim() || DEFAULT_CURRENCY_SYMBOL,
    currencyOther: !isPreloadedCurrencySymbol(
      String(result?.currencySymbol || "").trim() || DEFAULT_CURRENCY_SYMBOL,
    ),
    paymentInstructions: result?.paymentInstructions || "",
    notificationEmail: result?.notificationEmail || "",
    contactWhatsapp: result?.contactWhatsapp || "",
    socialLink: result?.socialLink || "",
    socialLinkType: SOCIAL_LINK_TYPES.includes(result?.socialLinkType) ? result.socialLinkType : "FACEBOOK",
    customerServiceEmail: result?.customerServiceEmail || "",
    notificationLanguage: NOTIFICATION_LANGUAGES.includes(result?.notificationLanguage)
      ? result.notificationLanguage
      : DEFAULT_NOTIFICATION_LANGUAGE,
    useDefaultSmtp: Boolean(result?.useDefaultSmtp),
    termsText: result?.termsText || "",
    privacyText: result?.privacyText || "",
    timeZone: String(result?.timeZone || "").trim() || DEFAULT_TIME_ZONE,
    timeZoneLabel: result?.timeZoneLabel || "",
    logo: { url: result?.logoUrl || "", path: result?.logoPath || "", file: null },
    header: { url: result?.headerUrl || "", path: result?.headerPath || "", file: null },
  };
}

// Storage paths currently persisted in the database, per image kind.
function toPersistedPaths(result) {
  return { logo: result?.logoPath || "", header: result?.headerPath || "" };
}

// Creates a preview URL for a selected file and reads its pixel size, so the
// user can be warned when the image does not have the recommended shape.
function useLocalImage(file) {
  const [localImage, setLocalImage] = useState({ src: "", width: 0, height: 0 });

  useEffect(() => {
    if (!file) {
      setLocalImage({ src: "", width: 0, height: 0 });
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    let active = true;

    setLocalImage({ src: objectUrl, width: 0, height: 0 });
    image.onload = () => {
      if (active) {
        setLocalImage({ src: objectUrl, width: image.naturalWidth, height: image.naturalHeight });
      }
    };
    image.src = objectUrl;

    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return localImage;
}

function hasRecommendedShape(kind, width, height) {
  if (!width || !height) return true;
  const { ratio, tolerance } = IMAGE_KINDS[kind];
  return Math.abs(width / height - ratio) / ratio <= tolerance;
}

function ImageField({ t, kind, image, localImage, disabled, onSelect, onRemove }) {
  const hasImage = Boolean(image.file || image.url);
  const fileLabel =
    image.file?.name ||
    (image.url ? t("pageConfiguration.currentImage") : t("pageConfiguration.noFileSelected"));
  const showShapeWarning =
    Boolean(image.file) && !hasRecommendedShape(kind, localImage.width, localImage.height);

  return (
    <div className="page-configuration__upload-field">
      <span>{t(`pageConfiguration.fields.${kind}`)}</span>
      <div className="page-configuration__upload-row">
        <label className="page-configuration__upload-button">
          <FaUpload /> {t(`pageConfiguration.actions.choose.${kind}`)}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => onSelect(kind, event)}
            disabled={disabled}
          />
        </label>
        {hasImage && (
          <button
            type="button"
            className="page-configuration__remove-image"
            onClick={() => onRemove(kind)}
            disabled={disabled}
          >
            <FaTimes /> {t("pageConfiguration.actions.removeImage")}
          </button>
        )}
      </div>
      <strong className="page-configuration__file-name">
        {fileLabel}
        {localImage.width > 0 && ` · ${localImage.width} × ${localImage.height} px`}
      </strong>
      <small>{t(`pageConfiguration.help.${kind}`)}</small>
      {showShapeWarning && (
        <div className="page-configuration__warning" role="status">
          <FaExclamationTriangle /> {t(`pageConfiguration.warnings.${kind}Shape`)}
        </div>
      )}
    </div>
  );
}

export default function PageConfiguration({ t, onClose }) {
  const { i18n } = useTranslation();
  const [configuration, setConfiguration] = useState(EMPTY_CONFIGURATION);
  // Time zone saved in the database: a change shows a warning (2026-11-04).
  const [savedTimeZone, setSavedTimeZone] = useState(DEFAULT_TIME_ZONE);
  const [timeZoneNotice, setTimeZoneNotice] = useState("");
  // Storage paths of the images currently persisted in the database, so they
  // can be deleted from Firebase once they are replaced or removed.
  const [persistedPaths, setPersistedPaths] = useState(toPersistedPaths(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // Store address (slug): error key or "taken" from the server.
  const [slugError, setSlugError] = useState("");
  // Company's own SMTP: panel visibility + last known status.
  const [showSmtp, setShowSmtp] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState(null);
  const companyId = readSelectedCompanyId();

  const localLogo = useLocalImage(configuration.logo.file);
  const localHeader = useLocalImage(configuration.header.file);

  // Load the saved configuration of the selected company when the screen opens.
  useEffect(() => {
    const controller = new AbortController();
    const companyId = readSelectedCompanyId();

    if (!companyId) {
      setErrorMessage(t("pageConfiguration.errors.noCompany"));
      setLoading(false);
      return () => controller.abort();
    }

    selectPageConfigurationService
      .selectPageConfiguration({ companyId, signal: controller.signal })
      .then((result) => {
        const form = toFormState(result);
        setConfiguration(form);
        setSavedTimeZone(form.timeZone);
        setPersistedPaths(toPersistedPaths(result));
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("[PageConfiguration] Load failed:", error);
        setErrorMessage(t("pageConfiguration.errors.load"));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [t]);

  const logoPreview = localLogo.src || configuration.logo.url;
  const headerPreview = localHeader.src || configuration.header.url;

  const updateField = (event) => {
    const { name, value } = event.target;
    setSaved(false);
    if (name === "slug") setSlugError("");
    setConfiguration((current) => ({ ...current, [name]: value }));
  };

  // Store address: clean it while leaving the field and when suggesting.
  const normalizeSlugField = () => {
    setConfiguration((current) => ({ ...current, slug: normalizeSlug(current.slug) }));
  };

  const suggestSlug = () => {
    setSaved(false);
    setSlugError("");
    setConfiguration((current) => ({ ...current, slug: normalizeSlug(current.displayName) }));
  };

  // Store currency: a preloaded one or "Other" (typed, max 5 characters).
  const changeCurrency = (event) => {
    const { value } = event.target;
    setSaved(false);
    setConfiguration((current) =>
      value === OTHER_CURRENCY_VALUE
        ? { ...current, currencyOther: true, currencySymbol: current.currencyOther ? current.currencySymbol : "" }
        : { ...current, currencyOther: false, currencySymbol: value },
    );
  };

  // Company time zone (2026-11-04): list with GMT offsets, this computer's zone.
  const language = i18n?.resolvedLanguage || i18n?.language || "en";
  const summerWord = t("pageConfiguration.timeZone.summer", { defaultValue: "summer" });
  const myTimeZone = browserTimeZone();
  const timeZoneOptions = useMemo(
    () => sortedTimeZones(savedTimeZone, configuration.timeZone, myTimeZone),
    [savedTimeZone, configuration.timeZone, myTimeZone],
  );
  const selectedOffsets = zoneOffsets(configuration.timeZone);
  const selectedHasSummer = selectedOffsets.summer !== selectedOffsets.standard;
  const timeZoneChanged = configuration.timeZone !== savedTimeZone;

  const useMyTimeZone = () => {
    if (!isValidTimeZone(myTimeZone)) {
      setTimeZoneNotice(t("pageConfiguration.timeZone.mineUnknown", { defaultValue: "The time zone of this computer could not be read. Choose it from the list." }));
      return;
    }
    setSaved(false);
    setTimeZoneNotice("");
    setConfiguration((current) => ({ ...current, timeZone: myTimeZone }));
  };

  const cleanSlug = normalizeSlug(configuration.slug);
  const slugPreviewUrl = buildStoreUrl(storeKey({ slug: cleanSlug, companyId }));

  const saveConfiguration = async (event) => {
    event.preventDefault();
    if (saving) return;

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setErrorMessage(t("pageConfiguration.errors.noCompany"));
      return;
    }

    const slug = normalizeSlug(configuration.slug);
    const problem = slugProblem(slug);
    if (problem) {
      setSlugError(problem);
      setErrorMessage(t(`pageConfiguration.slug.errors.${problem}`));
      return;
    }

    setSaving(true);
    setSaved(false);
    setErrorMessage("");
    setSlugError("");

    const uploadedPaths = [];

    try {
      const images = {};

      for (const kind of Object.keys(IMAGE_KINDS)) {
        const image = configuration[kind];
        images[kind] = { url: image.url, path: image.path };

        if (image.file) {
          const uploaded = await imageUploadService.uploadImage({
            companyId,
            kind,
            file: image.file,
          });
          uploadedPaths.push(uploaded.path);
          images[kind] = uploaded;
        }
      }

      const result = await savePageConfigurationService.savePageConfiguration({
        companyId,
        configuration: {
          displayName: configuration.displayName,
          fontFamily: configuration.fontFamily,
          slug,
          currencySymbol: String(configuration.currencySymbol || "").trim() || DEFAULT_CURRENCY_SYMBOL,
          paymentInstructions: configuration.paymentInstructions,
          notificationEmail: configuration.notificationEmail,
          contactWhatsapp: configuration.contactWhatsapp,
          socialLink: configuration.socialLink,
          socialLinkType: configuration.socialLinkType,
          customerServiceEmail: configuration.customerServiceEmail,
          notificationLanguage: configuration.notificationLanguage,
          useDefaultSmtp: Boolean(configuration.useDefaultSmtp),
          termsText: configuration.termsText,
          privacyText: configuration.privacyText,
          timeZone: configuration.timeZone,
          timeZoneLabel: configuration.timeZoneLabel,
          logoUrl: images.logo.url,
          logoPath: images.logo.path,
          headerUrl: images.header.url,
          headerPath: images.header.path,
        },
      });

      // Old images that are no longer referenced are removed from Firebase.
      const newPaths = toPersistedPaths(result);
      Object.keys(IMAGE_KINDS).forEach((kind) => {
        if (persistedPaths[kind] && persistedPaths[kind] !== newPaths[kind]) {
          imageUploadService.deleteImage(persistedPaths[kind]);
        }
      });

      const form = toFormState(result);
      setConfiguration(form);
      setSavedTimeZone(form.timeZone);
      setTimeZoneNotice("");
      // The clock in the top bar shows the new zone at once (2026-11-04).
      window.dispatchEvent(
        new CustomEvent(COMPANY_TIME_ZONE_EVENT, {
          detail: { companyId, timeZone: form.timeZone, timeZoneLabel: form.timeZoneLabel },
        }),
      );
      setPersistedPaths(newPaths);
      setSaved(true);
      // Basic company (2026-10-29): the plans window re-reads what is missing.
      refreshCompanyPlan(companyId);
    } catch (error) {
      console.error("[PageConfiguration] Save failed:", error);

      // The configuration was not saved, so the new uploads are orphaned.
      uploadedPaths.forEach((path) => imageUploadService.deleteImage(path));

      if (error?.status === 409) {
        // Another company already uses this store address.
        setSlugError("taken");
        setErrorMessage(t("pageConfiguration.slug.errors.taken"));
      } else {
        setErrorMessage(error?.message || t("pageConfiguration.errors.save"));
      }
    } finally {
      setSaving(false);
    }
  };

  const selectImage = (kind, event) => {
    const file = event.target.files?.[0] || null;
    // Allow choosing the same file again after removing it.
    event.target.value = "";
    if (!file) return;

    setSaved(false);
    setConfiguration((current) => ({
      ...current,
      [kind]: { ...current[kind], file },
    }));
  };

  const removeImage = (kind) => {
    setSaved(false);
    setConfiguration((current) => ({ ...current, [kind]: EMPTY_IMAGE }));
  };

  return (
    <section className="page-configuration">
      <div className="page-configuration__heading">
        <span className="page-configuration__heading-icon"><FaPalette /></span>
        <div>
          <span>{t("pageConfiguration.eyebrow")}</span>
          <h1>{t("pageConfiguration.title")}</h1>
          <p>{t("pageConfiguration.description")}</p>
        </div>
      </div>

      {errorMessage && (
        <div className="page-configuration__error" role="alert">
          {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="page-configuration__loading" role="status">
          {t("pageConfiguration.loading")}
        </div>
      ) : (
        <form className="page-configuration__layout" onSubmit={saveConfiguration}>
          <div className="page-configuration__form">
            <label>
              <span>{t("pageConfiguration.fields.displayName")}</span>
              <input
                name="displayName"
                value={configuration.displayName}
                onChange={updateField}
                placeholder={t("pageConfiguration.placeholders.displayName")}
                maxLength={120}
                required
              />
              <small>{t("pageConfiguration.help.displayName")}</small>
            </label>

            {/* ---- Store address (slug) ---- */}
            <label className={slugError ? "page-configuration__slug has-error" : "page-configuration__slug"}>
              <span><FaLink /> {t("pageConfiguration.slug.label")}</span>
              <div className="page-configuration__slug-row">
                <input
                  name="slug"
                  value={configuration.slug}
                  onChange={updateField}
                  onBlur={normalizeSlugField}
                  placeholder={t("pageConfiguration.slug.placeholder")}
                  maxLength={SLUG_MAX_LENGTH + 10}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(slugError)}
                />
                <button
                  type="button"
                  onClick={suggestSlug}
                  disabled={saving || !configuration.displayName.trim()}
                  title={t("pageConfiguration.slug.suggest")}
                >
                  <FaMagic /> {t("pageConfiguration.slug.suggest")}
                </button>
              </div>
              {slugPreviewUrl && (
                <small className="page-configuration__slug-preview">
                  {t("pageConfiguration.slug.preview")} <strong>{slugPreviewUrl}</strong>
                </small>
              )}
              {slugError ? (
                <small className="page-configuration__slug-error" role="alert">
                  {t(`pageConfiguration.slug.errors.${slugError}`)}
                </small>
              ) : (
                <small>{t("pageConfiguration.slug.help")}</small>
              )}
            </label>

            <label>
              <span>{t("pageConfiguration.fields.font")}</span>
              <select name="fontFamily" value={configuration.fontFamily} onChange={updateField}>
                <option value="">{t("pageConfiguration.placeholders.font")}</option>
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>{font.label}</option>
                ))}
              </select>
            </label>

            <ImageField
              t={t}
              kind="logo"
              image={configuration.logo}
              localImage={localLogo}
              disabled={saving}
              onSelect={selectImage}
              onRemove={removeImage}
            />

            <ImageField
              t={t}
              kind="header"
              image={configuration.header}
              localImage={localHeader}
              disabled={saving}
              onSelect={selectImage}
              onRemove={removeImage}
            />

            <small>{t("pageConfiguration.help.upload")}</small>

            {/* ---- Company time zone (2026-11-04) ---- */}
            <div className="page-configuration__section-title">
              <FaGlobeAmericas /> {t("pageConfiguration.sections.timeZone", { defaultValue: "Time zone" })}
            </div>

            <label>
              <span>{t("pageConfiguration.fields.timeZone", { defaultValue: "Company time zone" })}</span>
              <div className="page-configuration__timezone-row">
                <select name="timeZone" value={configuration.timeZone} onChange={(event) => { setTimeZoneNotice(""); updateField(event); }}>
                  {timeZoneOptions.map((item) => (
                    <option key={item.zone} value={item.zone}>
                      {zoneOptionLabel(item.zone, language, summerWord)}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={useMyTimeZone} disabled={saving}>
                  <FaDesktop /> {t("pageConfiguration.timeZone.useMine", { defaultValue: "Use my computer's time zone" })}
                </button>
              </div>
              <small className="page-configuration__timezone-now">
                {t("pageConfiguration.timeZone.now", {
                  defaultValue: "Now in this zone: {{time}}",
                  time: timeInZone(configuration.timeZone),
                })}
                {selectedHasSummer &&
                  ` · ${t("pageConfiguration.timeZone.summerNote", {
                    defaultValue: "This zone uses summer time: the hour changes by itself twice a year.",
                  })}`}
              </small>
              <small>
                {t("pageConfiguration.help.timeZone", {
                  defaultValue:
                    "\"Today\", the free slots, the change and cancel windows, the emails and the assistant use this zone. The server works in GMT; the list shows the GMT offset of each zone.",
                })}
              </small>
            </label>
            {timeZoneNotice && (
              <div className="page-configuration__warning" role="status">
                <FaExclamationTriangle /> {timeZoneNotice}
              </div>
            )}
            {timeZoneChanged && (
              <div className="page-configuration__warning" role="status">
                <FaExclamationTriangle />{" "}
                {t("pageConfiguration.warnings.timeZoneChanged", {
                  defaultValue:
                    "You are changing the time zone. Saved appointments and slots keep their hours (2 p.m. stays 2 p.m.). Only the current time used for the calculations changes: today, the free slots, and the change and cancel windows.",
                })}
                {configuration.timeZoneLabel.trim() &&
                  ` ${t("pageConfiguration.warnings.timeZoneLabelCheck", {
                    defaultValue: "Check the text for customers too: it says \"{{label}}\".",
                    label: configuration.timeZoneLabel.trim(),
                  })}`}
              </div>
            )}

            <label>
              <span>{t("pageConfiguration.fields.timeZoneLabel", { defaultValue: "Text for customers (optional)" })}</span>
              <input
                name="timeZoneLabel"
                value={configuration.timeZoneLabel}
                onChange={updateField}
                maxLength={TIME_ZONE_LABEL_MAX_LENGTH}
                placeholder={t("pageConfiguration.placeholders.timeZoneLabel", { defaultValue: "Costa Rica time" })}
              />
              <small>
                {t("pageConfiguration.help.timeZoneLabel", {
                  defaultValue:
                    "Shown next to the hours in the store and the emails, e.g. \"Costa Rica time, GMT−6\". Empty = the name of the zone. Up to {{max}} characters.",
                  max: TIME_ZONE_LABEL_MAX_LENGTH,
                })}
              </small>
            </label>

            {/* ---- Store money: one currency + payment instructions ---- */}
            <div className="page-configuration__section-title">
              <FaMoneyBillWave /> {t("pageConfiguration.sections.money")}
            </div>

            <label>
              <span>{t("pageConfiguration.fields.currency")}</span>
              <div className="page-configuration__currency-row">
                <select
                  value={configuration.currencyOther ? OTHER_CURRENCY_VALUE : configuration.currencySymbol}
                  onChange={changeCurrency}
                  aria-label={t("pageConfiguration.fields.currency")}
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.symbol}>
                      {`${currency.symbol}  ${t(`products.form.currencies.${currency.code}`, { defaultValue: currency.name })} (${currency.code})`}
                    </option>
                  ))}
                  <option value={OTHER_CURRENCY_VALUE}>{t("pageConfiguration.fields.currencyOther")}</option>
                </select>
                {configuration.currencyOther && (
                  <input
                    name="currencySymbol"
                    value={configuration.currencySymbol}
                    onChange={updateField}
                    maxLength={CURRENCY_SYMBOL_MAX_LENGTH}
                    placeholder="$"
                    aria-label={t("pageConfiguration.fields.currencySymbol")}
                    autoFocus
                  />
                )}
              </div>
              <small>{t("pageConfiguration.help.currency")}</small>
            </label>

            <label>
              <span>{t("pageConfiguration.fields.paymentInstructions")}</span>
              <textarea
                name="paymentInstructions"
                value={configuration.paymentInstructions}
                onChange={updateField}
                rows={4}
                maxLength={1000}
                placeholder={t("pageConfiguration.placeholders.paymentInstructions")}
              />
              <small>{t("pageConfiguration.help.paymentInstructions")}</small>
            </label>

            {/* ---- Legal texts for the store (only shown when written) ---- */}
            <div className="page-configuration__section-title">
              <FaFileContract /> {t("pageConfiguration.sections.legal", { defaultValue: "Terms and privacy" })}
            </div>

            <label>
              <span>{t("pageConfiguration.fields.termsText", { defaultValue: "Terms and conditions" })}</span>
              <textarea
                name="termsText"
                value={configuration.termsText}
                onChange={updateField}
                rows={6}
                maxLength={LEGAL_TEXT_MAX_LENGTH}
                placeholder={t("pageConfiguration.placeholders.termsText", { defaultValue: "Write the terms of your store: orders, payments, deliveries, cancellations..." })}
              />
              <small>
                {t("pageConfiguration.help.legalText", {
                  defaultValue: "Optional. When empty, the store does not show this link. Plain text, up to {{max}} characters.",
                  max: LEGAL_TEXT_MAX_LENGTH,
                })}
              </small>
            </label>

            <label>
              <span>{t("pageConfiguration.fields.privacyText", { defaultValue: "Privacy policy" })}</span>
              <textarea
                name="privacyText"
                value={configuration.privacyText}
                onChange={updateField}
                rows={6}
                maxLength={LEGAL_TEXT_MAX_LENGTH}
                placeholder={t("pageConfiguration.placeholders.privacyText", { defaultValue: "Explain what customer data you collect (name, phone, email, address), why, and how customers can ask to change or delete it." })}
              />
              <small>
                {t("pageConfiguration.help.legalText", {
                  defaultValue: "Optional. When empty, the store does not show this link. Plain text, up to {{max}} characters.",
                  max: LEGAL_TEXT_MAX_LENGTH,
                })}
              </small>
            </label>

            {/* ---- Communication with customers ---- */}
            <div className="page-configuration__section-title">
              <FaEnvelope /> {t("pageConfiguration.sections.communication")}
            </div>

            <label>
              <span>{t("pageConfiguration.fields.notificationEmail")}</span>
              <input
                name="notificationEmail"
                type="email"
                value={configuration.notificationEmail}
                onChange={updateField}
                placeholder={t("pageConfiguration.placeholders.notificationEmail")}
                maxLength={254}
              />
              <small>{t("pageConfiguration.help.notificationEmail")}</small>
            </label>
            {!configuration.notificationEmail.trim() && (
              <div className="page-configuration__warning" role="status">
                <FaExclamationTriangle /> {t("pageConfiguration.warnings.noNotificationEmail")}
              </div>
            )}

            <label>
              <span>{t("pageConfiguration.fields.contactWhatsapp")}</span>
              <input
                name="contactWhatsapp"
                type="tel"
                value={configuration.contactWhatsapp}
                onChange={updateField}
                placeholder="+506 8888 7777"
                maxLength={30}
              />
              <small>{t("pageConfiguration.help.contactWhatsapp")}</small>
            </label>

            {/* Social network link for the store "Contact us" (2026-10-31). */}
            <div className="page-configuration__social">
              <label>
                <span>{t("pageConfiguration.fields.socialLink", { defaultValue: "Social network link" })}</span>
                <input
                  name="socialLink"
                  type="url"
                  value={configuration.socialLink}
                  onChange={updateField}
                  placeholder="https://www.facebook.com/yourpage"
                  maxLength={500}
                />
              </label>
              <label>
                <span>{t("pageConfiguration.fields.socialLinkType", { defaultValue: "Network" })}</span>
                <select name="socialLinkType" value={configuration.socialLinkType} onChange={updateField}>
                  {SOCIAL_LINK_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`pageConfiguration.socialLinkTypes.${type}`, {
                        defaultValue: { FACEBOOK: "Facebook / Messenger", INSTAGRAM: "Instagram", TIKTOK: "TikTok", OTHER: "Other" }[type],
                      })}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <small className="page-configuration__checkbox-help">
              {t("pageConfiguration.help.socialLink", {
                defaultValue:
                  "Optional. Paste the link of your page (Facebook, Messenger, Instagram, TikTok…) and choose the network for its icon. The store shows \"Contact us\" with WhatsApp and this link, only the ones you fill in.",
              })}
            </small>

            <label>
              <span>{t("pageConfiguration.fields.customerServiceEmail", { defaultValue: "Customer service email" })}</span>
              <input
                name="customerServiceEmail"
                type="email"
                value={configuration.customerServiceEmail}
                onChange={updateField}
                placeholder="service@yourcompany.com"
                maxLength={254}
              />
              <small>
                {t("pageConfiguration.help.customerServiceEmail", {
                  defaultValue:
                    "Optional. Receives a blind copy of every email sent to your customers (orders, bookings, changes, tracking). Customers reply to this email.",
                })}
              </small>
            </label>

            <label>
              <span>{t("pageConfiguration.fields.notificationLanguage")}</span>
              <select name="notificationLanguage" value={configuration.notificationLanguage} onChange={updateField}>
                {NOTIFICATION_LANGUAGES.map((code) => (
                  <option key={code} value={code}>{t(`pageConfiguration.languages.${code}`)}</option>
                ))}
              </select>
              <small>{t("pageConfiguration.help.notificationLanguage")}</small>
            </label>

            {/* AlephK general email (2026-10-30): used only while the company
                has no email server (SMTP) of its own, and only when checked. */}
            <label className="page-configuration__checkbox">
              <input
                type="checkbox"
                name="useDefaultSmtp"
                checked={Boolean(configuration.useDefaultSmtp)}
                onChange={(event) => {
                  setSaved(false);
                  const { checked } = event.target;
                  setConfiguration((current) => ({ ...current, useDefaultSmtp: checked }));
                }}
              />
              <span>
                {t("pageConfiguration.fields.useDefaultSmtp", {
                  defaultValue: "Use the AlephK general email while my company has no email server (SMTP)",
                })}
              </span>
            </label>
            <small className="page-configuration__checkbox-help">
              {t("pageConfiguration.help.useDefaultSmtp", {
                defaultValue:
                  "If your company has its own SMTP, it is always used. Without your own SMTP and without this option, your customers receive no emails.",
              })}
            </small>

            {/* Company copies with the AlephK general email (2026-10-30): the
                copy of every customer email goes ONLY to the notification
                email (the owner's email), never to the AlephK account. Same
                field as "Notification email", shown here for clarity. */}
            {configuration.useDefaultSmtp && (
              <div className="page-configuration__copy-email">
                <label>
                  <span>
                    {t("pageConfiguration.fields.copyEmail", { defaultValue: "Email for copies (owner)" })}
                  </span>
                  <input
                    name="notificationEmail"
                    type="email"
                    value={configuration.notificationEmail}
                    onChange={updateField}
                    placeholder={t("pageConfiguration.placeholders.notificationEmail")}
                    maxLength={254}
                  />
                  <small>
                    {t("pageConfiguration.help.copyEmail", {
                      defaultValue:
                        "With the AlephK general email, the copy of every email sent to your customers goes only to this email (it is the same Notification email above). It is never sent to the AlephK account.",
                    })}
                  </small>
                </label>
                {!configuration.notificationEmail.trim() && (
                  <div className="page-configuration__warning" role="status">
                    <FaExclamationTriangle />{" "}
                    {t("pageConfiguration.warnings.noCopyEmail", {
                      defaultValue: "Without this email you won't receive the copies of your customer emails.",
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="page-configuration__smtp-row">
              <button
                type="button"
                className="page-configuration__smtp-button"
                onClick={() => setShowSmtp((current) => !current)}
                aria-expanded={showSmtp}
              >
                <FaServer /> {t("pageConfiguration.smtp.button")}
              </button>
              {smtpStatus && (
                <span className={`page-configuration__smtp-state ${smtpStatus.configured && smtpStatus.enabled ? "is-ok" : "is-off"}`}>
                  {smtpStatus.configured && smtpStatus.enabled
                    ? t("pageConfiguration.smtp.configured")
                    : t("pageConfiguration.smtp.notConfiguredShort")}
                </span>
              )}
            </div>

            {saved && (
              <div className="page-configuration__success" role="status">
                <FaCheck /> {t("pageConfiguration.saved")}
              </div>
            )}

            <div className="page-configuration__actions">
              {onClose && (
                <button type="button" className="page-configuration__cancel" onClick={onClose}>
                  <FaTimes /> {t("pageConfiguration.actions.cancel")}
                </button>
              )}
              <button type="submit" className="page-configuration__save" disabled={saving}>
                <FaSave />{" "}
                {saving ? t("pageConfiguration.actions.saving") : t("pageConfiguration.actions.save")}
              </button>
            </div>
          </div>

          <aside className="page-configuration__preview" style={{ fontFamily: configuration.fontFamily || "inherit" }}>
            <span>{t("pageConfiguration.preview")}</span>
            <div className="page-configuration__header-image">
              {headerPreview ? (
                <img src={headerPreview} alt={t("pageConfiguration.headerPreviewAlt")} />
              ) : (
                <><FaImage /><small>{t("pageConfiguration.noHeader")}</small></>
              )}
            </div>
            <div className="page-configuration__logo-image">
              {logoPreview ? (
                <img src={logoPreview} alt={t("pageConfiguration.logoPreviewAlt")} />
              ) : (
                <small>{t("pageConfiguration.noLogo")}</small>
              )}
            </div>
            <h2>{configuration.displayName || t("pageConfiguration.previewName")}</h2>
            <p>{t("pageConfiguration.previewDescription")}</p>
          </aside>
        </form>
      )}

      {/* The SMTP panel has its own Save button, so it lives outside the form.
          It is always mounted (hidden until opened) to know the SMTP status. */}
      {!loading && companyId && (
        <div hidden={!showSmtp}>
          <CompanySmtpPanel
            t={t}
            companyId={companyId}
            defaultTestTo={configuration.notificationEmail}
            defaultFromName={configuration.displayName}
            onClose={() => setShowSmtp(false)}
            onStatusChange={setSmtpStatus}
          />
        </div>
      )}
    </section>
  );
}
