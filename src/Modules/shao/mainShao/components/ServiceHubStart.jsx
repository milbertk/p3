import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FaTools,
  FaBuilding,
  FaArrowRight,
  FaExclamationTriangle,
  FaSyncAlt,
  FaClipboardList,
  FaUsersCog,
  FaChartLine,
  FaHeadset,
  FaShareAlt,
  FaCopy,
  FaCheck,
  FaTimes,
  FaExternalLinkAlt,
  FaBolt,
  FaBoxOpen,
  FaUserPlus,
  FaCalendarPlus,
  FaPalette,
  FaEnvelope,
  FaWhatsapp,
  FaQrcode,
  FaDownload,
  FaLink,
} from "react-icons/fa";
import QRCode from "qrcode";

import "./ServiceHubStart.scss";
import {
  buildStoreUrl,
  storeKey,
} from "../../../../Shared/Utils/storeLink";
import SelectedCompanyStorage from "../../../../Shared/Utils/SELECTED_COMPANY_STORAGE_KEY";

//import SelectedCompanyStorage from "../../../Shared/Utils/SELECTED_COMPANY_STORAGE_KEY";

// =====================================================================
//  Quick-action components opened in the pop-up.
//  >>> ADJUST THESE FOUR PATHS/NAMES to match your project <<<
//  (same relative depth as this file, like the imports above).
// =====================================================================
import ProductMaintenanceForm from "../../products/components/ProductMaintenanceForm";
import CustomerMaintenance from "../../customers/components/CustomerCreateForm";
import BookingAvailabilityMaintenance from "../../bookingMaintenance/components/BookingAvailabilityMaintenance";
import Reports from "../../reports/components/Reports";
import PageConfiguration from "../../pageConfiguration/components/PageConfiguration";
import SelectPageConfigurationService from "../../pageConfiguration/services/SelectPageConfigurationService";
import CompanySmtpService from "../../pageConfiguration/services/CompanySmtpService";
import PlanBadge from "../../../../Shared/Components/Plans/PlanBadge";

const selectPageConfigurationService = new SelectPageConfigurationService();
const companySmtpService = new CompanySmtpService();

export default function ServiceHubStart({ t }) {
  const [selectedCompany, setSelectedCompany] =
    useState(() => {
      return SelectedCompanyStorage.getCompany();
    });

  const tr = useCallback(
    (key, fallback) => {
      try {
        if (typeof t !== "function") {
          return fallback;
        }

        const translatedValue = t(key);

        if (
          !translatedValue ||
          translatedValue === key
        ) {
          return fallback;
        }

        return translatedValue;
      } catch (error) {
        console.error(
          `Translation error for key "${key}":`,
          error
        );

        return fallback;
      }
    },
    [t]
  );

  const reloadSelectedCompany =
    useCallback(() => {
      const company =
        SelectedCompanyStorage.getCompany();

      setSelectedCompany(company);
    }, []);

  useEffect(() => {
    reloadSelectedCompany();

    const handleCompanyChanged = () => {
      reloadSelectedCompany();
    };

    window.addEventListener(
      "selectedCompanyChanged",
      handleCompanyChanged
    );

    window.addEventListener(
      "storage",
      handleCompanyChanged
    );

    return () => {
      window.removeEventListener(
        "selectedCompanyChanged",
        handleCompanyChanged
      );

      window.removeEventListener(
        "storage",
        handleCompanyChanged
      );
    };
  }, [reloadSelectedCompany]);

  const companyId =
    selectedCompany?.companyId || "";

  const companyName =
    selectedCompany?.companyName || "";

  const hasSelectedCompany =
    Boolean(companyId && companyName);

  const [showShowcaseModal, setShowShowcaseModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const linkInputRef = useRef(null);

  // Readable store address (slug) of the company; "" = use the internal id.
  // Loaded with the page configuration (see the notifications effect below).
  const [storeSlug, setStoreSlug] = useState("");

  // Store key = slug when the company has one, otherwise its internal id.
  //  - showcaseUrl: direct store address (Open store, QR code, text box,
  //    Copy and WhatsApp share).
  const linkKey = companyId ? storeKey({ slug: storeSlug, companyId }) : "";
  const showcaseUrl = buildStoreUrl(linkKey);
  // 2026-11-01: the text box, Copy and WhatsApp share use the SAME store
  // address as "Open store" and the QR code (REACT_APP_SHOWCASE_LINK), not the
  // shao preview link (/s/...).
  const shareUrl = showcaseUrl;

  // QR code of the store address (PNG data URL), made when it is opened.
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrError, setQrError] = useState(false);

  const openShowcaseModal = () => {
    setCopied(false);
    setShowQr(false);
    setShowShowcaseModal(true);
  };

  const closeShowcaseModal = () => {
    setShowShowcaseModal(false);
    setShowQr(false);
  };

  useEffect(() => {
    if (!showQr || !showcaseUrl) return undefined;
    let active = true;
    setQrError(false);
    QRCode.toDataURL(showcaseUrl, {
      width: 640,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch((error) => {
        console.error("[ServiceHubStart] QR generation failed:", error);
        if (active) setQrError(true);
      });
    return () => {
      active = false;
    };
  }, [showQr, showcaseUrl]);

  // Opens WhatsApp (app or web) with a ready message and the share link.
  const shareOnWhatsapp = () => {
    if (!shareUrl) return;
    // Values go through t() so i18next fills {{name}} and {{link}}.
    const key = "serviceHubStart.share.whatsappText";
    const translated =
      typeof t === "function" ? t(key, { name: companyName, link: shareUrl }) : "";
    const message =
      translated && translated !== key
        ? translated
        : `Visit our online store ${companyName}: ${shareUrl}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  // Copy the showcase link. The modern Clipboard API only works on HTTPS (or
  // localhost); this app is served over plain HTTP on the LAN, so we fall back
  // to selecting the input and using the legacy execCommand("copy").
  const markCopied = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShowcaseLink = async () => {
    const text = shareUrl;
    if (!text) return;

    // First try the modern API (works on HTTPS or localhost only).
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        markCopied();
        return;
      } catch {
        // fall through to the legacy path
      }
    }

    // Legacy fallback that also works over plain http.
    try {
      const input = linkInputRef.current;
      if (input) {
        input.focus();
        input.select();
        input.setSelectionRange(0, text.length);
        const ok = document.execCommand("copy");
        input.blur();
        setCopied(Boolean(ok));
        if (ok) setTimeout(() => setCopied(false), 2000);
        return;
      }

      // No input available: use a temporary off-screen textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const okTmp = document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(Boolean(okTmp));
      if (okTmp) setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  // Which quick-action component is open in the modal (null = none).
  const [activeAction, setActiveAction] = useState(null);
  const openQuickAction = (action) => setActiveAction(action);
  const closeQuickAction = () => setActiveAction(null);

  // Quick-action shortcuts. Each one opens its real component in a pop-up.
  const quickActions = [
    {
      id: "create-product",
      icon: <FaBoxOpen />,
      title: tr("serviceHubStart.quickActions.product", "Create your product"),
      description: tr(
        "serviceHubStart.quickActions.productDesc",
        "Add a product or service to your catalog."
      ),
      component: ProductMaintenanceForm,
      modalTitle: tr("serviceHubStart.quickActions.productModal", "Products"),
    },
    {
      id: "create-customer",
      icon: <FaUserPlus />,
      title: tr("serviceHubStart.quickActions.customer", "Create your customer"),
      description: tr(
        "serviceHubStart.quickActions.customerDesc",
        "Register a new customer."
      ),
      component: CustomerMaintenance,
      modalTitle: tr("serviceHubStart.quickActions.customerModal", "Customers"),
    },
    {
      id: "create-appointment",
      icon: <FaCalendarPlus />,
      title: tr("serviceHubStart.quickActions.appointment", "Create your appointment"),
      description: tr(
        "serviceHubStart.quickActions.appointmentDesc",
        "Set up booking availability and slots."
      ),
      component: BookingAvailabilityMaintenance,
      modalTitle: tr("serviceHubStart.quickActions.appointmentModal", "Booking maintenance"),
    },
    {
      id: "open-reports",
      icon: <FaChartLine />,
      title: tr("serviceHubStart.quickActions.reports", "Reports"),
      description: tr(
        "serviceHubStart.quickActions.reportsDesc",
        "Open the reports dashboard."
      ),
      component: Reports,
      modalTitle: tr("serviceHubStart.quickActions.reportsModal", "Reports"),
    },
  ];

  const ActiveActionComponent = activeAction ? activeAction.component : null;

  // Are customer notifications ready? (company notification email + own SMTP)
  // Checked when the company changes and every time a pop-up closes, so the
  // warning disappears right after the user configures it.
  const [notificationSetup, setNotificationSetup] = useState(null);

  useEffect(() => {
    if (!companyId || activeAction) return undefined;
    const controller = new AbortController();

    Promise.allSettled([
      selectPageConfigurationService.selectPageConfiguration({ companyId, signal: controller.signal }),
      companySmtpService.selectSmtp({ companyId, signal: controller.signal }),
    ]).then(([pageResult, smtpResult]) => {
      if (controller.signal.aborted) return;
      // Store address for the share window (empty = internal id).
      setStoreSlug(
        pageResult.status === "fulfilled" ? String(pageResult.value?.slug || "") : "",
      );
      // If a request failed we do not know; do not show a wrong warning.
      if (pageResult.status !== "fulfilled" || smtpResult.status !== "fulfilled") {
        setNotificationSetup(null);
        return;
      }
      const smtp = smtpResult.value;
      setNotificationSetup({
        hasEmail: Boolean(String(pageResult.value?.notificationEmail || "").trim()),
        hasSmtp: Boolean(smtp?.configured && smtp?.enabled),
      });
    });

    return () => controller.abort();
  }, [companyId, activeAction]);

  const showNotificationWarning =
    hasSelectedCompany &&
    notificationSetup &&
    (!notificationSetup.hasEmail || !notificationSetup.hasSmtp);

  const openPageConfiguration = () => {
    openQuickAction({
      id: "page-configuration",
      component: PageConfiguration,
      modalTitle: tr("pageConfiguration.title", "Company page configuration"),
    });
  };

  return (
    <section className="service-hub-start">
      <div className="service-hub-start__container">
        {!hasSelectedCompany && (
          <div className="service-hub-start__warning">
            <div className="service-hub-start__warning-icon">
              <FaExclamationTriangle />
            </div>

            <div className="service-hub-start__warning-content">
              <strong>
                {tr(
                  "serviceHubStart.companyRequiredTitle",
                  "Company selection required"
                )}
              </strong>

              <span>
                {tr(
                  "serviceHubStart.companyRequiredMessage",
                  "You must select a company and reload the page before using Service Hub."
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={handleReloadPage}
            >
              <FaSyncAlt />

              {tr(
                "serviceHubStart.reloadPage",
                "Reload page"
              )}
            </button>
          </div>
        )}

        {showNotificationWarning && (
          <div className="service-hub-start__notify-warning" role="status">
            <div className="service-hub-start__notify-warning-icon">
              <FaEnvelope />
            </div>
            <div className="service-hub-start__notify-warning-content">
              <strong>
                {tr("serviceHubStart.notifications.title", "Customer notifications are not ready")}
              </strong>
              {!notificationSetup.hasEmail && (
                <span>
                  {tr(
                    "serviceHubStart.notifications.noEmail",
                    "Add a notification email to receive new orders and booking requests."
                  )}
                </span>
              )}
              {!notificationSetup.hasSmtp && (
                <span>
                  {tr(
                    "serviceHubStart.notifications.noSmtp",
                    "Configure your own SMTP so your customers receive emails about their orders and bookings."
                  )}
                </span>
              )}
            </div>
            <button type="button" onClick={openPageConfiguration}>
              <FaPalette />
              {tr("serviceHubStart.notifications.action", "Configure now")}
            </button>
          </div>
        )}

        <div className="service-hub-start__hero">
          <div className="service-hub-start__hero-content">
            <span className="service-hub-start__eyebrow">
              {tr(
                "serviceHubStart.eyebrow",
                "Service management"
              )}
            </span>

            <h1>
              {tr(
                "serviceHubStart.title",
                "Welcome to Service Hub"
              )}
            </h1>

            <p>
              {tr(
                "serviceHubStart.description",
                "Manage your services, customers, tasks, and business processes from one place."
              )}
            </p>

            {hasSelectedCompany && (
              <div className="service-hub-start__company">
                <span className="service-hub-start__company-icon">
                  <FaBuilding />
                </span>

                <div>
                  <small>
                    {tr(
                      "serviceHubStart.currentCompany",
                      "Current company"
                    )}
                  </small>

                  <strong>
                    {companyName}
                  </strong>
                </div>
              </div>
            )}

            {hasSelectedCompany && (
              <div className="service-hub-start__hero-actions">
                <button
                  type="button"
                  className="service-hub-start__configuration-button"
                  onClick={openPageConfiguration}
                >
                  <FaPalette />
                  {tr("serviceHubStart.configurePage", "Configure company page")}
                </button>
                <button
                  type="button"
                  className="service-hub-start__showcase-button"
                  onClick={openShowcaseModal}
                >
                  <FaShareAlt />
                  {tr("serviceHubStart.showcaseLink", "Showcase link")}
                </button>
                {/* Company plan: what it includes, prices and "Request a plan". */}
                <PlanBadge companyId={companyId} companyName={companyName} />
              </div>
            )}
          </div>

          <div className="service-hub-start__illustration">
            <div className="service-hub-start__illustration-circle">
              <FaTools />
            </div>

            <div className="service-hub-start__illustration-item service-hub-start__illustration-item--one">
              <FaClipboardList />
            </div>

            <div className="service-hub-start__illustration-item service-hub-start__illustration-item--two">
              <FaUsersCog />
            </div>

            <div className="service-hub-start__illustration-item service-hub-start__illustration-item--three">
              <FaChartLine />
            </div>

            <div className="service-hub-start__illustration-item service-hub-start__illustration-item--four">
              <FaHeadset />
            </div>
          </div>
        </div>

        {/* Quick actions — placeholders for the future step-by-step assistants. */}
        <div className="service-hub-start__section">
          <div className="service-hub-start__section-header">
            <div>
              <span className="service-hub-start__section-icon">
                <FaBolt />
              </span>

              <div>
                <h2>
                  {tr(
                    "serviceHubStart.quickActionsTitle",
                    "Quick actions"
                  )}
                </h2>

                <p>
                  {tr(
                    "serviceHubStart.quickActionsDescription",
                    "Open the tools you use most, right from here."
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="service-hub-start__favorites">
            {quickActions.map((action) => (
              <button
                type="button"
                className="service-hub-start__favorite-card"
                key={action.id}
                onClick={() => openQuickAction(action)}
                disabled={!hasSelectedCompany}
              >
                <span className="service-hub-start__favorite-icon">
                  {action.icon}
                </span>

                <div>
                  <strong>{action.title}</strong>
                  <span>{action.description}</span>
                </div>

                <FaArrowRight className="service-hub-start__favorite-arrow" />
              </button>
            ))}
          </div>
        </div>

        <div className="service-hub-start__footer-message">
          <FaTools />

          <span>
            {tr(
              "serviceHubStart.footerMessage",
              "Service Hub is ready to help you organize and manage your business operations."
            )}
          </span>
        </div>
      </div>

      {activeAction && (
        <div
          role="dialog"
          aria-modal="true"
          // 2026-10-29: a click outside no longer closes the window (the
          // form being filled was lost); use the X button to close it.
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(19, 28, 42, 0.5)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "24px 16px",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              position: "relative",
              width: "min(1100px, 100%)",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 30px 80px rgba(19, 28, 42, 0.28)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 48px)",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 20px",
                borderBottom: "1px solid #e2e7f0",
                flex: "0 0 auto",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1f2733" }}>
                {activeAction.modalTitle}
              </h3>
              <button
                type="button"
                onClick={closeQuickAction}
                aria-label={tr("serviceHubStart.close", "Close")}
                style={{
                  border: "1px solid #e2e7f0",
                  background: "#fff",
                  borderRadius: 9,
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  color: "#6d7685",
                }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ padding: 0, overflowY: "auto", flex: "1 1 auto" }}>
              {ActiveActionComponent ? (
                <ActiveActionComponent
                  t={t}
                  companyId={companyId}
                  companyName={companyName}
                  onClose={closeQuickAction}
                  onCancel={closeQuickAction}
                  onSaved={closeQuickAction}
                  onSuccess={closeQuickAction}
                />
              ) : (
                <p style={{ padding: 20, color: "#6d7685", margin: 0 }}>
                  {tr(
                    "serviceHubStart.quickActions.unavailable",
                    "This component is not available. Check its import path in ServiceHubStart.jsx."
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {showShowcaseModal && (
        <div
          className="showcase-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeShowcaseModal}
        >
          <div
            className="showcase-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="showcase-modal__header">
              <h3>
                <FaShareAlt />{" "}
                {tr("serviceHubStart.showcaseModalTitle", "Showcase link")}
              </h3>
              <button
                type="button"
                className="showcase-modal__close"
                onClick={closeShowcaseModal}
                aria-label={tr("serviceHubStart.close", "Close")}
              >
                <FaTimes />
              </button>
            </div>

            <div className="showcase-modal__body">
              <p className="showcase-modal__company">
                {tr("serviceHubStart.showcaseFor", "Public showcase for")}{" "}
                <strong>{companyName}</strong>
              </p>

              <div className="showcase-modal__link-row">
                <input
                  ref={linkInputRef}
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.target.select()}
                  aria-label={tr("serviceHubStart.share.linkLabel", "Store link")}
                />
                <button
                  type="button"
                  className="showcase-modal__copy"
                  onClick={copyShowcaseLink}
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                  {copied
                    ? tr("serviceHubStart.copied", "Copied")
                    : tr("serviceHubStart.copy", "Copy")}
                </button>
              </div>

              <div className="showcase-modal__actions">
                <button
                  type="button"
                  className="showcase-modal__action showcase-modal__action--whatsapp"
                  onClick={shareOnWhatsapp}
                >
                  <FaWhatsapp /> {tr("serviceHubStart.share.whatsapp", "Share on WhatsApp")}
                </button>
                <button
                  type="button"
                  className={`showcase-modal__action${showQr ? " is-active" : ""}`}
                  onClick={() => setShowQr((current) => !current)}
                  aria-expanded={showQr}
                >
                  <FaQrcode /> {tr("serviceHubStart.share.qr", "QR code")}
                </button>
                <a
                  className="showcase-modal__action"
                  href={showcaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaExternalLinkAlt /> {tr("serviceHubStart.openShowcase", "Open store")}
                </a>
              </div>

              {showQr && (
                <div className="showcase-modal__qr">
                  {qrError ? (
                    <span className="showcase-modal__qr-error">
                      {tr("serviceHubStart.share.qrError", "The QR code could not be created.")}
                    </span>
                  ) : qrDataUrl ? (
                    <>
                      <img
                        src={qrDataUrl}
                        alt={tr("serviceHubStart.share.qrAlt", "QR code of your store")}
                      />
                      <small>{showcaseUrl}</small>
                      <a
                        className="showcase-modal__qr-download"
                        href={qrDataUrl}
                        download={`${linkKey}-qr.png`}
                      >
                        <FaDownload /> {tr("serviceHubStart.share.qrDownload", "Download PNG")}
                      </a>
                      <small className="showcase-modal__help">
                        {tr(
                          "serviceHubStart.share.qrHelp",
                          "Print it on flyers, menus or your counter. Customers scan it with the phone camera.",
                        )}
                      </small>
                    </>
                  ) : (
                    <span>{tr("serviceHubStart.share.qrLoading", "Creating QR code…")}</span>
                  )}
                </div>
              )}

              {!storeSlug && (
                <div className="showcase-modal__tip">
                  <FaLink />
                  <span>
                    {tr(
                      "serviceHubStart.share.noSlug",
                      "Tip: give your store a short address (for example /my-store) so the link is easier to read and remember.",
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      closeShowcaseModal();
                      openPageConfiguration();
                    }}
                  >
                    {tr("serviceHubStart.share.setSlug", "Set address")}
                  </button>
                </div>
              )}

              <small className="showcase-modal__help">
                {tr(
                  "serviceHubStart.showcaseHelp",
                  "Share this link with your customers. In WhatsApp and Facebook it shows your store name and image.",
                )}
              </small>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
