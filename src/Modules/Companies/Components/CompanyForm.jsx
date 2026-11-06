import React, { useMemo, useState } from "react";
import { FaBuilding, FaSave, FaTimes, FaSearch } from "react-icons/fa";
import { toast } from "react-toastify";
import Select from "react-select";
import countryList from "react-select-country-list";
import { RegionDropdown } from "react-country-region-selector";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/bootstrap.css";

import CreateCompanyService from "../Services/CreateCompanyService";
import CompanySearch from "./CompanySearch";
import BasicModal from "../../../Shared/Components/BasicModal/BasicModal";

import "./CompanyForm.scss";

const emptyCompany = {
  companyId: "",
  companyName: "",
  legalName: "",
  identificationType: "JURIDICA",
  identificationNumber: "",
  email: "",
  phone: "",
  website: "",
  countryCode: "CR",
  countryName: "Costa Rica",
  stateCode: "",
  stateName: "",
  city: "",
  district: "",
  postalCode: "",
  address1: "",
  address2: "",
  directions: "",
  category: "",
  internalCategory: "",
  employees: 0,
  isVirtual: false,
  plan: "FREE",
  status: "ACTIVE",
  active: true,
};

export default function CompanyForm({
  initialCompany = null,
  onSaved = () => {},
  onCancel = () => {},
  setRefreshChecklogin,
  t,
}) {
  const companyService = useMemo(() => new CreateCompanyService(), []);
  const countryOptions = useMemo(() => countryList().getData(), []);

  const countryByCode = useMemo(() => {
    const map = {};

    countryOptions.forEach((option) => {
      map[option.value] = option.label;
    });

    return map;
  }, [countryOptions]);

  const [company, setCompany] = useState(initialCompany || emptyCompany);
  const [saving, setSaving] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

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

  const toBoolean = (value, fallback = false) => {
    if (value === undefined || value === null) return fallback;

    if (typeof value === "boolean") return value;

    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }

    return Boolean(value);
  };

  const resetForm = () => {
    setCompany({ ...emptyCompany });
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setCompany((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "employees"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const selectedCountryOption =
    countryOptions.find((option) => option.value === company.countryCode) ||
    null;

  const handleCountrySelect = (option) => {
    setCompany((prev) => ({
      ...prev,
      countryName: option?.label || "",
      countryCode: option?.value || "",
      stateName: "",
      stateCode: "",
    }));
  };

  const handleRegionChange = (stateName) => {
    setCompany((prev) => ({
      ...prev,
      stateName,
      stateCode: "",
    }));
  };

  const handlePhoneChange = (value, countryData) => {
    setCompany((prev) => {
      const iso = countryData?.countryCode
        ? countryData.countryCode.toUpperCase()
        : prev.countryCode;

      const countryChanged = iso !== prev.countryCode;

      return {
        ...prev,
        phone: value ? `+${value}` : "",
        countryCode: iso,
        countryName: countryByCode[iso] || prev.countryName,
        stateName: countryChanged ? "" : prev.stateName,
        stateCode: countryChanged ? "" : prev.stateCode,
      };
    });
  };

  const mapSelectedCompanyToForm = (selectedCompany) => {
    const source = selectedCompany?.original || selectedCompany || {};

    return {
      companyId: getValue(source, [
        "companyId",
        "company_id",
        "CompanyID",
        "id",
      ]),

      companyName: getValue(source, [
        "companyName",
        "company_name",
        "CompanyName",
      ]),

      legalName: getValue(source, [
        "legalName",
        "legal_name",
        "LegalName",
      ]),

      identificationType: getValue(
        source,
        [
          "identificationType",
          "identification_type",
          "IdentificationType",
        ],
        "JURIDICA"
      ),

      identificationNumber: getValue(source, [
        "identificationNumber",
        "identification_number",
        "IdentificationNumber",
      ]),

      email: getValue(source, ["email", "Email"]),
      phone: getValue(source, ["phone", "Phone"]),
      website: getValue(source, ["website", "Website"]),

      countryCode: getValue(
        source,
        ["countryCode", "country_code", "CountryCode"],
        "CR"
      ),

      countryName: getValue(
        source,
        ["countryName", "country_name", "CountryName"],
        "Costa Rica"
      ),

      stateCode: getValue(source, [
        "stateCode",
        "state_code",
        "StateCode",
      ]),

      stateName: getValue(source, [
        "stateName",
        "state_name",
        "StateName",
      ]),

      city: getValue(source, ["city", "City"]),
      district: getValue(source, ["district", "District"]),

      postalCode: getValue(source, [
        "postalCode",
        "postal_code",
        "PostalCode",
      ]),

      address1: getValue(source, ["address1", "Address1"]),
      address2: getValue(source, ["address2", "Address2"]),
      directions: getValue(source, ["directions", "Directions"]),

      category: getValue(source, ["category", "Category"]),

      internalCategory: getValue(source, [
        "internalCategory",
        "internal_category",
        "InternalCategory",
      ]),

      employees: Number(
        getValue(source, ["employees", "Employees"], 0)
      ),

      isVirtual: toBoolean(
        getValue(source, ["isVirtual", "is_virtual", "IsVirtual"], false)
      ),

      plan: getValue(source, ["plan", "Plan"], "FREE"),

      status: getValue(source, ["status", "Status"], "ACTIVE"),

      active: toBoolean(
        getValue(source, ["active", "Active"], true),
        true
      ),
    };
  };

  const handleSelectCompany = (selectedCompany) => {
    const mappedCompany = mapSelectedCompanyToForm(selectedCompany);

    setCompany(mappedCompany);
    setShowSearch(false);

    toast.success(
      tr("companyForm.companySelected", "Company selected successfully.")
    );
  };

  const validateCompany = () => {
    if (!company.companyName.trim()) {
      return tr("companyForm.companyNameRequired", "Company name is required.");
    }

    if (!company.identificationType.trim()) {
      return tr(
        "companyForm.identificationTypeRequired",
        "Identification type is required."
      );
    }

    if (!company.identificationNumber.trim()) {
      return tr(
        "companyForm.identificationNumberRequired",
        "Identification number is required."
      );
    }

    if (company.email && !validateEmail(company.email.trim())) {
      return tr("companyForm.invalidEmail", "Invalid email.");
    }

    if (company.website) {
      try {
        new URL(company.website);
      } catch {
        return tr("companyForm.invalidWebsite", "Invalid website.");
      }
    }

    if (Number(company.employees) < 0) {
      return tr("companyForm.invalidEmployees", "Employees cannot be negative.");
    }

    return "";
  };

  const buildPayload = () => ({
    companyId: company.companyId?.trim() || "",
    companyName: company.companyName.trim(),
    legalName: company.legalName.trim(),
    identificationType: company.identificationType.trim(),
    identificationNumber: company.identificationNumber.trim(),
    email: company.email.trim(),
    phone: company.phone.trim(),
    website: company.website.trim(),
    countryCode: company.countryCode.trim(),
    countryName: company.countryName.trim(),
    stateCode: company.stateCode.trim(),
    stateName: company.stateName.trim(),
    city: company.city.trim(),
    district: company.district.trim(),
    postalCode: company.postalCode.trim(),
    address1: company.address1.trim(),
    address2: company.address2.trim(),
    directions: company.directions.trim(),
    category: company.category.trim(),
    internalCategory: company.internalCategory.trim(),
    employees: Number.isFinite(Number(company.employees))
      ? Number(company.employees)
      : 0,
    isVirtual: Boolean(company.isVirtual),
    plan: company.plan || "FREE",
    status: company.status || "ACTIVE",
    active: Boolean(company.active),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationMessage = validateCompany();

    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setSaving(true);

      const result = await companyService.createOrUpdateCompany(buildPayload());

      toast.success(result?.message || tr("companyForm.saved", "Saved."));

      resetForm();

      setRefreshChecklogin?.((prev) => !prev);
      onSaved(result);
    } catch (error) {
      console.error("Company save error:", error);
      toast.error(error.message || tr("companyForm.saveError", "Save error."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="company-form-page">
      <div className="company-card">
        <div className="company-card__header">
          <div>
            <span className="company-card__icon">
              <FaBuilding />
            </span>

            <h2>
              {company.companyId
                ? tr("companyForm.editTitle", "Edit company")
                : tr("companyForm.createTitle", "Create company")}
            </h2>

            <p>{tr("companyForm.subtitle", "Manage company information.")}</p>
          </div>

          <span className="company-card__badge">
            {company.companyId
              ? tr("companyForm.updateMode", "Update mode")
              : tr("companyForm.createMode", "Create mode")}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="company-form">
          <div className="company-form__toolbar">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowSearch(true)}
            >
              <FaSearch /> {tr("companyForm.searchCompany", "Search company")}
            </button>
          </div>

          <h3 className="company-form__section-title">
            {tr("companyForm.generalInfo", "General information")}
          </h3>

          <div className="company-form__grid">
            <label>
              {tr("companyForm.companyName", "Company name")}
              <input
                name="companyName"
                value={company.companyName}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.legalName", "Legal name")}
              <input
                name="legalName"
                value={company.legalName}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.identificationType", "Identification type")}
              <select
                name="identificationType"
                value={company.identificationType}
                onChange={handleChange}
              >
                <option value="JURIDICA">
                  {tr("companyForm.legalEntity", "Legal entity")}
                </option>
                <option value="FISICA">
                  {tr("companyForm.physicalPerson", "Physical person")}
                </option>
                <option value="DIMEX">DIMEX</option>
                <option value="NITE">NITE</option>
              </select>
            </label>

            <label>
              {tr("companyForm.identificationNumber", "Identification number")}
              <input
                name="identificationNumber"
                value={company.identificationNumber}
                onChange={handleChange}
              />
            </label>
          </div>

          <h3 className="company-form__section-title">
            {tr("companyForm.contact", "Contact")}
          </h3>

          <div className="company-form__grid">
            <label>
              {tr("companyForm.email", "Email")}
              <input
                type="email"
                name="email"
                value={company.email}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.phone", "Phone")}
              <PhoneInput
                country={(company.countryCode || "cr").toLowerCase()}
                value={company.phone}
                onChange={handlePhoneChange}
                enableSearch
                disableSearchIcon={false}
                searchPlaceholder={tr(
                  "companyForm.searchCountry",
                  "Search country"
                )}
                searchNotFound={tr("companyForm.noResults", "No results")}
                containerClass="company-phone-container"
                inputClass="company-phone-input"
                buttonClass="company-phone-button"
                dropdownClass="company-phone-dropdown"
                searchClass="company-phone-search"
                specialLabel=""
                placeholder={tr("companyForm.phone", "Phone")}
              />
            </label>

            <label className="company-form__full">
              {tr("companyForm.website", "Website")}
              <input
                type="url"
                name="website"
                value={company.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </label>
          </div>

          <h3 className="company-form__section-title">
            {tr("companyForm.location", "Location")}
          </h3>

          <div className="company-form__grid">
            <label>
              {tr("companyForm.countryName", "Country")}
              <Select
                classNamePrefix="company-select"
                className="company-form__select"
                options={countryOptions}
                value={selectedCountryOption}
                onChange={handleCountrySelect}
                placeholder={tr("companyForm.selectCountry", "Select country")}
                isClearable
                noOptionsMessage={() => tr("companyForm.noResults", "No results")}
                menuPlacement="auto"
              />
            </label>

            <label>
              {tr("companyForm.countryCode", "Country code")}
              <input
                name="countryCode"
                value={company.countryCode}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.stateName", "State")}
              <RegionDropdown
                country={company.countryName}
                value={company.stateName}
                onChange={handleRegionChange}
                className="company-form__control"
              />
            </label>

            <label>
              {tr("companyForm.stateCode", "State code")}
              <input
                name="stateCode"
                value={company.stateCode}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.city", "City")}
              <input name="city" value={company.city} onChange={handleChange} />
            </label>

            <label>
              {tr("companyForm.district", "District")}
              <input
                name="district"
                value={company.district}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.postalCode", "Postal code")}
              <input
                name="postalCode"
                value={company.postalCode}
                onChange={handleChange}
              />
            </label>
          </div>

          <h3 className="company-form__section-title">
            {tr("companyForm.address", "Address")}
          </h3>

          <div className="company-form__grid">
            <label>
              {tr("companyForm.address1", "Address 1")}
              <input
                name="address1"
                value={company.address1}
                onChange={handleChange}
                disabled={company.isVirtual}
              />
            </label>

            <label>
              {tr("companyForm.address2", "Address 2")}
              <input
                name="address2"
                value={company.address2}
                onChange={handleChange}
                disabled={company.isVirtual}
              />
            </label>

            <label className="company-form__full">
              {tr("companyForm.directions", "Directions")}
              <textarea
                name="directions"
                value={company.directions}
                onChange={handleChange}
                disabled={company.isVirtual}
                rows={3}
              />
            </label>
          </div>

          <h3 className="company-form__section-title">
            {tr("companyForm.classification", "Classification")}
          </h3>

          <div className="company-form__grid">
            <label>
              {tr("companyForm.category", "Category")}
              <input
                name="category"
                value={company.category}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.internalCategory", "Internal category")}
              <input
                name="internalCategory"
                value={company.internalCategory}
                onChange={handleChange}
              />
            </label>

            <label>
              {tr("companyForm.employees", "Employees")}
              <input
                type="number"
                min="0"
                name="employees"
                value={company.employees}
                onChange={handleChange}
              />
            </label>

            {/* No "Plan" field (2026-10-22): plans belong to each platform
                (Service Hub: Home -> "Your plan"), not to the company. */}

            <label>
              {tr("companyForm.status", "Status")}
              <select
                name="status"
                value={company.status}
                onChange={handleChange}
              >
                <option value="ACTIVE">
                  {tr("companyForm.statusActive", "Active")}
                </option>
                <option value="INACTIVE">
                  {tr("companyForm.statusInactive", "Inactive")}
                </option>
                <option value="SUSPENDED">
                  {tr("companyForm.statusSuspended", "Suspended")}
                </option>
              </select>
            </label>

            <label className="company-form__check">
              <input
                type="checkbox"
                name="isVirtual"
                checked={company.isVirtual}
                onChange={handleChange}
              />
              {tr("companyForm.isVirtual", "Virtual company")}
            </label>

            <label className="company-form__check">
              <input
                type="checkbox"
                name="active"
                checked={company.active}
                onChange={handleChange}
              />
              {tr("companyForm.active", "Active")}
            </label>
          </div>

          <div className="company-form__actions">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              <FaTimes /> {tr("companyForm.cancel", "Cancel")}
            </button>

            <button type="submit" className="btn-primary" disabled={saving}>
              <FaSave />
              {saving
                ? tr("companyForm.saving", "Saving...")
                : tr("companyForm.save", "Save")}
            </button>
          </div>
        </form>
      </div>

      <BasicModal
        show={showSearch}
        setShow={setShowSearch}
        name={tr("companyForm.searchCompany", "Search company")}
      >
        <CompanySearch
          t={t}
          onSelectCompany={handleSelectCompany}
          includeInactive
        />
      </BasicModal>
    </section>
  );
}