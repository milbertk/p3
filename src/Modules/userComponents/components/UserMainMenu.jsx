import React from "react";
import { Container } from "react-bootstrap";
import {
  FaUser,
  FaShieldAlt,
  FaKey,
  FaEnvelope,
  FaExchangeAlt,
  FaSignOutAlt,
  FaChevronRight,
} from "react-icons/fa";

import { FaSun, FaMoon, FaDesktop } from "react-icons/fa";

import "./UserMainMenu.scss";
import LogoutService from "../../Auth/Services/LogoutService";
import useTheme from "../../../Shared/Hooks/useTheme";
import { useCurrentUser } from "../../../Shared/Utils/CurrentUserContext";

// Appearance options (2026-10-24): saved per browser.
const THEME_CHOICES = [
  { value: "light", icon: <FaSun />, labelKey: "userMenu.appearance.light", fallback: "Light" },
  { value: "dark", icon: <FaMoon />, labelKey: "userMenu.appearance.dark", fallback: "Dark" },
  { value: "system", icon: <FaDesktop />, labelKey: "userMenu.appearance.system", fallback: "Same as my device" },
];

export default function UserMainMenu(props) {
  const { t, setRefreshChecklogin } = props;

  const logoutService = new LogoutService();
  const { preference, setPreference } = useTheme();
  const currentUser = useCurrentUser();
  const tr = (key, fallback) => {
    const value = typeof t === "function" ? t(key) : "";
    return value && value !== key ? value : fallback;
  };

  const menuItems = [
    {
      key: "profile",
      label: t("userMenu.profile"),
      href: "./profile",
      icon: <FaUser />,
    },
    {
      key: "security",
      label: t("userMenu.security"),
      href: "./security",
      icon: <FaShieldAlt />,
    },
    {
      key: "changePassword",
      label: t("userMenu.changePassword"),
      href: "./changepass",
      icon: <FaKey />,
    },
    {
      key: "changeEmail",
      label: t("userMenu.changeEmail"),
      href: "./changeemail",
      icon: <FaEnvelope />,
    },
    {
      key: "transferAccount",
      label: t("userMenu.transferAccount"),
      href: "./transferaccount",
      icon: <FaExchangeAlt />,
    },
  ];

  const exit = async () => {
    try {
      const result = await logoutService.logout();

      console.log("Logout successful:", result);

      if (setRefreshChecklogin) {
        setRefreshChecklogin((prev) => !prev);
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Container className="user-main-menu">
      <section className="user-main-menu__card">
        <div className="user-main-menu__header">
          <div>
            <span className="user-main-menu__eyebrow">
              {t("userMenu.section")}
            </span>

            <h2>{t("userMenu.title")}</h2>

            <p>{t("userMenu.subtitle")}</p>
          </div>
        </div>

        {/* Who is signed in (QA 2026-10-29) */}
        {currentUser && (currentUser.name || currentUser.email) && (
          <div className="user-main-menu__signed-in">
            <small>{tr("userMenu.signedInAs", "Signed in as")}</small>
            {currentUser.name && <strong>{currentUser.name}</strong>}
            {currentUser.email && <span>{currentUser.email}</span>}
          </div>
        )}

        <section className="user-main-menu__appearance" aria-labelledby="user-menu-appearance-title">
          <h3 id="user-menu-appearance-title">{tr("userMenu.appearance.title", "Appearance")}</h3>
          <div className="user-main-menu__theme-options" role="radiogroup" aria-labelledby="user-menu-appearance-title">
            {THEME_CHOICES.map((choice) => (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={preference === choice.value}
                className={`user-main-menu__theme-option ${preference === choice.value ? "is-active" : ""}`}
                onClick={() => setPreference(choice.value)}
              >
                {choice.icon}
                <span>{tr(choice.labelKey, choice.fallback)}</span>
              </button>
            ))}
          </div>
        </section>

        <nav
          className="user-main-menu__list"
          aria-label={t("userMenu.navigationLabel")}
        >
          {menuItems.map((item) => (
            <a
              key={item.key}
              className="user-main-menu__item"
              href={item.href}
            >
              <span className="user-main-menu__item-icon">
                {item.icon}
              </span>

              <span className="user-main-menu__item-label">
                {item.label}
              </span>

              <span className="user-main-menu__item-chevron">
                <FaChevronRight />
              </span>
            </a>
          ))}

          <button
            type="button"
            className="user-main-menu__item user-main-menu__item--logout"
            onClick={exit}
          >
            <span className="user-main-menu__item-icon">
              <FaSignOutAlt />
            </span>

            <span className="user-main-menu__item-label">
              {t("userMenu.logout")}
            </span>

            <span className="user-main-menu__item-chevron">
              <FaChevronRight />
            </span>
          </button>
        </nav>
      </section>
    </Container>
  );
}
