import React, { useEffect, useMemo, useState } from "react";
import {
  FaUser,
  FaEnvelope,
  FaPhoneAlt,
  FaGlobeAmericas,
  FaLanguage,
  FaSave,
} from "react-icons/fa";

import { Form } from "react-bootstrap";
import { CountryDropdown } from "react-country-region-selector";

import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/bootstrap.css";

import { toast } from "react-toastify";

import "./ProfileComponent.scss";
import ProfileService from "../services/ProfileService";



const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
];

export default function ProfileComponent(props) {
  const { t, setRefreshChecklogin } = props;

  const profileService = useMemo(() => new ProfileService, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    language: "",
  });

  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState("");

  const tr = (key, fallback) => {
    try {
      return typeof t === "function" ? t(key) || fallback : fallback;
    } catch {
      return fallback;
    }
  };

  const getValue = (obj, keys, fallback = "") => {
    for (const key of keys) {
      if (obj?.[key] !== undefined && obj?.[key] !== null) {
        return obj[key];
      }
    }

    return fallback;
  };

  const extractUser = (result) => {
    return (
      result?.user ||
      result?.User ||
      result?.profile ||
      result?.Profile ||
      result?.data?.user ||
      result?.data?.User ||
      result?.data?.profile ||
      result?.data?.Profile ||
      result?.data ||
      result ||
      {}
    );
  };

  const normalizeProfile = (rawUser) => {
    const fullName = getValue(rawUser, [
      "name",
      "Name",
      "displayName",
      "DisplayName",
      "fullName",
      "FullName",
    ]);

    const firstNameFromFullName = String(fullName || "").split(" ")[0] || "";
    const lastNameFromFullName = String(fullName || "")
      .split(" ")
      .slice(1)
      .join(" ");

    return {
      firstName:
        getValue(rawUser, [
          "firstName",
          "FirstName",
          "firstname",
          "name",
          "Name",
        ]) || firstNameFromFullName,
      lastName:
        getValue(rawUser, [
          "lastName",
          "LastName",
          "lastname",
          "surname",
          "Surname",
        ]) || lastNameFromFullName,
      email: getValue(rawUser, [
        "email",
        "Email",
        "userEmail",
        "UserEmail",
      ]),
      phone: getValue(rawUser, [
        "phone",
        "Phone",
        "phoneNumber",
        "PhoneNumber",
        "mobile",
        "Mobile",
      ]),
      country: getValue(rawUser, [
        "country",
        "Country",
        "countryName",
        "CountryName",
      ]),
      language: getValue(rawUser, [
        "language",
        "Language",
        "lang",
        "Lang",
        "preferredLanguage",
        "PreferredLanguage",
      ]),
    };
  };

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      setLoadError("");

      const result = await profileService.getProfile();
      const rawUser = extractUser(result);
      const normalized = normalizeProfile(rawUser);

      setFormData((prev) => ({
        ...prev,
        ...normalized,
      }));
    } catch (error) {
      console.error("Error loading profile:", error);

      setLoadError(
        error.message || tr("profile.errors.load", "Error loading profile")
      );
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = tr(
        "profile.errors.firstName",
        "First name is required"
      );
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = tr(
        "profile.errors.lastName",
        "Last name is required"
      );
    }

    if (!formData.email.trim()) {
      newErrors.email = tr("profile.errors.email", "Email is required");
    }

    if (!formData.phone) {
      newErrors.phone = tr("profile.errors.phone", "Phone is required");
    }

    if (!formData.country) {
      newErrors.country = tr("profile.errors.country", "Country is required");
    }

    if (!formData.language) {
      newErrors.language = tr(
        "profile.errors.language",
        "Language is required"
      );
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    const isValid = validate();

    if (!isValid) return;

    try {
      setLoading(true);

      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone,
        country: formData.country,
        language: formData.language,
      };

      const result = await profileService.updateProfile(payload);

      toast.success(
        result?.message || tr("profile.saved", "Profile saved successfully")
      );

      if (typeof setRefreshChecklogin === "function") {
        setRefreshChecklogin((prev) => !prev);
      }
    } catch (error) {
      console.error("Error saving profile:", error);

      toast.error(
        error.message || tr("profile.errors.save", "Error saving profile")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="profile-component">
      <div className="profile-component__header">
        <div>
          <span className="profile-component__eyebrow">
            {tr("profile.section", "Profile")}
          </span>

          <h2>{tr("profile.title", "My profile")}</h2>

          <p>{tr("profile.subtitle", "Manage your personal information")}</p>
        </div>
      </div>

      <div className="profile-component__card">
        {loadingProfile ? (
          <div className="profile-component__loading">
            {tr("common.loading", "Loading...")}
          </div>
        ) : loadError ? (
          <div className="profile-component__error">
            <p>{loadError}</p>

            <button
              type="button"
              className="profile-component__save"
              onClick={loadProfile}
            >
              {tr("profile.retry", "Retry")}
            </button>
          </div>
        ) : (
          <Form>
            <div className="profile-component__grid">
              <div className="profile-field">
                <label>
                  <FaUser />
                  {tr("profile.firstName", "First name")}
                </label>

                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder={tr(
                    "profile.firstNamePlaceholder",
                    "Enter your first name"
                  )}
                />

                {errors.firstName && (
                  <span className="profile-field__error">
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div className="profile-field">
                <label>
                  <FaUser />
                  {tr("profile.lastName", "Last name")}
                </label>

                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  placeholder={tr(
                    "profile.lastNamePlaceholder",
                    "Enter your last name"
                  )}
                />

                {errors.lastName && (
                  <span className="profile-field__error">
                    {errors.lastName}
                  </span>
                )}
              </div>

              <div className="profile-field">
                <label>
                  <FaEnvelope />
                  {tr("profile.email", "Email")}
                </label>

                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder={tr(
                    "profile.emailPlaceholder",
                    "Enter your email"
                  )}
                />

                {errors.email && (
                  <span className="profile-field__error">{errors.email}</span>
                )}
              </div>

              <div className="profile-field">
                <label>
                  <FaPhoneAlt />
                  {tr("profile.phone", "Phone")}
                </label>

                <PhoneInput
                  country={"cr"}
                  value={formData.phone}
                  onChange={(value) => updateField("phone", value)}
                  containerClass="profile-phone-container"
                  inputClass="profile-phone-input"
                />

                {errors.phone && (
                  <span className="profile-field__error">{errors.phone}</span>
                )}
              </div>

              <div className="profile-field">
                <label>
                  <FaGlobeAmericas />
                  {tr("profile.country", "Country")}
                </label>

                <CountryDropdown
                  value={formData.country}
                  onChange={(value) => updateField("country", value)}
                  className="profile-select"
                />

                {errors.country && (
                  <span className="profile-field__error">
                    {errors.country}
                  </span>
                )}
              </div>

              <div className="profile-field">
                <label>
                  <FaLanguage />
                  {tr("profile.language", "Language")}
                </label>

                <select
                  value={formData.language}
                  onChange={(e) => updateField("language", e.target.value)}
                  className="profile-select"
                >
                  <option value="">
                    {tr("profile.languagePlaceholder", "Select language")}
                  </option>

                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label}
                    </option>
                  ))}
                </select>

                {errors.language && (
                  <span className="profile-field__error">
                    {errors.language}
                  </span>
                )}
              </div>
            </div>

            <div className="profile-component__actions">
              <button
                type="button"
                className="profile-component__save"
                onClick={handleSave}
                disabled={loading}
              >
                <FaSave />

                {loading
                  ? tr("profile.saving", "Saving...")
                  : tr("profile.save", "Save")}
              </button>
            </div>
          </Form>
        )}
      </div>
    </section>
  );
}