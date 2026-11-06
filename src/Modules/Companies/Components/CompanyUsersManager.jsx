import React, { useEffect, useMemo, useState } from "react";
import {
  FaUsers,
  FaSearch,
  FaBuilding,
  FaSyncAlt,
  FaUserShield,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./CompanyUsersManager.scss";

import CompanyGetService from "../Services/getCompanies";
import searchCompanyUsers from "../Services/SearchCompanyUsersService";
import updateCompanyUser from "../Services/UpdateCompanyUserService";

const ROLE_OPTIONS = ["ADMIN", "MANAGER", "USER", "SUPPORT"];

export default function CompanyUsersManager({ t }) {
  const companyService = useMemo(() => new CompanyGetService(), []);
  const companyUsersService = useMemo(() => new searchCompanyUsers(), []);
  const updateCompanyUserService = useMemo(() => new updateCompanyUser(), []);

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [newRole, setNewRole] = useState("USER");

  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState("");

  const [companyError, setCompanyError] = useState("");
  const [usersError, setUsersError] = useState("");

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

  const toBoolean = (value) => {
    if (typeof value === "boolean") return value;

    const text = String(value || "").trim().toLowerCase();

    return text === "true" || text === "1" || text === "active" || text === "s";
  };

  const normalizeCompany = (company) => ({
    companyId: getValue(company, [
      "companyId",
      "company_id",
      "CompanyID",
      "id",
      "ID",
    ]),
    companyName: getValue(company, [
      "companyName",
      "company_name",
      "CompanyName",
      "name",
      "Name",
    ]),
    original: company,
  });

  const normalizeCompanyUser = (row) => {
    const activeValue = getValue(row, [
      "active",
      "Active",
      "isActive",
      "IsActive",
      "status",
      "Status",
    ]);

    return {
      companyUserId: getValue(row, [
        "companyUserId",
        "CompanyUserID",
        "company_user_id",
        "id",
        "ID",
        "_id",
      ]),
      companyId: getValue(row, [
        "companyId",
        "CompanyID",
        "company_id",
      ]),
      userId: getValue(row, [
        "userId",
        "UserID",
        "uid",
        "UID",
      ]),
      companyName: getValue(row, [
        "companyName",
        "CompanyName",
        "company_name",
      ]),
      userName: getValue(
        row,
        [
          "userName",
          "UserName",
          "displayName",
          "DisplayName",
          "name",
          "Name",
        ],
        "-"
      ),
      email: getValue(row, [
        "email",
        "Email",
        "userEmail",
        "UserEmail",
      ]),
      role: String(
        getValue(row, ["role", "Role", "roleRequested", "RoleRequested"], "USER")
      ).toUpperCase(),
      active: toBoolean(activeValue),
      joinedAt: getValue(row, [
        "joinedAt",
        "JoinedAt",
        "createdAt",
        "CreatedAt",
        "created_at",
      ]),
      updatedAt: getValue(row, [
        "updatedAt",
        "UpdatedAt",
        "updated_at",
      ]),
      original: row,
    };
  };

  const extractCompanies = (result) => {
    const possibleLists = [
      result?.companies,
      result?.Companies,
      result?.data?.companies,
      result?.data?.Companies,
      result?.data,
    ];

    const list = possibleLists.find((item) => Array.isArray(item));
    return Array.isArray(list) ? list : [];
  };

  const extractCompanyUsers = (result) => {
    const possibleLists = [
      result?.users,
      result?.Users,
      result?.companyUsers,
      result?.CompanyUsers,
      result?.items,
      result?.Items,
      result?.data?.users,
      result?.data?.Users,
      result?.data?.companyUsers,
      result?.data?.CompanyUsers,
      result?.data?.items,
      result?.data?.Items,
      result?.data,
    ];

    const list = possibleLists.find((item) => Array.isArray(item));
    return Array.isArray(list) ? list : [];
  };

  const loadUsersByCompany = async (companyId) => {
    if (!companyId) {
      setUsers([]);
      return;
    }

    try {
      setLoadingUsers(true);
      setUsersError("");

      const result = await companyUsersService.searchCompanyUsers({
        companyId,
        includeInactive: true,
      });

      const normalizedUsers = extractCompanyUsers(result)
        .map(normalizeCompanyUser)
        .filter((user) => String(user.userId || user.companyUserId).trim() !== "");

      setUsers(normalizedUsers);
    } catch (error) {
      console.error("Error loading company users:", error);

      setUsers([]);
      setUsersError(
        error.message ||
          tr("companyUsers.errorLoadingUsers", "Error loading company users")
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadCompaniesAndUsers = async () => {
    try {
      setLoadingCompanies(true);
      setCompanyError("");
      setUsersError("");

      const result = await companyService.getCompanies({
        includeInactive: false,
      });

      const normalizedCompanies = extractCompanies(result)
        .map(normalizeCompany)
        .filter(
          (company) =>
            String(company.companyId).trim() !== "" &&
            String(company.companyName).trim() !== ""
        );

      setCompanies(normalizedCompanies);

      if (normalizedCompanies.length > 0) {
        const firstCompanyId = normalizedCompanies[0].companyId;

        setSelectedCompanyId(firstCompanyId);
        await loadUsersByCompany(firstCompanyId);
      } else {
        setSelectedCompanyId("");
        setUsers([]);
        setCompanyError(tr("companyUsers.noCompaniesFound", "No companies found"));
      }
    } catch (error) {
      console.error("Error loading companies:", error);

      setCompanies([]);
      setUsers([]);
      setSelectedCompanyId("");
      setCompanyError(
        error.message ||
          tr("companyUsers.errorLoadingCompanies", "Error loading companies")
      );
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    loadCompaniesAndUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesCompany =
        String(user.companyId) === String(selectedCompanyId);

      const matchesSearch =
        !value ||
        String(user.userName).toLowerCase().includes(value) ||
        String(user.email).toLowerCase().includes(value) ||
        String(user.companyName).toLowerCase().includes(value) ||
        String(user.userId).toLowerCase().includes(value);

      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.active) ||
        (statusFilter === "INACTIVE" && !user.active);

      return matchesCompany && matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, selectedCompanyId, search, roleFilter, statusFilter]);

  const selectedCompany = companies.find(
    (company) => String(company.companyId) === String(selectedCompanyId)
  );

  const getInitials = (name = "") =>
    String(name)
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  };

  const handleCompanyChange = async (companyId) => {
    setSelectedCompanyId(companyId);
    clearFilters();
    await loadUsersByCompany(companyId);
  };

  const handleToggleActive = async (row) => {
    try {
      setSavingUserId(row.companyUserId || row.userId);

      const nextActive = !row.active;

      const payload = {
        companyUserId: row.companyUserId,
        companyId: row.companyId,
        userId: row.userId,
        role: row.role,
        active: nextActive,
      };

      const result = await updateCompanyUserService.updateCompanyUser(payload);

      setUsers((prev) =>
        prev.map((user) =>
          String(user.companyUserId || user.userId) ===
          String(row.companyUserId || row.userId)
            ? {
                ...user,
                active: nextActive,
                updatedAt: new Date().toISOString(),
                original: result?.data || user.original,
              }
            : user
        )
      );

      toast.success(
        nextActive
          ? tr("companyUsers.userActivated", "User activated")
          : tr("companyUsers.userDeactivated", "User deactivated")
      );
    } catch (error) {
      console.error("Error updating user status:", error);

      toast.error(
        error.message ||
          tr("companyUsers.errorUpdatingStatus", "Error updating user status")
      );
    } finally {
      setSavingUserId("");
    }
  };

  const handleOpenRoleEditor = (row) => {
    setSelectedUser(row);
    setNewRole(row.role || "USER");
    setShowRoleEditor(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;

    try {
      setSavingUserId(selectedUser.companyUserId || selectedUser.userId);

      const payload = {
        companyUserId: selectedUser.companyUserId,
        companyId: selectedUser.companyId,
        userId: selectedUser.userId,
        role: newRole,
        active: selectedUser.active,
      };

      const result = await updateCompanyUserService.updateCompanyUser(payload);

      setUsers((prev) =>
        prev.map((user) =>
          String(user.companyUserId || user.userId) ===
          String(selectedUser.companyUserId || selectedUser.userId)
            ? {
                ...user,
                role: newRole,
                updatedAt: new Date().toISOString(),
                original: result?.data || user.original,
              }
            : user
        )
      );

      setShowRoleEditor(false);
      setSelectedUser(null);

      toast.success(tr("companyUsers.roleUpdated", "Role updated"));
    } catch (error) {
      console.error("Error updating role:", error);

      toast.error(
        error.message ||
          tr("companyUsers.errorUpdatingRole", "Error updating role")
      );
    } finally {
      setSavingUserId("");
    }
  };

  return (
    <section className="company-users-page">
      <div className="company-users-card">
        <div className="company-users-card__header">
          <div>
            <span className="company-users-card__icon">
              <FaUsers />
            </span>

            <h2>{tr("companyUsers.title", "Company users")}</h2>
            <p>
              {tr(
                "companyUsers.subtitle",
                "Manage users, roles and access by company."
              )}
            </p>
          </div>

          <span className="company-users-card__badge">
            {filteredUsers.length} {tr("companyUsers.users", "users")}
          </span>
        </div>

        <div className="company-users-toolbar">
          <label>
            <FaBuilding />

            <select
              value={selectedCompanyId}
              onChange={(e) => handleCompanyChange(e.target.value)}
              disabled={loadingCompanies}
            >
              {companies.length === 0 ? (
                <option value="">
                  {loadingCompanies
                    ? tr("companyUsers.loadingCompanies", "Loading companies...")
                    : tr("companyUsers.selectCompany", "Select company")}
                </option>
              ) : (
                companies.map((company) => (
                  <option key={company.companyId} value={company.companyId}>
                    {company.companyName}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="search-box">
            <FaSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr(
                "companyUsers.searchPlaceholder",
                "Search by name, email, company or user ID"
              )}
            />
          </label>

          <label>
            <FaUserShield />

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="ALL">{tr("companyUsers.allRoles", "All roles")}</option>

              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label>
            <FaSyncAlt />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">
                {tr("companyUsers.allStatuses", "All statuses")}
              </option>
              <option value="ACTIVE">{tr("companyUsers.active", "Active")}</option>
              <option value="INACTIVE">
                {tr("companyUsers.inactive", "Inactive")}
              </option>
            </select>
          </label>

          <button type="button" className="btn-secondary" onClick={clearFilters}>
            {tr("companyUsers.clear", "Clear")}
          </button>
        </div>

        {companyError && <div className="empty-state">{companyError}</div>}

        <div className="company-users-summary">
          <div>
            <span>{tr("companyUsers.company", "Company")}</span>
            <strong>{selectedCompany?.companyName || "-"}</strong>
          </div>

          <div>
            <span>{tr("companyUsers.results", "Results")}</span>
            <strong>{filteredUsers.length}</strong>
          </div>
        </div>

        <div className="company-users-table-wrapper">
          <table className="company-users-table">
            <thead>
              <tr>
                <th>{tr("companyUsers.user", "User")}</th>
                <th>{tr("companyUsers.company", "Company")}</th>
                <th>{tr("companyUsers.role", "Role")}</th>
                <th>{tr("companyUsers.status", "Status")}</th>
                <th>{tr("companyUsers.joinedAt", "Joined at")}</th>
                <th>{tr("companyUsers.updatedAt", "Updated at")}</th>
                <th>{tr("companyUsers.actions", "Actions")}</th>
              </tr>
            </thead>

            <tbody>
              {loadingUsers ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {tr("companyUsers.loadingUsers", "Loading users...")}
                  </td>
                </tr>
              ) : usersError ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {usersError}
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((row) => {
                  const saving =
                    String(savingUserId) ===
                    String(row.companyUserId || row.userId);

                  return (
                    <tr key={row.companyUserId || row.userId}>
                      <td>
                        <div className="user-cell">
                          <span className="user-avatar">
                            {getInitials(row.userName)}
                          </span>

                          <span>
                            <strong>{row.userName}</strong>
                            <small>{row.email}</small>
                          </span>
                        </div>
                      </td>

                      <td>{row.companyName || selectedCompany?.companyName || "-"}</td>

                      <td>
                        <span
                          className={`role-badge role-badge--${String(
                            row.role || "user"
                          ).toLowerCase()}`}
                        >
                          {row.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${
                            row.active
                              ? "status-badge--active"
                              : "status-badge--inactive"
                          }`}
                        >
                          {row.active
                            ? tr("companyUsers.active", "Active")
                            : tr("companyUsers.inactive", "Inactive")}
                        </span>
                      </td>

                      <td>{formatDate(row.joinedAt)}</td>
                      <td>{formatDate(row.updatedAt)}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-secondary btn-small"
                            disabled={saving}
                            onClick={() => handleOpenRoleEditor(row)}
                          >
                            {tr("companyUsers.changeRole", "Change role")}
                          </button>

                          <button
                            type="button"
                            className={`btn-small ${
                              row.active ? "btn-warning" : "btn-success"
                            }`}
                            disabled={saving}
                            onClick={() => handleToggleActive(row)}
                          >
                            {row.active
                              ? tr("companyUsers.deactivate", "Deactivate")
                              : tr("companyUsers.activate", "Activate")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {tr("companyUsers.noResults", "No results")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showRoleEditor && (
        <div className="role-modal-backdrop">
          <div className="role-modal">
            <h3>{tr("companyUsers.changeRole", "Change role")}</h3>

            <p>
              {tr("companyUsers.changeRoleHint", "Change role for")}{" "}
              <strong>{selectedUser?.userName}</strong>
            </p>

            <label>
              {tr("companyUsers.selectRole", "Select role")}

              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <div className="role-modal__actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowRoleEditor(false);
                  setSelectedUser(null);
                }}
              >
                {tr("companyUsers.cancel", "Cancel")}
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveRole}
              >
                {tr("companyUsers.save", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}