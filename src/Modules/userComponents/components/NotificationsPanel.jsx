import React, { useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaExternalLinkAlt,
  FaRegClock,
  FaExclamationCircle,
} from "react-icons/fa";

import "./NotificationsPanel.scss";
import NotificationsService from "../../../Shared/Services/NotificationsService";



export default function NotificationsPanel({
  t,
  setRefreshChecklogin = () => {},
  reloadNotifications,
}) {
  const notificationsService = useMemo(() => new NotificationsService(), []);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const extractNotifications = (result) => {
    const possibleLists = [
      result?.notifications,
      result?.Notifications,
      result?.data?.notifications,
      result?.data?.Notifications,
      result?.data,
    ];

    const list = possibleLists.find((value) => Array.isArray(value));

    return Array.isArray(list) ? list : [];
  };

  const normalizeNotification = (item, index) => {
    const importance = String(
      getValue(item, ["importance", "Importance"], "low")
    ).toLowerCase();

    const status = String(
      getValue(item, ["status", "Status"], "active")
    ).toLowerCase();

    const descriptionKey = getValue(item, [
      "descriptionKey",
      "DescriptionKey",
    ]);

    const url = getValue(item, ["url", "URL"]);

    return {
      id:
        getValue(item, [
          "id",
          "ID",
          "_id",
          "notificationId",
          "NotificationID",
        ]) || `${descriptionKey || "notification"}-${index}`,
      titleKey:
        getValue(item, ["titleKey", "TitleKey"]) ||
        "notifications.defaultTitle",
      descriptionKey:
        descriptionKey || "notifications.defaultDescription",
      url,
      type:
        getValue(item, ["type", "Type"]) ||
        importance ||
        "general",
      importance,
      status,
      date: getValue(item, [
        "date",
        "Date",
        "createdAt",
        "CreatedAt",
        "created_at",
      ]),
      original: item,
    };
  };

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setLoadError("");

      const result = await notificationsService.getNotifications();

      const normalized = extractNotifications(result)
        .map(normalizeNotification)
        .filter((item) => {
          const status = String(item.status || "").toLowerCase();

          return (
            status === "active" ||
            status === "unread" ||
            status === "pending"
          );
        });

      setNotifications(normalized);
    } catch (error) {
      console.error("Error loading notifications:", error);

      setNotifications([]);
      setLoadError(
        error.message ||
          tr("notifications.errorLoading", "Error loading notifications")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (value) => {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  const handleWatch = (url) => {
    if (!url) return;

    if (url.startsWith("http://") || url.startsWith("https://")) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = url;
  };

  const handleReload = async () => {
    await loadNotifications();

    if (typeof reloadNotifications === "function") {
      reloadNotifications();
    }

    if (typeof setRefreshChecklogin === "function") {
      setRefreshChecklogin((prev) => !prev);
    }
  };

  return (
    <section className="notifications-panel">
      <div className="notifications-panel__header">
        <div>
          <span className="notifications-panel__eyebrow">
            <FaBell />
            {tr("notifications.section", "Notifications")}
          </span>

          <h2>{tr("notifications.title", "Notifications")}</h2>

          <p>
            {tr(
              "notifications.subtitle",
              "Review your pending actions and system alerts."
            )}
          </p>
        </div>

        <span className="notifications-panel__count">
          {notifications.length}
        </span>
      </div>

      <div className="notifications-panel__body">
        {loading ? (
          <div className="notifications-panel__state">
            {tr("common.loading", "Loading...")}
          </div>
        ) : loadError ? (
          <div className="notifications-panel__empty">
            <FaExclamationCircle />
            <h3>{tr("notifications.errorTitle", "Could not load data")}</h3>
            <p>{loadError}</p>

            <button
              type="button"
              className="notifications-panel__button notifications-panel__button--primary"
              onClick={handleReload}
            >
              {tr("notifications.retry", "Retry")}
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-panel__empty">
            <FaBell />
            <h3>{tr("notifications.emptyTitle", "No notifications")}</h3>

            <p>
              {tr(
                "notifications.emptyDescription",
                "You do not have pending notifications at this moment."
              )}
            </p>
          </div>
        ) : (
          notifications.map((notification, index) => (
            <article
              key={notification.id || index}
              className={`notifications-panel__card notifications-panel__card--${notification.importance}`}
            >
              <div className="notifications-panel__card-header">
                <div>
                  <span className="notifications-panel__badge">
                    {tr(
                      `notifications.types.${notification.type || "general"}`,
                      notification.type || "general"
                    )}
                  </span>

                  <h3>
                    {tr(
                      notification.titleKey,
                      tr("notifications.defaultTitle", "Notification")
                    )}
                  </h3>
                </div>

                {notification.date && (
                  <span className="notifications-panel__date">
                    <FaRegClock />
                    {formatDate(notification.date)}
                  </span>
                )}
              </div>

              <p className="notifications-panel__description">
                {tr(
                  notification.descriptionKey,
                  tr(
                    "notifications.defaultDescription",
                    "You have a pending notification."
                  )
                )}
              </p>

              {notification.url && (
                <div className="notifications-panel__link">
                  <FaExternalLinkAlt />
                  <span>{notification.url}</span>
                </div>
              )}

              <div className="notifications-panel__actions">
                <button
                  type="button"
                  className="notifications-panel__button notifications-panel__button--primary"
                  onClick={() => handleWatch(notification.url)}
                  disabled={!notification.url}
                >
                  {tr("notifications.watchAccept", "Review")}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}