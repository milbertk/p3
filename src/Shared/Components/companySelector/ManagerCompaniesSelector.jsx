import React, { useMemo, useState } from "react";
import {
  FaBuilding,
  FaCheck,
  FaSearch,
  FaUsers,
} from "react-icons/fa";
import { Badge, Button, Form, InputGroup } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import "./ManagerCompaniesSelector.scss";

const mockCompanies = [
  {
    id: "company-001",
    name: "Kire Crafts Costa Rica",
    legalName: "Kire Crafts Costa Rica S.A.",
    identification: "3-101-987654",
    role: "Manager",
    members: 8,
    status: "active",
    platforms: ["ServiceHub", "Orders"],
  },
  {
    id: "company-002",
    name: "Servicios del Pacífico",
    legalName: "Servicios del Pacífico SRL",
    identification: "3-102-456789",
    role: "Manager",
    members: 14,
    status: "active",
    platforms: ["ServiceHub"],
  },
  {
    id: "company-003",
    name: "Cancha Central",
    legalName: "Complejo Deportivo Cancha Central S.A.",
    identification: "3-101-112233",
    role: "Manager",
    members: 5,
    status: "pending",
    platforms: ["Bookings"],
  },
  {
    id: "company-004",
    name: "Comercial Retana",
    legalName: "Comercial Retana y Asociados S.A.",
    identification: "3-101-445566",
    role: "Manager",
    members: 11,
    status: "inactive",
    platforms: [],
  },
];

function getStatusVariant(status) {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "inactive":
      return "secondary";
    default:
      return "light";
  }
}

export default function ManagerCompaniesSelector({
  companies = mockCompanies,
  onCompanySelect,
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return companies;
    }

    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(normalizedSearch) ||
        company.legalName.toLowerCase().includes(normalizedSearch) ||
        company.identification.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [companies, search]);

  const handleSelectCompany = (company) => {
    setSelectedCompanyId(company.id);

    if (typeof onCompanySelect === "function") {
      onCompanySelect(company);
    }
  };

  return (
    <section className="manager-companies">
      <div className="manager-companies__header">
        <div>
          <span className="manager-companies__eyebrow">
            {t("companySelector.eyebrow")}
          </span>

          <h2 className="manager-companies__title">
            {t("companySelector.title")}
          </h2>

          <p className="manager-companies__description">
            {t("companySelector.description")}
          </p>
        </div>

        <Badge
          bg="light"
          text="dark"
          className="manager-companies__count"
        >
          {t("companySelector.companyCount", { count: companies.length })}
        </Badge>
      </div>

      <div className="manager-companies__toolbar">
        <InputGroup className="manager-companies__search">
          <InputGroup.Text>
            <FaSearch />
          </InputGroup.Text>

          <Form.Control
            type="search"
            placeholder={t("companySelector.searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("companySelector.searchLabel")}
          />
        </InputGroup>
      </div>

      {filteredCompanies.length > 0 ? (
        <div className="manager-companies__grid">
          {filteredCompanies.map((company) => {
            const isSelected = selectedCompanyId === company.id;

            return (
              <article
                key={company.id}
                className={[
                  "company-selection-card",
                  isSelected
                    ? "company-selection-card--selected"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="company-selection-card__top">
                  <div className="company-selection-card__icon">
                    <FaBuilding />
                  </div>

                  <div className="company-selection-card__badges">
                    <Badge bg="primary" pill>
                      {company.role}
                    </Badge>

                    <Badge
                      bg={getStatusVariant(company.status)}
                      pill
                    >
                      {t(`companySelector.status.${company.status}`, { defaultValue: company.status })}
                    </Badge>
                  </div>
                </div>

                <div className="company-selection-card__content">
                  <h3>{company.name}</h3>

                  <p className="company-selection-card__legal-name">
                    {company.legalName}
                  </p>

                  <span className="company-selection-card__identification">
                    {t("companySelector.identification")}: {company.identification}
                  </span>
                </div>

                <div className="company-selection-card__metadata">
                  <div>
                    <FaUsers />
                    <span>{t("companySelector.memberCount", { count: company.members })}</span>
                  </div>
                </div>

                <div className="company-selection-card__platforms">
                  {company.platforms.length > 0 ? (
                    company.platforms.map((platform) => (
                      <span
                        key={platform}
                        className="company-selection-card__platform"
                      >
                        {platform}
                      </span>
                    ))
                  ) : (
                    <span className="company-selection-card__no-platforms">
                      {t("companySelector.noPlatforms")}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant={isSelected ? "success" : "outline-primary"}
                  className="company-selection-card__button"
                  onClick={() => handleSelectCompany(company)}
                >
                  {isSelected ? (
                    <>
                      <FaCheck />
                      {t("companySelector.selected")}
                    </>
                  ) : (
                    t("companySelector.select")
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="manager-companies__empty">
          <FaBuilding />

          <h3>{t("companySelector.emptyTitle")}</h3>

          <p>
            {t("companySelector.emptyDescription")}
          </p>
        </div>
      )}
    </section>
  );
}
