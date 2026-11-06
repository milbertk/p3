import React, { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaSearch,
  FaMapMarkerAlt,
  FaIdCard,
  FaCheckCircle,
} from "react-icons/fa";

import "./CompanySearch.scss";
import CompanyGetService from "../Services/getCompanies";

export default function CompanySearch({
  t,
  onSelectCompany = () => {},
  includeInactive = true,
}) {
  const companyService = useMemo(() => new CompanyGetService(), []);

  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const normalizeCompany = (company) => {
    return {
      company_id: getValue(company, [
        "company_id",
        "companyId",
        "CompanyID",
        "id",
      ]),

      company_name: getValue(company, [
        "company_name",
        "companyName",
        "CompanyName",
      ]),

      legal_name: getValue(company, [
        "legal_name",
        "legalName",
        "LegalName",
      ]),

      identification_number: getValue(company, [
        "identification_number",
        "identificationNumber",
        "IdentificationNumber",
      ]),

      city: getValue(company, ["city", "City"]),

      status: getValue(company, ["status", "Status"], "ACTIVE"),

      active: getValue(company, ["active", "Active"], true),

      original: company,
    };
  };

  const normalizedCompanies = useMemo(() => {
    return companies.map(normalizeCompany);
  }, [companies]);

  const loadCompanies = async (searchValue = "") => {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await companyService.getCompanies({
        search: searchValue,
        includeInactive,
      });

      setCompanies(Array.isArray(result?.companies) ? result.companies : []);
    } catch (error) {
      console.error("Error loading companies:", error);

      setErrorMessage(
        error.message ||
          tr("companySearch.loadError", "Error loading companies.")
      );

      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadCompanies(search.trim());
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  const handleSelect = (company) => {
    onSelectCompany(company.original || company);
  };

  return (
    <section className="company-search-page">
      <div className="company-search-card">
        <div className="company-search-card__header">
          <div>
            <span className="company-search-card__icon">
              <FaBuilding />
            </span>

            <h2>{tr("companySearch.title", "My companies")}</h2>

            <p>
              {tr(
                "companySearch.subtitle",
                "Search and select one of your registered companies."
              )}
            </p>
          </div>

          <span className="company-search-card__badge">
            {normalizedCompanies.length}{" "}
            {tr("companySearch.results", "results")}
          </span>
        </div>

        <div className="company-search-toolbar">
          <div className="company-search-input">
            <FaSearch />

            <input
              type="text"
              placeholder={tr(
                "companySearch.searchPlaceholder",
                "Search by company name, legal name, ID or city..."
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSearch}
            disabled={loading}
          >
            <FaSearch />
            {loading
              ? tr("companySearch.searching", "Searching...")
              : tr("companySearch.search", "Search")}
          </button>
        </div>

        {errorMessage && <div className="empty-state">{errorMessage}</div>}

        <div className="company-search-table-wrapper">
          <table className="company-search-table">
            <thead>
              <tr>
                <th>{tr("companySearch.name", "Name")}</th>
                <th>{tr("companySearch.legalName", "Legal name")}</th>
                <th>{tr("companySearch.identification", "Identification")}</th>
                <th>{tr("companySearch.city", "City")}</th>
                <th>{tr("companySearch.status", "Status")}</th>
                <th>{tr("companySearch.actions", "Actions")}</th>
              </tr>
            </thead>

            <tbody>
              {normalizedCompanies.map((company) => {
                const isActive =
                  String(company.status).toUpperCase() === "ACTIVE" ||
                  company.active === true;

                return (
                  <tr key={company.company_id}>
                    <td>
                      <div className="company-name-cell">
                        <span className="company-avatar">
                          <FaBuilding />
                        </span>

                        <strong>{company.company_name}</strong>
                      </div>
                    </td>

                    <td>{company.legal_name}</td>

                    <td>
                      <span className="inline-icon">
                        <FaIdCard />
                        {company.identification_number}
                      </span>
                    </td>

                    <td>
                      <span className="inline-icon">
                        <FaMapMarkerAlt />
                        {company.city}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`status-badge ${
                          isActive
                            ? "status-badge--active"
                            : "status-badge--inactive"
                        }`}
                      >
                        {isActive
                          ? tr("companySearch.active", "Active")
                          : tr("companySearch.inactive", "Inactive")}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn-secondary btn-small"
                        onClick={() => handleSelect(company)}
                      >
                        <FaCheckCircle />
                        {tr("companySearch.select", "Select")}
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!loading && normalizedCompanies.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {tr(
                      "companySearch.empty",
                      "No companies found with the current search."
                    )}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan="6" className="empty-state">
                    {tr("companySearch.loading", "Loading companies...")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}