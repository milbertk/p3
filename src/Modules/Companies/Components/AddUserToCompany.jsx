import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaUserPlus,
  FaSearch,
  FaBuilding,
  FaUserShield,
  FaEnvelope,
  FaPaperPlane,
  FaTasks,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./AddUserToCompany.scss";
import BasicModal from "../../../Shared/Components/BasicModal/BasicModal";
import ManageCompanyRequests from "./ManageCompanyRequests";

import CompanyGetService from "../Services/getCompanies";

import CompanyUserRequestService from "../Services/CompanyUserRequestService";
import SearchUsersService from "../Services/searchUsers";


// A complete email address (the server only searches exact emails).
const isCompleteEmail = (value) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/.test(String(value || "").trim());

export default function AddUserToCompany({
  t,
  onSubmitRequest = () => {},
  onManageRequests = () => {},
}) {
  const companyService = useMemo(() => new CompanyGetService(), []);
  const usersService = useMemo(() => new SearchUsersService(), []);
  const requestService = useMemo(() => new CompanyUserRequestService(), []);

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [role, setRole] = useState("USER");
  const [message, setMessage] = useState(
    t(
      "addUserToCompany.defaultInvitationMessage",
      "Hello, I would like to invite you to join this company."
    )
  );

  const [saving, setSaving] = useState(false);
  const [showManage, setShowManage] = useState(false);

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

  const normalizeCompany = (company) => ({
    companyId: getValue(company, [
      "companyId",
      "company_id",
      "CompanyID",
      "id",
    ]),
    companyName: getValue(company, [
      "companyName",
      "company_name",
      "CompanyName",
    ]),
  });

  const normalizeUser = (user) => ({
    uid: getValue(user, ["uid", "UID", "id", "Id"]),
    displayName: getValue(
      user,
      ["displayName", "DisplayName", "name", "Name"],
      tr("addUserToCompany.noName", "No name")
    ),
    email: getValue(user, ["email", "Email"]),
    phoneNumber: getValue(user, ["phoneNumber", "PhoneNumber", "phonenumber"]),
    photoURL: getValue(user, ["photoURL", "PhotoURL", "photourl"]),
    original: user,
  });

  const selectedCompany = useMemo(() => {
    return companies.find(
      (company) => String(company.companyId) === String(selectedCompanyId)
    );
  }, [companies, selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      setLoadingCompanies(true);
      setCompanyError("");

      const result = await companyService.getCompanies({
        includeInactive: false,
      });

      const normalizedCompanies = Array.isArray(result?.companies)
        ? result.companies
            .map(normalizeCompany)
            .filter(
              (company) =>
                String(company.companyId).trim() !== "" &&
                String(company.companyName).trim() !== ""
            )
        : [];

      setCompanies(normalizedCompanies);

      if (normalizedCompanies.length > 0) {
        setSelectedCompanyId((prev) => prev || normalizedCompanies[0].companyId);
      } else {
        setSelectedCompanyId("");
        setCompanyError(
          tr("addUserToCompany.noCompaniesFound", "No companies found")
        );
      }
    } catch (error) {
      console.error("Error loading companies:", error);

      setCompanies([]);
      setSelectedCompanyId("");
      setCompanyError(
        error.message ||
          tr("addUserToCompany.errorLoadingCompanies", "Error loading companies")
      );
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const value = search.trim();

    if (!value) {
      setUsers([]);
      setSelectedUser(null);
      setShowSuggestions(false);
      setSearchError("");
      return;
    }

    const selectedText = selectedUser
      ? `${selectedUser.displayName} (${selectedUser.email})`
      : "";

    if (selectedUser && search === selectedText) {
      return;
    }

    // Search only a complete email address (2026-10-25, security S10).
    if (!isCompleteEmail(value)) {
      setUsers([]);
      setShowSuggestions(false);
      setSearchError("");
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        setLoadingUsers(true);
        setSearchError("");

        const result = await usersService.searchUsers(value, selectedCompanyId);

        const normalizedUsers = Array.isArray(result?.users)
          ? result.users.map(normalizeUser).filter((user) => user.uid)
          : [];

        setUsers(normalizedUsers);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error searching users:", error);

        setUsers([]);
        setShowSuggestions(true);
        setSearchError(
          error.message ||
            tr("addUserToCompany.errorSearchingUsers", "Error searching users")
        );
      } finally {
        setLoadingUsers(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedUser, selectedCompanyId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearch(`${user.displayName} (${user.email})`);
    setShowSuggestions(false);
  };

  const resetForm = () => {
    setSearch("");
    setSelectedUser(null);
    setRole("USER");
    setMessage(
      tr(
        "addUserToCompany.defaultInvitationMessage",
        "Hello, I would like to invite you to join this company."
      )
    );
    setUsers([]);
    setSearchError("");
    setShowSuggestions(false);

    if (companies.length > 0) {
      setSelectedCompanyId(companies[0].companyId);
    } else {
      setSelectedCompanyId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedUser) {
      toast.error(tr("addUserToCompany.userRequired", "Please select a user."));
      return;
    }

    if (!selectedCompanyId) {
      toast.error(
        tr("addUserToCompany.companyRequired", "Please select a company.")
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        companyId: selectedCompanyId,
        invitedUserId: selectedUser.uid,
        roleRequested: role || "USER",
        status: "PENDING",
        message: message.trim(),
      };

      const result = await requestService.createCompanyUserRequest(payload);

      onSubmitRequest({
        ...payload,
        companyName: selectedCompany?.companyName || "",
        userName: selectedUser.displayName,
        userEmail: selectedUser.email,
        response: result,
      });

      toast.success(
        result?.message ||
          tr(
            "addUserToCompany.requestCreated",
            "Company user request has been created."
          )
      );

      resetForm();
    } catch (error) {
      console.error("Error creating company user request:", error);

      toast.error(
        error.message ||
          tr(
            "addUserToCompany.requestError",
            "Error creating company user request."
          )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="add-user-company-page">
      <div className="add-user-company-card">
        <div className="add-user-company-card__header">
          <div>
            <span className="add-user-company-card__icon">
              <FaUserPlus />
            </span>

            <h2>{tr("addUserToCompany.title", "Invite user to company")}</h2>

            <p>
              {tr(
                "addUserToCompany.subtitle",
                "Search for a user, select the company, assign a role, and send the request."
              )}
            </p>
          </div>

          <div className="add-user-company-card__header-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                onManageRequests();
                setShowManage(true);
              }}
            >
              <FaTasks />
              {tr("addUserToCompany.manageRequests", "Manage requests")}
            </button>

            <span className="add-user-company-card__badge">
              {tr("addUserToCompany.statusPending", "Pending")}
            </span>
          </div>
        </div>

        <form className="add-user-company-form" onSubmit={handleSubmit}>
          <div className="add-user-company-form__grid">
            <label
              className="add-user-company-form__full"
              ref={wrapperRef}
            >
              {tr("addUserToCompany.user", "User")}

              <div className="search-control">
                <FaSearch />

                <input
                  type="text"
                  value={search}
                  autoComplete="off"
                  placeholder={tr(
                    "addUserToCompany.searchUser",
                    "Type the exact email of the user"
                  )}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedUser(null);
                  }}
                  onFocus={() => {
                    if (
                      users.length > 0 ||
                      loadingUsers ||
                      searchError ||
                      isCompleteEmail(search.trim())
                    ) {
                      setShowSuggestions(true);
                    }
                  }}
                  disabled={saving}
                />
              </div>

              {showSuggestions && (
                <div className="user-results">
                  {loadingUsers ? (
                    <div className="empty-result">
                      {tr("addUserToCompany.loadingUsers", "Loading users...")}
                    </div>
                  ) : searchError ? (
                    <div className="empty-result error">
                      {searchError}
                    </div>
                  ) : users.length > 0 ? (
                    users.map((user) => (
                      <button
                        type="button"
                        key={user.uid}
                        className="user-result-item"
                        onMouseDown={() => handleSelectUser(user)}
                        onTouchStart={() => handleSelectUser(user)}
                      >
                        <span>
                          <strong>{user.displayName}</strong>
                          <small>{user.email}</small>
                        </span>

                        <small>{user.uid}</small>
                      </button>
                    ))
                  ) : isCompleteEmail(search.trim()) ? (
                    <div className="empty-result">
                      {tr("addUserToCompany.noUsersFound", "No users found")}
                    </div>
                  ) : null}
                </div>
              )}
            </label>

            <label>
              {tr("addUserToCompany.company", "Company")}

              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                disabled={loadingCompanies || saving}
              >
                {companies.length === 0 ? (
                  <option value="">
                    {loadingCompanies
                      ? tr("addUserToCompany.loadingCompanies", "Loading companies...")
                      : tr("addUserToCompany.selectCompany", "Select company")}
                  </option>
                ) : (
                  companies.map((company) => (
                    <option key={company.companyId} value={company.companyId}>
                      {company.companyName}
                    </option>
                  ))
                )}
              </select>

              {companyError && (
                <small className="field-error">{companyError}</small>
              )}
            </label>

            <label>
              {tr("addUserToCompany.role", "Role")}

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={saving}
              >
                <option value="USER">
                  {tr("addUserToCompany.roleUser", "User")}
                </option>
                <option value="MANAGER">
                  {tr("addUserToCompany.roleManager", "Manager")}
                </option>
                <option value="ADMIN">
                  {tr("addUserToCompany.roleAdmin", "Administrator")}
                </option>
              </select>
            </label>

            <label className="add-user-company-form__full">
              {tr("addUserToCompany.message", "Invitation message")}

              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={saving}
                placeholder={tr(
                  "addUserToCompany.messagePlaceholder",
                  "Write a short invitation message..."
                )}
              />
            </label>
          </div>

          {selectedUser && (
            <div className="selected-summary">
              <div>
                <FaEnvelope />
                <span>
                  <strong>{selectedUser.displayName}</strong>
                  <small>{selectedUser.email}</small>
                </span>
              </div>

              <div>
                <FaBuilding />
                <span>
                  <strong>{selectedCompany?.companyName || ""}</strong>
                  <small>{selectedCompanyId}</small>
                </span>
              </div>

              <div>
                <FaUserShield />
                <span>
                  <strong>{tr("addUserToCompany.role", "Role")}</strong>
                  <small>{role}</small>
                </span>
              </div>
            </div>
          )}

          <div className="add-user-company-form__actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !selectedUser || !selectedCompanyId}
            >
              <FaPaperPlane />
              {saving
                ? tr("addUserToCompany.sending", "Sending...")
                : tr("addUserToCompany.sendRequest", "Send request")}
            </button>
          </div>
        </form>
      </div>

      <BasicModal show={showManage} setShow={setShowManage} name="">
        <ManageCompanyRequests t={t} />
      </BasicModal>
    </section>
  );
}