import React, { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaSearch,
  FaFilter,
  FaTimesCircle,
  FaUsers,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./ManageCompanyRequests.scss";

import CompanyGetService from "../Services/getCompanies";
import SearchCompanyRequestsService from "../Services/SearchCompanyRequestsService";
import UpdateCompanyUserRequestService from "../Services/UpdateCompanyUserRequestService";

const PAGE_SIZE = 5;

export default function ManageCompanyRequests({
  t,
  isOpen = true,
  onBack = () => {},
  onCancelRequest = () => {},
}) {
  const companyService = useMemo(() => new CompanyGetService(), []);
  const requestSearchService = useMemo(
    () => new SearchCompanyRequestsService(),
    []
  );
  const updateRequestService = useMemo(
    () => new UpdateCompanyUserRequestService(),
    []
  );

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [companyError, setCompanyError] = useState("");

  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestError, setRequestError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [page, setPage] = useState(1);
  const [cancelingId, setCancelingId] = useState("");

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
      "ID",
    ]),
    companyName: getValue(company, [
      "companyName",
      "company_name",
      "CompanyName",
      "name",
      "Name",
    ]),
  });

  const normalizeRequest = (item) => {
    const invitedUserName = getValue(
      item,
      [
        "invitedUserName",
        "InvitedUserName",
        "userName",
        "UserName",
        "displayName",
        "DisplayName",
        "name",
        "Name",
      ],
      "-"
    );

    const invitedUserEmail = getValue(item, [
      "invitedUserEmail",
      "InvitedUserEmail",
      "userEmail",
      "UserEmail",
      "email",
      "Email",
    ]);

    return {
      requestId: getValue(item, [
        "requestId",
        "RequestID",
        "id",
        "ID",
        "_id",
      ]),
      companyId: getValue(item, [
        "companyId",
        "CompanyID",
        "company_id",
      ]),
      invitedUserId: getValue(item, [
        "invitedUserId",
        "InvitedUserID",
        "userId",
        "UserID",
      ]),
      invitedUserName,
      invitedUserEmail,
      roleRequested: getValue(
        item,
        ["roleRequested", "RoleRequested", "role", "Role"],
        "-"
      ),
      status: getValue(item, ["status", "Status"], "-"),
      createdAt: getValue(item, [
        "createdAt",
        "CreatedAt",
        "created_at",
        "dateCreated",
        "DateCreated",
      ]),
      message: getValue(item, ["message", "Message"]),
      original: item,
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

    const list = possibleLists.find((value) => Array.isArray(value));

    return Array.isArray(list) ? list : [];
  };

  const extractRequests = (result) => {
    const possibleLists = [
      result?.requests,
      result?.Requests,
      result?.items,
      result?.Items,
      result?.data?.requests,
      result?.data?.Requests,
      result?.data?.items,
      result?.data?.Items,
      result?.data,
    ];

    const list = possibleLists.find((value) => Array.isArray(value));

    return Array.isArray(list) ? list : [];
  };

  const loadRequestsByCompany = async (companyId, searchValue = "") => {
    if (!companyId) {
      setRequests([]);
      return;
    }

    try {
      setLoadingRequests(true);
      setRequestError("");

      const result = await requestSearchService.searchRequests({
        companyId,
        search: searchValue,
        page: 1,
        pageSize: 200,
      });

      const normalized = extractRequests(result)
        .map(normalizeRequest)
        .filter((item) => String(item.requestId).trim() !== "");

      setRequests(normalized);
    } catch (error) {
      console.error("Error loading requests:", error);

      setRequests([]);
      setRequestError(
        error.message ||
          tr(
            "manageCompanyRequests.errorLoadingRequests",
            "Error loading requests"
          )
      );
    } finally {
      setLoadingRequests(false);
    }
  };

  const loadCompaniesAndRequests = async () => {
    try {
      setLoadingCompanies(true);
      setCompanyError("");
      setRequestError("");
      setPage(1);
      setStatusFilter("PENDING");

      const result = await companyService.getCompanies({
        includeInactive: false,
      });

      const normalized = extractCompanies(result)
        .map(normalizeCompany)
        .filter(
          (company) =>
            String(company.companyId).trim() !== "" &&
            String(company.companyName).trim() !== ""
        );

      setCompanies(normalized);

      if (normalized.length > 0) {
        const firstCompanyId = normalized[0].companyId;

        setSelectedCompanyId(firstCompanyId);

        // Important: load requests immediately with the company id,
        // without waiting for selectedCompanyId state to update.
        await loadRequestsByCompany(firstCompanyId, "");
      } else {
        setSelectedCompanyId("");
        setRequests([]);
        setCompanyError(
          tr("manageCompanyRequests.noCompaniesFound", "No companies found")
        );
      }
    } catch (error) {
      console.error("Error loading companies:", error);

      setCompanies([]);
      setSelectedCompanyId("");
      setRequests([]);
      setCompanyError(
        error.message ||
          tr(
            "manageCompanyRequests.errorLoadingCompanies",
            "Error loading companies"
          )
      );
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load automatically when the modal is opened.
  useEffect(() => {
    if (!isOpen) return;

    setSearch("");
    setPage(1);
    setStatusFilter("PENDING");

    loadCompaniesAndRequests();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Search reloads requests only when a company is already selected.
  useEffect(() => {
    if (!isOpen || !selectedCompanyId) return;

    const timeout = setTimeout(() => {
      setPage(1);
      loadRequestsByCompany(selectedCompanyId, search);
    }, 400);

    return () => clearTimeout(timeout);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const filteredRequests = useMemo(() => {
    const value = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesCompany =
        String(item.companyId) === String(selectedCompanyId);

      const matchesStatus =
        statusFilter === "ALL" ||
        String(item.status).toUpperCase() === statusFilter;

      const matchesSearch =
        !value ||
        String(item.invitedUserName).toLowerCase().includes(value) ||
        String(item.invitedUserEmail).toLowerCase().includes(value) ||
        String(item.roleRequested).toLowerCase().includes(value) ||
        String(item.requestId).toLowerCase().includes(value);

      return matchesCompany && matchesStatus && matchesSearch;
    });
  }, [requests, selectedCompanyId, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));

  const visibleRows = filteredRequests.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const selectedCompany = companies.find(
    (company) => String(company.companyId) === String(selectedCompanyId)
  );

  const getStatusLabel = (status) => {
    const value = String(status || "").toUpperCase();

    if (value === "PENDING") {
      return tr("manageCompanyRequests.statusPending", "Pending");
    }

    if (value === "APPROVED" || value === "ACCEPTED") {
      return tr("manageCompanyRequests.statusApproved", "Approved");
    }

    if (value === "REJECTED") {
      return tr("manageCompanyRequests.statusRejected", "Rejected");
    }

    if (value === "CANCELED" || value === "CANCELLED") {
      return tr("manageCompanyRequests.statusCanceled", "Canceled");
    }

    if (value === "EXPIRED") {
      return tr("manageCompanyRequests.statusExpired", "Expired");
    }

    return status || "-";
  };

  const handleCancel = async (requestId) => {
    const request = requests.find(
      (item) => String(item.requestId) === String(requestId)
    );

    if (!request) {
      toast.error(
        tr("manageCompanyRequests.requestNotFound", "Request not found")
      );
      return;
    }

    try {
      setCancelingId(requestId);

      const result = await updateRequestService.cancelRequest(requestId);

      const updatedRequest = {
        ...request,
        status: "CANCELED",
      };

      setRequests((prev) =>
        prev.map((item) =>
          String(item.requestId) === String(requestId) ? updatedRequest : item
        )
      );

      onCancelRequest({
        ...updatedRequest,
        response: result,
      });

      toast.success(
        result?.message ||
          tr("manageCompanyRequests.requestCanceled", "Request canceled")
      );
    } catch (error) {
      console.error("Error canceling request:", error);

      toast.error(
        error.message ||
          tr("manageCompanyRequests.cancelError", "Error canceling request")
      );
    } finally {
      setCancelingId("");
    }
  };

  const handleCompanyChange = async (value) => {
    setSelectedCompanyId(value);
    setStatusFilter("PENDING");
    setSearch("");
    setPage(1);

    // Important: load immediately when company changes.
    await loadRequestsByCompany(value, "");
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <section className="manage-company-requests-page">
      <div className="manage-company-requests-card">
        <div className="manage-company-requests-card__header">
          <div>
            <span className="manage-company-requests-card__icon">
              <FaUsers />
            </span>

            <h2>
              {tr("manageCompanyRequests.title", "Manage company requests")}
            </h2>

            <p>
              {tr(
                "manageCompanyRequests.subtitle",
                "Review and manage company user requests."
              )}
            </p>
          </div>
        </div>

        <div className="manage-company-requests-toolbar">
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
                    ? tr(
                        "manageCompanyRequests.loadingCompanies",
                        "Loading companies..."
                      )
                    : tr(
                        "manageCompanyRequests.selectCompany",
                        "Select company"
                      )}
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={tr(
                "manageCompanyRequests.searchPlaceholder",
                "Search by user, email, role or request ID"
              )}
            />
          </label>

          <label>
            <FaFilter />

            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="ALL">
                {tr("manageCompanyRequests.all", "All")}
              </option>

              <option value="PENDING">
                {tr("manageCompanyRequests.statusPending", "Pending")}
              </option>

              <option value="APPROVED">
                {tr("manageCompanyRequests.statusApproved", "Approved")}
              </option>

              <option value="REJECTED">
                {tr("manageCompanyRequests.statusRejected", "Rejected")}
              </option>

              <option value="CANCELED">
                {tr("manageCompanyRequests.statusCanceled", "Canceled")}
              </option>

              <option value="EXPIRED">
                {tr("manageCompanyRequests.statusExpired", "Expired")}
              </option>
            </select>
          </label>
        </div>

        {companyError && <div className="empty-state">{companyError}</div>}

        <div className="requests-summary">
          <div>
            <span>{tr("manageCompanyRequests.company", "Company")}</span>
            <strong>{selectedCompany?.companyName || "-"}</strong>
          </div>

          <div>
            <span>{tr("manageCompanyRequests.results", "Results")}</span>
            <strong>{filteredRequests.length}</strong>
          </div>
        </div>

        <div className="requests-list">
          {loadingRequests ? (
            <div className="empty-state">
              {tr(
                "manageCompanyRequests.loadingRequests",
                "Loading requests..."
              )}
            </div>
          ) : requestError ? (
            <div className="empty-state">{requestError}</div>
          ) : visibleRows.length > 0 ? (
            visibleRows.map((item) => {
              const status = String(item.status || "").toLowerCase();
              const isPending = String(item.status).toUpperCase() === "PENDING";
              const isCanceling =
                String(cancelingId) === String(item.requestId);

              return (
                <article className="request-card" key={item.requestId}>
                  <div className="request-card__top">
                    <div>
                      <h3>{item.invitedUserName || "-"}</h3>
                      <p>{item.invitedUserEmail || "-"}</p>
                    </div>

                    <span className={`status-badge status-badge--${status}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="request-card__details">
                    <div>
                      <span>
                        {tr("manageCompanyRequests.requestId", "Request ID")}
                      </span>
                      <strong>{item.requestId}</strong>
                    </div>

                    <div>
                      <span>{tr("manageCompanyRequests.role", "Role")}</span>
                      <strong>{item.roleRequested}</strong>
                    </div>

                    <div>
                      <span>
                        {tr("manageCompanyRequests.created", "Created")}
                      </span>
                      <strong>{item.createdAt || "-"}</strong>
                    </div>
                  </div>

                  {isPending && (
                    <div className="request-card__actions">
                      <button
                        type="button"
                        className="btn-danger"
                        disabled={isCanceling}
                        onClick={() => handleCancel(item.requestId)}
                      >
                        <FaTimesCircle />

                        {isCanceling
                          ? tr(
                              "manageCompanyRequests.canceling",
                              "Canceling..."
                            )
                          : tr(
                              "manageCompanyRequests.cancelRequest",
                              "Cancel request"
                            )}
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          ) : (
            <div className="empty-state">
              {tr(
                "manageCompanyRequests.noRequestsFound",
                "No requests found"
              )}
            </div>
          )}
        </div>

        <div className="pagination-bar">
          <button
            type="button"
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            {tr("manageCompanyRequests.previous", "Previous")}
          </button>

          <span>
            {tr("manageCompanyRequests.page", "Page")} {page} / {totalPages}
          </span>

          <button
            type="button"
            className="btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            {tr("manageCompanyRequests.next", "Next")}
          </button>
        </div>
      </div>
    </section>
  );
}