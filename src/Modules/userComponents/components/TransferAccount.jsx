import React, { useEffect, useMemo, useState } from "react";
import {
  FaExchangeAlt,
  FaSearch,
  FaUser,
  FaBuilding,
  FaExclamationTriangle,
  FaCheck,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./TransferAccount.scss";
import SearchUsersService from "../../Companies/Services/searchUsers";
import CompanyGetService from "../../Companies/Services/getCompanies";
import TransferCompanyOwnerService from "../services/TransferCompanyOwnerService";


export default function TransferCompany(props) {
  const { t, setRefreshChecklogin, currentUserUID } = props;

  const searchUsersService = useMemo(() => new SearchUsersService(), []);
  const companyGetService = useMemo(() => new CompanyGetService(), []);
  const transferCompanyOwnerService = useMemo(
    () => new TransferCompanyOwnerService(),
    []
  );

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [errors, setErrors] = useState({});

  const tr = (key, fallback) => {
    try {
      return typeof t === "function" ? t(key) || fallback : fallback;
    } catch {
      return fallback;
    }
  };

  const normalizeUser = (user) => {
    return {
      id:
        user.id ||
        user.uid ||
        user.UID ||
        user.userId ||
        user.UserID ||
        "",
      name:
        user.name ||
        user.displayName ||
        user.DisplayName ||
        user.fullName ||
        user.FullName ||
        user.email ||
        user.Email ||
        "",
      email: user.email || user.Email || "",
      raw: user,
    };
  };

  const normalizeCompany = (company) => {
    return {
      id:
        company.id ||
        company.companyId ||
        company.CompanyID ||
        company.CompanyId ||
        company.uid ||
        "",
      name:
        company.name ||
        company.companyName ||
        company.CompanyName ||
        company.displayName ||
        "",
      legalName:
        company.legalName ||
        company.LegalName ||
        company.businessName ||
        company.BusinessName ||
        company.name ||
        company.companyName ||
        company.CompanyName ||
        "",
      identification:
        company.identification ||
        company.Identification ||
        company.taxId ||
        company.TaxID ||
        company.documentId ||
        company.DocumentID ||
        company.identificationNumber ||
        company.IdentificationNumber ||
        "",
      currentOwner:
        company.currentOwner ||
        company.CurrentOwner ||
        company.ownerName ||
        company.OwnerName ||
        "",
      currentOwnerUID:
        company.ownerFirebaseUID ||
        company.OwnerFirebaseUID ||
        company.ownerUID ||
        company.OwnerUID ||
        company.ownerId ||
        company.OwnerID ||
        "",
      raw: company,
    };
  };

  const selectedCompany = companies.find(
    (company) => String(company.id) === String(selectedCompanyId)
  );

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);

      const result = await companyGetService.getCompanies({
        search: "",
        status: "",
        plan: "",
        includeInactive: true,
      });

      const loadedCompanies = Array.isArray(result?.companies)
        ? result.companies.map(normalizeCompany)
        : [];

      setCompanies(loadedCompanies);

      if (loadedCompanies.length === 1) {
        setSelectedCompanyId(loadedCompanies[0].id);
      }
    } catch (error) {
      const message =
        error.message ||
        tr(
          "transferCompany.errors.loadCompanies",
          "Error loading companies."
        );

      toast.error(message);

      setErrors((prev) => ({
        ...prev,
        general: message,
      }));
    } finally {
      setLoadingCompanies(false);
    }
  };

  const searchUsers = async (value) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      setUsers([]);
      return;
    }

    try {
      setSearchingUsers(true);

      const result = await searchUsersService.searchUsers(cleanValue);

      const loadedUsers = Array.isArray(result?.users)
        ? result.users.map(normalizeUser)
        : [];

      setUsers(loadedUsers);
    } catch (error) {
      const message =
        error.message ||
        tr("transferCompany.errors.loadUsers", "Error searching users.");

      toast.error(message);

      setUsers([]);

      setErrors((prev) => ({
        ...prev,
        user: message,
      }));
    } finally {
      setSearchingUsers(false);
    }
  };

  useEffect(() => {
    loadCompanies();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUser) return;

    const timer = setTimeout(() => {
      searchUsers(searchText);
    }, 350);

    return () => clearTimeout(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, selectedUser]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearchText(`${user.name} - ${user.email}`);

    setErrors((prev) => ({
      ...prev,
      user: "",
      general: "",
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!selectedCompanyId) {
      newErrors.company = tr(
        "transferCompany.errors.companyRequired",
        "Company is required."
      );
    }

    if (!selectedUser) {
      newErrors.user = tr(
        "transferCompany.errors.userRequired",
        "Target user is required."
      );
    }

    if (selectedUser && !selectedUser.id) {
      newErrors.user = tr(
        "transferCompany.errors.userIdRequired",
        "The selected user does not have a valid ID."
      );
    }

    if (!confirmTransfer) {
      newErrors.confirm = tr(
        "transferCompany.errors.confirmRequired",
        "You must confirm the transfer."
      );
    }

    if (
      selectedUser &&
      selectedCompany?.currentOwnerUID &&
      String(selectedUser.id) === String(selectedCompany.currentOwnerUID)
    ) {
      newErrors.user = tr(
        "transferCompany.errors.sameCurrentOwner",
        "The new owner must be different from the current owner."
      );
    }

    if (
      selectedUser &&
      currentUserUID &&
      String(selectedUser.id) === String(currentUserUID)
    ) {
      newErrors.user = tr(
        "transferCompany.errors.sameLoggedUser",
        "The new owner must be different from the logged user."
      );
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (!validate()) return;

    const sure = window.confirm(
      tr(
        "transferCompany.confirmDialog",
        "Are you sure you want to transfer this company? This action will change the company owner."
      )
    );

    if (!sure) return;

    try {
      setLoading(true);

      const result =
        await transferCompanyOwnerService.transferCompanyOwner({
          companyId: selectedCompanyId,
          newOwnerUid: selectedUser.id,
        });

      toast.success(
        result?.message ||
          tr(
            "transferCompany.success",
            "Company transferred successfully."
          )
      );

      setSelectedUser(null);
      setSearchText("");
      setConfirmTransfer(false);

      if (companies.length !== 1) {
        setSelectedCompanyId("");
      }

      if (typeof setRefreshChecklogin === "function") {
        setRefreshChecklogin((prev) => !prev);
      }

      await loadCompanies();
    } catch (error) {
      const message =
        error.message ||
        tr(
          "transferCompany.errors.general",
          "Error transferring company."
        );

      toast.error(message);

      setErrors({
        general: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="transfer-account">
      <div className="transfer-account__wrapper">
        <div className="transfer-account__header">
          <span className="transfer-account__eyebrow">
            <FaExchangeAlt />
            {tr("transferCompany.section", "Company management")}
          </span>

          <h2>{tr("transferCompany.title", "Transfer company")}</h2>

          <p>
            {tr(
              "transferCompany.subtitle",
              "Transfer a company from the current user to another user."
            )}
          </p>
        </div>

        <div className="transfer-account__card">
          <div className="transfer-account__warning">
            <FaExclamationTriangle />
            <p>
              {tr(
                "transferCompany.warning",
                "This action will transfer the selected company to another user. Review the information carefully before confirming."
              )}
            </p>
          </div>

          <div className="transfer-field">
            <label>
              <FaBuilding />
              {tr("transferCompany.company", "Company")}
            </label>

            <select
              value={selectedCompanyId}
              onChange={(e) => {
                setSelectedCompanyId(e.target.value);
                setErrors((prev) => ({
                  ...prev,
                  company: "",
                  general: "",
                }));
              }}
              disabled={loading || loadingCompanies}
            >
              <option value="">
                {loadingCompanies
                  ? tr(
                      "transferCompany.loadingCompanies",
                      "Loading companies..."
                    )
                  : tr(
                      "transferCompany.companyPlaceholder",
                      "Select a company"
                    )}
              </option>

              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                  {company.identification
                    ? ` - ${company.identification}`
                    : ""}
                </option>
              ))}
            </select>

            {errors.company && (
              <span className="transfer-field__error">
                {errors.company}
              </span>
            )}
          </div>

          <div className="transfer-field transfer-field--autocomplete">
            <label>
              <FaUser />
              {tr("transferCompany.targetUser", "Target user")}
            </label>

            <div className="transfer-field__search">
              <FaSearch />

              <input
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setSelectedUser(null);
                  setErrors((prev) => ({
                    ...prev,
                    user: "",
                    general: "",
                  }));
                }}
                placeholder={tr(
                  "transferCompany.searchPlaceholder",
                  "Search user by name or email"
                )}
                disabled={loading}
              />
            </div>

            {searchingUsers && (
              <div className="transfer-account__results">
                <button type="button" disabled>
                  <strong>
                    {tr("transferCompany.searchingUsers", "Searching...")}
                  </strong>
                </button>
              </div>
            )}

            {!searchingUsers &&
              users.length > 0 &&
              !selectedUser && (
                <div className="transfer-account__results">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      disabled={loading}
                    >
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </button>
                  ))}
                </div>
              )}

            {!searchingUsers &&
              searchText.trim() &&
              users.length === 0 &&
              !selectedUser && (
                <div className="transfer-account__results">
                  <button type="button" disabled>
                    <strong>
                      {tr(
                        "transferCompany.noUsersFound",
                        "No users found."
                      )}
                    </strong>
                  </button>
                </div>
              )}

            {errors.user && (
              <span className="transfer-field__error">
                {errors.user}
              </span>
            )}
          </div>

          {selectedUser && selectedCompany && (
            <div className="transfer-account__summary">
              <h3>
                {tr("transferCompany.summaryTitle", "Transfer summary")}
              </h3>

              <p>
                <strong>
                  {tr("transferCompany.companyName", "Company")}:
                </strong>{" "}
                {selectedCompany.name}
              </p>

              <p>
                <strong>
                  {tr("transferCompany.legalName", "Legal name")}:
                </strong>{" "}
                {selectedCompany.legalName || "-"}
              </p>

              <p>
                <strong>
                  {tr(
                    "transferCompany.identification",
                    "Identification"
                  )}
                  :
                </strong>{" "}
                {selectedCompany.identification || "-"}
              </p>

              <p>
                <strong>
                  {tr(
                    "transferCompany.currentOwner",
                    "Current owner"
                  )}
                  :
                </strong>{" "}
                {selectedCompany.currentOwner || "-"}
              </p>

              <p>
                <strong>
                  {tr("transferCompany.toUser", "Transfer to")}:
                </strong>{" "}
                {selectedUser.name} ({selectedUser.email})
              </p>
            </div>
          )}

          <label className="transfer-account__confirm">
            <input
              type="checkbox"
              checked={confirmTransfer}
              onChange={(e) => {
                setConfirmTransfer(e.target.checked);
                setErrors((prev) => ({
                  ...prev,
                  confirm: "",
                  general: "",
                }));
              }}
              disabled={loading}
            />

            <span>
              {tr(
                "transferCompany.confirmText",
                "I confirm that I want to transfer this company to the selected user."
              )}
            </span>
          </label>

          {errors.confirm && (
            <span className="transfer-field__error">
              {errors.confirm}
            </span>
          )}

          {errors.general && (
            <div className="transfer-account__general-error">
              {errors.general}
            </div>
          )}

          <div className="transfer-account__actions">
            <button
              type="button"
              className="transfer-account__button"
              onClick={handleTransfer}
              disabled={loading || loadingCompanies}
            >
              <FaCheck />

              {loading
                ? tr("transferCompany.processing", "Processing...")
                : tr("transferCompany.transfer", "Transfer company")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}