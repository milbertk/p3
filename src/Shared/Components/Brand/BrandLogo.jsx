// AlephK brand (2026-10-25).
// Family: Kuantum K (legal company) · AlephK (brand) · AlephTelos (the system
// under /shao, before "Service Hub") · Aleph (the assistant) · AK (the icon).
// Colors: navy #14243B, teal #00B8A9 — used only as small accents.
import { useTranslation } from "react-i18next";
import "./Brand.scss";
import { LEGAL, legalNotice } from "../../Utils/authProviders";

export const BRAND = {
  legalName: "Kuantum K",
  brand: "AlephK",
  system: "AlephTelos",
  assistant: "Aleph",
};

/** The AK icon (vector, same shapes as the official logo). */
export function AKMark({ className = "", title = "AlephK", ...rest }) {
  return (
    <svg
      className={`ak-mark ${className}`.trim()}
      viewBox="0 0 516 264"
      role="img"
      aria-label={title}
      {...rest}
    >
      <path fill="#14243B" d="M2 262 L192 2 L329 262 L283 262 L193 96 L126 191 L202 191 L238 262 Z" />
      <path fill="#00B8A9" d="M197 2 L240 2 L377 262 L334 262 Z" />
      <path fill="#00B8A9" d="M413 1 L513 1 L372 129 L506 262 L397 262 L312 106 Z" />
    </svg>
  );
}

/**
 * Logo with name.
 *  variant "alephk": AK + AlephK
 *  variant "telos":  AK + AlephK with "AlephTelos" under it (the /shao system)
 *  compact: hides the name on small screens (header).
 */
export default function BrandLogo({ variant = "alephk", compact = false, className = "" }) {
  const isTelos = variant === "telos";
  return (
    <span
      className={`ak-brand ${isTelos ? "ak-brand--telos" : ""} ${compact ? "ak-brand--compact" : ""} ${className}`.trim()}
      aria-label={isTelos ? BRAND.system : BRAND.brand}
    >
      <AKMark className="ak-brand__mark" aria-hidden="true" />
      <span className="ak-brand__text" aria-hidden="true">
        <span className="ak-brand__name">
          Aleph<span className="ak-brand__k">K</span>
        </span>
        {/* Under the AlephK logo only "Telos" (QA 2026-10-29): Telos is a segment of AlephK. */}
        {isTelos && <span className="ak-brand__telos">Telos</span>}
      </span>
    </span>
  );
}

/**
 * Small block at the bottom of every page: "Powered by Kuantum K" plus the legal
 * legend (2026-10-26): AlephK and Kuantum K are brands of the registered company,
 * with its cédula jurídica. The whole block links to the Kuantum K site.
 */
export function PoweredBy({ label = "Powered by", className = "" }) {
  const { i18n } = useTranslation();
  const lang = i18n?.language || "es";
  return (
    <div className={`ak-powered ${className}`.trim()}>
      <a
        className="ak-powered__link"
        href={LEGAL.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>
          {label} <strong>{BRAND.legalName}</strong>
        </span>
        <small className="ak-powered__legal">{legalNotice(lang)}</small>
      </a>
    </div>
  );
}
