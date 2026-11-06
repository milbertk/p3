import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaClock, FaDesktop } from "react-icons/fa";

import SelectPageConfigurationService from "../../../Modules/shao/pageConfiguration/services/SelectPageConfigurationService";
import {
  DEFAULT_TIME_ZONE,
  browserTimeZone,
  formatOffset,
  isValidTimeZone,
  offsetMinutes,
  placeName,
} from "../../Utils/timeZones";

import "./CompanyClock.scss";

// Clock in the top bar (2026-11-04): the current time of the selected
// company (its time zone from the Company page, default Costa Rica) and,
// when this computer is in another zone, the computer's time too.
// The Company page sends this event after saving a new zone, so the clock
// changes at once.
export const COMPANY_TIME_ZONE_EVENT = "companyTimeZoneChanged";

const REFRESH_MS = 15000;
const selectPageConfigurationService = new SelectPageConfigurationService();
// companyId -> { timeZone, label } (kept while the app is open).
const zoneCache = new Map();

function toZone(timeZone, label) {
  return {
    timeZone: isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE,
    label: String(label || "").trim(),
  };
}

// useNow: the current moment, refreshed every 15 seconds.
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function formatTime(date, timeZone, language) {
  try {
    return new Intl.DateTimeFormat(language, { timeZone, hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return "";
  }
}

function formatDay(date, timeZone, language) {
  try {
    return new Intl.DateTimeFormat(language, { timeZone, weekday: "short", day: "numeric", month: "short" }).format(date);
  } catch {
    return "";
  }
}

export default function CompanyClock({ t, companyId }) {
  const { i18n } = useTranslation();
  const language = i18n?.resolvedLanguage || i18n?.language || "en";
  const id = String(companyId || "").trim();
  const [zone, setZone] = useState(() => (id ? zoneCache.get(id) || null : null));
  const now = useNow();

  const text = (key, fallback, options = {}) => {
    try {
      return typeof t === "function" ? t(`header.clock.${key}`, { defaultValue: fallback, ...options }) : fallback;
    } catch {
      return fallback;
    }
  };

  // Load the zone of the selected company (once per company).
  useEffect(() => {
    if (!id) {
      setZone(null);
      return undefined;
    }
    const cached = zoneCache.get(id);
    if (cached) {
      setZone(cached);
      return undefined;
    }
    setZone(null);
    const controller = new AbortController();
    selectPageConfigurationService
      .selectPageConfiguration({ companyId: id, signal: controller.signal })
      .then((result) => {
        const value = toZone(result?.timeZone, result?.timeZoneLabel);
        zoneCache.set(id, value);
        setZone(value);
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        // Not cached: the next company change tries again.
        setZone(toZone(DEFAULT_TIME_ZONE, ""));
      });
    return () => controller.abort();
  }, [id]);

  // A new zone saved in the Company page.
  useEffect(() => {
    const onZoneChanged = (event) => {
      const detail = event?.detail || {};
      const changedId = String(detail.companyId || "").trim();
      if (!changedId) return;
      const value = toZone(detail.timeZone, detail.timeZoneLabel);
      zoneCache.set(changedId, value);
      if (changedId === id) setZone(value);
    };
    window.addEventListener(COMPANY_TIME_ZONE_EVENT, onZoneChanged);
    return () => window.removeEventListener(COMPANY_TIME_ZONE_EVENT, onZoneChanged);
  }, [id]);

  if (!id || !zone) return null;

  const companyOffset = offsetMinutes(zone.timeZone, now);
  const offsetText = formatOffset(companyOffset, { short: true });
  const zoneName = zone.label || placeName(zone.timeZone, language);
  const companyTime = formatTime(now, zone.timeZone, language);
  const companyDay = formatDay(now, zone.timeZone, language);

  const computerZone = browserTimeZone();
  const computerDiffers = isValidTimeZone(computerZone) && offsetMinutes(computerZone, now) !== companyOffset;
  const computerTime = computerDiffers ? formatTime(now, computerZone, language) : "";
  const computerOffset = computerDiffers ? formatOffset(offsetMinutes(computerZone, now), { short: true }) : "";

  const companyTitle = text("companyTitle", "Company time: {{day}} {{time}}, {{zone}} ({{offset}})", {
    day: companyDay,
    time: companyTime,
    zone: zoneName,
    offset: offsetText,
  });
  const computerTitle = computerDiffers
    ? text("computerTitle", "Your computer: {{time}} ({{zone}}, {{offset}})", {
        time: computerTime,
        zone: placeName(computerZone, language),
        offset: computerOffset,
      })
    : text("sameAsComputer", "Same time as your computer");

  return (
    <div className="company-clock" role="timer" aria-live="off" title={`${companyTitle}\n${computerTitle}`}>
      <div className="company-clock__item">
        <FaClock className="company-clock__icon" aria-hidden="true" />
        <span className="company-clock__text">
          <small>
            {zoneName} · {companyDay}
          </small>
          <strong>
            {companyTime} <em>{offsetText}</em>
          </strong>
        </span>
      </div>
      {computerDiffers && (
        <div className="company-clock__item company-clock__item--computer">
          <FaDesktop className="company-clock__icon" aria-hidden="true" />
          <span className="company-clock__text">
            <small>{text("yourComputer", "Your computer")}</small>
            <strong>
              {computerTime} <em>{computerOffset}</em>
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}
