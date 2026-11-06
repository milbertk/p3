import React, { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaBuilding,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaUserShield,
} from "react-icons/fa";
import { toast } from "react-toastify";

import "./InviteNotifications.scss";
import PendingInvitationsService from "../services/PendingInvitationsService";
import ProcessInvitationService from "../services/ProcessInvitationService";


export default function InviteNotifications({ t, setRefreshCheckLogin }) {
  const pendingInvitationsService = useMemo(
    () => new PendingInvitationsService(),
    []
  );

  const processInvitationService = useMemo(
    () => new ProcessInvitationService(),
    []
  );

  const [notifications, setNotifications] = useState([]);
  const [processingIds, setProcessingIds] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const extractInvitations = (result) => {
    const possibleLists = [
      result?.invitations,
      result?.Invitations,
      result?.notifications,
      result?.Notifications,
      result?.requests,
      result?.Requests,
      result?.items,
      result?.Items,
      result?.data?.invitations,
      result?.data?.Invitations,
      result?.data?.notifications,
      result?.data?.Notifications,
      result?.data?.requests,
      result?.data?.Requests,
      result?.data?.items,
      result?.data?.Items,
      result?.data,
    ];

    const list = possibleLists.find((value) => Array.isArray(value));

    return Array.isArray(list) ? list : [];
  };

  const normalizeInvitation = (item) => {
    const requestId = getValue(item, [
      "requestId",
      "RequestID",
      "id",
      "ID",
      "_id",
    ]);

    return {
      id:
        getValue(item, [
          "id",
          "ID",
          "_id",
          "notificationId",
          "NotificationID",
        ]) || requestId,
      requestId,
      companyId: getValue(item, [
        "companyId",
        "CompanyID",
        "company_id",
      ]),
      companyName: getValue(
        item,
        [
          "companyName",
          "CompanyName",
          "company_name",
          "name",
          "Name",
        ],
        "-"
      ),
      role: String(
        getValue(
          item,
          [
            "role",
            "Role",
            "roleRequested",
            "RoleRequested",
            "requestedRole",
            "RequestedRole",
          ],
          "USER"
        )
      ).toUpperCase(),
      invitedAt: getValue(item, [
        "invitedAt",
        "InvitedAt",
        "createdAt",
        "CreatedAt",
        "created_at",
        "dateCreated",
        "DateCreated",
      ]),
      message: getValue(
        item,
        ["message", "Message", "description", "Description"],
        tr(
          "inviteNotifications.defaultMessage",
          "You have been invited to join this company."
        )
      ),
      status: String(
        getValue(item, ["status", "Status"], "PENDING")
      ).toUpperCase(),
      original: item,
    };
  };

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const result = await pendingInvitationsService.getPendingInvitations();

      const normalizedInvitations = extractInvitations(result)
        .map(normalizeInvitation)
        .filter((item) => String(item.requestId).trim() !== "");

      setNotifications(normalizedInvitations);
    } catch (error) {
      console.error("Error loading invitations:", error);

      setNotifications([]);
      setLoadError(
        error.message ||
          tr(
            "inviteNotifications.errorLoading",
            "Error loading invitations."
          )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(
    () =>
      notifications.filter(
        (item) => String(item.status).toUpperCase() === "PENDING"
      ).length,
    [notifications]
  );

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const isProcessing = (id) => processingIds.includes(id);

  const handleAction = async (notification, action) => {
    if (!notification?.requestId) {
      toast.error(
        tr("inviteNotifications.requestNotFound", "Request not found.")
      );
      return;
    }

    try {
      setProcessingIds((prev) => [...prev, notification.id]);

      const result = await processInvitationService.processInvitation({
        requestId: notification.requestId,
        action,
        message:
          action === "ACCEPT"
            ? "Invitation accepted by invited user."
            : "Invitation rejected by invited user.",
      });

      setNotifications((prev) =>
        prev.filter((item) => String(item.id) !== String(notification.id))
      );

      toast.success(
        result?.message ||
          (action === "ACCEPT"
            ? tr(
                "inviteNotifications.acceptedMessage",
                "Invitation accepted successfully."
              )
            : tr(
                "inviteNotifications.rejectedMessage",
                "Invitation rejected successfully."
              ))
      );

      if (typeof setRefreshCheckLogin === "function") {
        setRefreshCheckLogin((prev) => !prev);
      }
    } catch (error) {
      console.error("Error processing invitation:", error);

      toast.error(
        error.message ||
          tr(
            "inviteNotifications.processError",
            "Error processing invitation."
          )
      );
    } finally {
      setProcessingIds((prev) =>
        prev.filter((id) => String(id) !== String(notification.id))
      );
    }
  };

  return (
    <section className="invite-notifications-page">
      <div className="invite-notifications-card">
        <div className="invite-notifications-card__header">
          <div>
            <span className="invite-notifications-card__icon">
              <FaBell />
            </span>

            <h2>{tr("inviteNotifications.title", "Invitations")}</h2>

            <p>
              {tr(
                "inviteNotifications.subtitle",
                "Review your pending company invitations."
              )}
            </p>
          </div>

          <span className="invite-notifications-card__badge">
            {pendingCount} {tr("inviteNotifications.pending", "pending")}
          </span>
        </div>

        <div className="invite-notifications-summary">
          <div>
            <span>{tr("inviteNotifications.total", "Total")}</span>
            <strong>{notifications.length}</strong>
          </div>

          <div>
            <span>{tr("inviteNotifications.status", "Status")}</span>
            <strong>
              {loading
                ? tr("inviteNotifications.loading", "Loading")
                : tr("inviteNotifications.realMode", "Real data")}
            </strong>
          </div>
        </div>

        <div className="invite-notifications-list">
          {loading ? (
            <div className="invite-notifications-empty">
              <FaBell />
              <h3>{tr("inviteNotifications.loading", "Loading...")}</h3>
              <p>
                {tr(
                  "inviteNotifications.loadingText",
                  "Loading your invitations."
                )}
              </p>
            </div>
          ) : loadError ? (
            <div className="invite-notifications-empty">
              <FaTimesCircle />
              <h3>
                {tr("inviteNotifications.errorTitle", "Could not load data")}
              </h3>
              <p>{loadError}</p>

              <button
                type="button"
                className="btn-success"
                onClick={loadInvitations}
              >
                {tr("inviteNotifications.retry", "Retry")}
              </button>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className="invite-notification-item"
              >
                <div className="invite-notification-main">
                  <span className="invite-notification-avatar">
                    <FaBuilding />
                  </span>

                  <div>
                    <h3>{notification.companyName}</h3>

                    <div className="invite-notification-meta">
                      <span>
                        <FaUserShield />
                        {notification.role}
                      </span>

                      <span>
                        <FaClock />
                        {formatDate(notification.invitedAt)}
                      </span>
                    </div>

                    <p>{notification.message}</p>
                  </div>
                </div>

                <div className="invite-notification-actions">
                  <button
                    type="button"
                    className="btn-success"
                    disabled={isProcessing(notification.id)}
                    onClick={() => handleAction(notification, "ACCEPT")}
                  >
                    <FaCheckCircle />

                    {isProcessing(notification.id)
                      ? tr("inviteNotifications.processing", "Processing...")
                      : tr("inviteNotifications.accept", "Accept")}
                  </button>

                  <button
                    type="button"
                    className="btn-danger"
                    disabled={isProcessing(notification.id)}
                    onClick={() => handleAction(notification, "REJECT")}
                  >
                    <FaTimesCircle />

                    {isProcessing(notification.id)
                      ? tr("inviteNotifications.processing", "Processing...")
                      : tr("inviteNotifications.reject", "Reject")}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="invite-notifications-empty">
              <FaBell />
              <h3>
                {tr(
                  "inviteNotifications.emptyTitle",
                  "No pending invitations"
                )}
              </h3>

              <p>
                {tr(
                  "inviteNotifications.emptyText",
                  "You do not have pending invitations at this moment."
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}