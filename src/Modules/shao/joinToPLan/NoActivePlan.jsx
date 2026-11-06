import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  FaBuilding,
  FaPaperPlane,
  FaGift,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaSyncAlt,
} from "react-icons/fa";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

import "./NoActivePlan.scss";

import SelectedCompanyStorage from "../../../Shared/Utils/SELECTED_COMPANY_STORAGE_KEY";

export default function NoActivePlan({
  t,
  onSubmit = () => {},
}) {
  const [selectedCompany, setSelectedCompany] =
    useState(() => {
      return SelectedCompanyStorage.getCompany();
    });

  const [contactData, setContactData] =
    useState({
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      message: "",
    });

  const [sending, setSending] =
    useState(false);

  const [successMessage, setSuccessMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

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
      setSuccessMessage("");
      setErrorMessage("");
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

  const displayedCompanyName =
    companyName ||
    tr(
      "noPlan.companyNotSelected",
      "No company selected"
    );

  const clearMessages = useCallback(() => {
    setErrorMessage("");
    setSuccessMessage("");
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setContactData((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearMessages();
  };

  const handlePhoneChange = (value) => {
    setContactData((previous) => ({
      ...previous,
      contactPhone: value,
    }));

    clearMessages();
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email.trim()
    );
  };

  const validateForm = () => {
    if (!hasSelectedCompany) {
      return tr(
        "noPlan.companyReloadRequired",
        "You must select a company and reload the page before requesting a plan."
      );
    }

    if (!contactData.contactName.trim()) {
      return tr(
        "noPlan.contactNameRequired",
        "The contact person name is required."
      );
    }

    if (!contactData.contactEmail.trim()) {
      return tr(
        "noPlan.contactEmailRequired",
        "The contact email is required."
      );
    }

    if (
      !isValidEmail(
        contactData.contactEmail
      )
    ) {
      return tr(
        "noPlan.contactEmailInvalid",
        "Enter a valid contact email."
      );
    }

    if (!contactData.contactPhone.trim()) {
      return tr(
        "noPlan.contactPhoneRequired",
        "The contact phone number is required."
      );
    }

    const phoneDigits =
      contactData.contactPhone.replace(
        /\D/g,
        ""
      );

    if (phoneDigits.length < 8) {
      return tr(
        "noPlan.contactPhoneInvalid",
        "Enter a valid phone number, including the country code."
      );
    }

    if (!contactData.message.trim()) {
      return tr(
        "noPlan.messageRequired",
        "Please write a short message."
      );
    }

    return "";
  };

  const handleReloadPage = () => {
    window.location.reload();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      setSuccessMessage("");
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const normalizedPhone =
        contactData.contactPhone.startsWith("+")
          ? contactData.contactPhone
          : `+${contactData.contactPhone}`;

      const payload = {
        companyId,
        companyName,

        contact: {
          name:
            contactData.contactName.trim(),

          email:
            contactData.contactEmail
              .trim()
              .toLowerCase(),

          phone: normalizedPhone,
        },

        message:
          contactData.message.trim(),

        requestType:
          "PLAN_INFORMATION",

        createdAt:
          new Date().toISOString(),
      };

      /*
       * Mock request.
       *
       * Replace later with:
       *
       * await planRequestService.sendRequest(payload);
       */
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1200);
      });

      await onSubmit(payload);

      console.log(
        "Mock plan request sent:",
        payload
      );

      setContactData({
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        message: "",
      });

      setSuccessMessage(
        tr(
          "noPlan.success",
          "Your request was sent successfully. Our sales team will contact you soon."
        )
      );
    } catch (error) {
      console.error(
        "Error sending plan request:",
        error
      );

      setErrorMessage(
        error?.message ||
          tr(
            "noPlan.sendError",
            "We could not send your request. Please try again."
          )
      );
    } finally {
      setSending(false);
    }
  };

  const formDisabled =
    sending || !hasSelectedCompany;

  const submitDisabled =
    formDisabled ||
    !contactData.contactName.trim() ||
    !contactData.contactEmail.trim() ||
    !contactData.contactPhone.trim() ||
    !contactData.message.trim();

  return (
    <section className="no-plan-page">
      <div className="no-plan-card">
        <div className="no-plan-card__hero">
          <div className="no-plan-card__icon">
            <FaExclamationTriangle />
          </div>

          <div>
            <span className="no-plan-card__eyebrow">
              {tr(
                "noPlan.accessStatus",
                "Plan access"
              )}
            </span>

            <h1>
              {tr(
                "noPlan.title",
                "Your company does not have an active plan"
              )}
            </h1>

            <p>
              {tr(
                "noPlan.description",
                "Request assistance from our sales team to receive personalized advice and choose the best plan for your business."
              )}
            </p>
          </div>
        </div>

        <div className="no-plan-trial">
          <div className="no-plan-trial__icon">
            <FaGift />
          </div>

          <div>
            <strong>
              {tr(
                "noPlan.freeTrialTitle",
                "Your first month is free"
              )}
            </strong>

            <span>
              {tr(
                "noPlan.freeTrialDescription",
                "Test the platform for one month at no cost and receive guidance during the implementation process."
              )}
            </span>
          </div>
        </div>

        {!hasSelectedCompany && (
          <div className="no-plan-company-warning">
            <div className="no-plan-company-warning__icon">
              <FaExclamationTriangle />
            </div>

            <div className="no-plan-company-warning__content">
              <strong>
                {tr(
                  "noPlan.companySelectionRequiredTitle",
                  "Company selection required"
                )}
              </strong>

              <span>
                {tr(
                  "noPlan.companyReloadRequired",
                  "You must select a company and reload the page before requesting a plan."
                )}
              </span>
            </div>

            <button
              type="button"
              className="no-plan-company-warning__button"
              onClick={handleReloadPage}
            >
              <FaSyncAlt />

              {tr(
                "noPlan.reloadPage",
                "Reload page"
              )}
            </button>
          </div>
        )}

        <div className="no-plan-information no-plan-information--single">
          <div className="no-plan-information__item">
            <span className="no-plan-information__icon">
              <FaBuilding />
            </span>

            <div>
              <small>
                {tr(
                  "noPlan.currentCompany",
                  "Current company"
                )}
              </small>

              <strong>
                {displayedCompanyName}
              </strong>

              {companyId && (
                <span className="no-plan-information__identifier">
                  {tr(
                    "noPlan.companyId",
                    "Company ID"
                  )}
                  : {companyId}
                </span>
              )}
            </div>
          </div>
        </div>

        <form
          className="no-plan-form"
          onSubmit={handleSubmit}
        >
          <div className="no-plan-form__header">
            <h2>
              {tr(
                "noPlan.formTitle",
                "Request plan information"
              )}
            </h2>

            <p>
              {tr(
                "noPlan.formDescription",
                "Provide the contact information of the person who should receive advice about the available plans."
              )}
            </p>
          </div>

          <div className="no-plan-form__grid">
            <label className="no-plan-form__field">
              <span>
                <FaUser />

                {tr(
                  "noPlan.contactName",
                  "Contact person"
                )}
              </span>

              <input
                type="text"
                name="contactName"
                value={
                  contactData.contactName
                }
                onChange={handleInputChange}
                placeholder={tr(
                  "noPlan.contactNamePlaceholder",
                  "Full name of the contact person"
                )}
                autoComplete="name"
                disabled={formDisabled}
              />
            </label>

            <label className="no-plan-form__field">
              <span>
                <FaEnvelope />

                {tr(
                  "noPlan.contactEmail",
                  "Personal contact email"
                )}
              </span>

              <input
                type="email"
                name="contactEmail"
                value={
                  contactData.contactEmail
                }
                onChange={handleInputChange}
                placeholder={tr(
                  "noPlan.contactEmailPlaceholder",
                  "contact@example.com"
                )}
                autoComplete="email"
                disabled={formDisabled}
              />
            </label>
          </div>

          <label className="no-plan-form__field">
            <span>
              <FaPhoneAlt />

              {tr(
                "noPlan.contactPhone",
                "Contact phone"
              )}
            </span>

            <div
              className={`no-plan-phone-input ${
                formDisabled
                  ? "no-plan-phone-input--disabled"
                  : ""
              }`}
            >
              <PhoneInput
                country="cr"
                preferredCountries={[
                  "cr",
                  "us",
                  "mx",
                  "pa",
                  "ni",
                ]}
                enableSearch
                searchPlaceholder={tr(
                  "noPlan.searchCountry",
                  "Search country"
                )}
                value={
                  contactData.contactPhone
                }
                onChange={handlePhoneChange}
                disabled={formDisabled}
                inputProps={{
                  name: "contactPhone",
                  required: true,
                  autoComplete: "tel",
                  "aria-label": tr(
                    "noPlan.contactPhone",
                    "Contact phone"
                  ),
                }}
              />
            </div>

            <small className="no-plan-form__help">
              {tr(
                "noPlan.contactPhoneHelp",
                "Select the country and enter the phone number with its international dialing code."
              )}
            </small>
          </label>

          <label className="no-plan-form__field">
            <span>
              <FaBuilding />

              {tr(
                "noPlan.company",
                "Company"
              )}
            </span>

            <input
              type="text"
              value={displayedCompanyName}
              disabled
              readOnly
            />
          </label>

          <label className="no-plan-form__field">
            <span>
              {tr(
                "noPlan.message",
                "Message"
              )}
            </span>

            <textarea
              name="message"
              rows="5"
              value={contactData.message}
              onChange={handleInputChange}
              placeholder={tr(
                "noPlan.messagePlaceholder",
                "Tell us what your company needs and which processes you want to improve."
              )}
              disabled={formDisabled}
            />
          </label>

          {errorMessage && (
            <div className="no-plan-message no-plan-message--error">
              <FaExclamationTriangle />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="no-plan-message no-plan-message--success">
              <FaCheckCircle />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className="no-plan-form__button"
            disabled={submitDisabled}
          >
            <FaPaperPlane />

            {sending
              ? tr(
                  "noPlan.sending",
                  "Sending..."
                )
              : tr(
                  "noPlan.sendRequest",
                  "Request plan and advisory"
                )}
          </button>
        </form>
      </div>
    </section>
  );
}