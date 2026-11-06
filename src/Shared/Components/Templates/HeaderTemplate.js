import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FaBell,
  FaUserCircle,
  FaLayerGroup,
  FaBuilding,
  FaHome,
  FaLifeRing,
  FaSearch,
  FaChevronDown,
  FaCheck,
} from "react-icons/fa";

import "./HeaderTemplate.scss";

import BasicModal from "../BasicModal/BasicModal";
import PlatformsContainer from "../../../Modules/MainConfigurations/Components/PlatformsContainer";
import NotificationsPanel from "../../../Modules/userComponents/components/NotificationsPanel";
import UserMainMenu from "../../../Modules/userComponents/components/UserMainMenu";
import SupportRequestForm from "../HeaderTools/SupportRequestForm";
import AiAssistantChat from "../HeaderTools/AiAssistantChat";
// Company time + this computer's time in the top bar (2026-11-04).
import CompanyClock from "../HeaderTools/CompanyClock";
import BrandLogo from "../Brand/BrandLogo";
import { useCurrentUser, currentUserLabel } from "../../Utils/CurrentUserContext";

import NotificationsService from "../../Services/NotificationsService";
import MyCompaniesService from "../../Services/MyCompaniesService";
// Adjust this path to wherever you saved the service.


const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

/**
 * Reads a value using any of the possible backend property names.
 */
function getValue(object, keys, fallback = "") {
  for (const key of keys) {
    if (
      object?.[key] !== undefined &&
      object?.[key] !== null
    ) {
      return object[key];
    }
  }

  return fallback;
}

/**
 * Normalizes backend company data to one predictable structure.
 *
 * The backend now returns only these fields:
 *   companyId, companyName, userId, kind
 */
function normalizeCompany(company) {
  const companyId = getValue(company, [
    "companyId",
    "company_id",
    "CompanyID",
    "CompanyId",
    "id",
    "ID",
  ]);

  const companyName = getValue(company, [
    "companyName",
    "company_name",
    "CompanyName",
    "name",
    "Name",
  ]);

  const userId = getValue(company, [
    "userId",
    "user_id",
    "UserID",
    "UserId",
    "uid",
    "Uid",
    "UID",
  ]);

  const kind = getValue(company, ["kind", "Kind"]);

  return {
    id: String(companyId || ""),
    name: String(companyName || ""),
    userId: String(userId || ""),
    kind: String(kind || ""),
    original: company,
  };
}

/**
 * Reads the selected company from localStorage.
 *
 * Only the company ID and company name are persisted.
 */
function readStoredCompany() {
  try {
    const rawValue = localStorage.getItem(
      SELECTED_COMPANY_STORAGE_KEY
    );

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    const companyId =
      parsedValue?.companyId ||
      parsedValue?.id ||
      "";

    const companyName =
      parsedValue?.companyName ||
      parsedValue?.name ||
      "";

    if (!companyId || !companyName) {
      localStorage.removeItem(
        SELECTED_COMPANY_STORAGE_KEY
      );

      return null;
    }

    return {
      id: String(companyId),
      name: String(companyName),
      userId: "",
      kind: "",
      original: null,
      restoredFromStorage: true,
    };
  } catch (error) {
    console.error(
      "Error reading selected company from localStorage:",
      error
    );

    localStorage.removeItem(
      SELECTED_COMPANY_STORAGE_KEY
    );

    return null;
  }
}

/**
 * Stores only the required company information.
 */
function saveStoredCompany(company) {
  if (!company?.id || !company?.name) {
    return;
  }

  const storageValue = {
    companyId: String(company.id),
    companyName: String(company.name),
  };

  localStorage.setItem(
    SELECTED_COMPANY_STORAGE_KEY,
    JSON.stringify(storageValue)
   
  );

  /*
   * Other components can listen for this event when they need
   * to react immediately to a company change.
   */
  window.dispatchEvent(
    new CustomEvent("selectedCompanyChanged", {
      detail: storageValue,
    })
  );
}

export default function HeaderTemplate({
  t,
  setRefreshChecklogin = () => {},
  onCompanySelect = () => {},
  onNotificationsClick = () => {},
  onPlatformClick = () => {},
  onUserMenuClick = () => {},
}) {
  const notificationsService = useMemo(
    () => new NotificationsService(),
    []
  );

  const companyService = useMemo(
    () => new MyCompaniesService(),
    []
  );

  const companyRequestIdRef = useRef(0);

  /*
   * Keep the latest prop callbacks in refs so the memoized
   * functions below can stay stable across renders.
   *
   * This is what prevents the infinite reload / blinking loop:
   * `onCompanySelect` and `t` arrive as brand-new function
   * objects on every render (default props / inline funcs),
   * so depending on their identity would rebuild loadCompanies
   * every render and re-fire effects endlessly.
   */
  const onCompanySelectRef = useRef(onCompanySelect);
  const tRef = useRef(t);

  useEffect(() => {
    onCompanySelectRef.current = onCompanySelect;
    tRef.current = t;
  });

  const [showCompanies, setShowCompanies] =
    useState(false);

  const [showPlatforms, setShowPlatforms] =
    useState(false);

  const [
    showNotifications,
    setShowNotifications,
  ] = useState(false);

  const [showUserMenu, setShowUserMenu] =
    useState(false);

  const [showSupport, setShowSupport] =
    useState(false);

  const [showAssistant, setShowAssistant] =
    useState(false);

  const [selectedCompany, setSelectedCompany] =
    useState(() => readStoredCompany());

  const [companySearch, setCompanySearch] =
    useState("");

  const [companies, setCompanies] = useState([]);
  const [loadingCompanies, setLoadingCompanies] =
    useState(false);

  const [companiesError, setCompaniesError] =
    useState("");

  const [notifications, setNotifications] =
    useState([]);

  const [
    loadingNotifications,
    setLoadingNotifications,
  ] = useState(false);

  const [
    notificationsError,
    setNotificationsError,
  ] = useState("");

  /*
   * Stable translator: reads `t` from a ref instead of closing
   * over the prop, so its identity never changes.
   */
  const tr = useCallback((key, fallback) => {
    try {
      const translate = tRef.current;

      return typeof translate === "function"
        ? translate(key) || fallback
        : fallback;
    } catch {
      return fallback;
    }
  }, []);

  const closeAllMenus = () => {
    setShowCompanies(false);
    setShowPlatforms(false);
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  const extractCompanies = (result) => {
    const possibleLists = [
      result?.companies,
      result?.Companies,
      result?.data?.companies,
      result?.data?.Companies,
      result?.data,
      result,
    ];

    const list = possibleLists.find((value) =>
      Array.isArray(value)
    );

    return Array.isArray(list) ? list : [];
  };

  /*
   * Stable notifier: reads onCompanySelect from a ref so its
   * identity stays constant regardless of parent re-renders.
   */
  const notifyCompanySelection = useCallback(
    (company) => {
      try {
        onCompanySelectRef.current?.(
          company?.original || company
        );
      } catch (error) {
        console.error(
          "Error executing onCompanySelect:",
          error
        );
      }
    },
    []
  );

  const applySelectedCompany = useCallback(
    (
      company,
      {
        persist = true,
        notify = true,
      } = {}
    ) => {
      if (!company?.id || !company?.name) {
        return;
      }

      setSelectedCompany(company);

      if (persist) {
        saveStoredCompany(company);
        setRefreshChecklogin(true)
      }

      if (notify) {
        notifyCompanySelection(company);
      }
    },
    [notifyCompanySelection]
  );

  /**
   * Loads the current user's companies from the backend.
   *
   * The `/companiesmy` endpoint returns every company for the
   * logged-in user and takes no search parameter, so searching
   * is handled on the client (see `filteredCompanies` below).
   */
  const loadCompanies = useCallback(
    async ({ initialLoad = false } = {}) => {
      const requestId =
        ++companyRequestIdRef.current;

      try {
        setLoadingCompanies(true);
        setCompaniesError("");

        const result =
          await companyService.getMyCompanies();

        /*
         * Ignore an older response if a newer request has
         * already been started.
         */
        if (
          requestId !== companyRequestIdRef.current
        ) {
          return;
        }

        const normalizedCompanies =
          extractCompanies(result)
            .map(normalizeCompany)
            .filter(
              (company) =>
                company.id && company.name
            );

        setCompanies(normalizedCompanies);

        if (!initialLoad) {
          return;
        }

        const storedCompany = readStoredCompany();

        /*
         * If localStorage contains a company, validate that
         * it still belongs to the returned company list.
         */
        if (storedCompany) {
          const currentCompany =
            normalizedCompanies.find(
              (company) =>
                String(company.id) ===
                String(storedCompany.id)
            );

          if (currentCompany) {
            applySelectedCompany(currentCompany, {
              persist: true,
              notify: true,
            });

            return;
          }

          /*
           * Stored company is no longer available to the user.
           */
          localStorage.removeItem(
            SELECTED_COMPANY_STORAGE_KEY
          );

          setSelectedCompany(null);
        }

        /*
         * Automatically select the company when the user has
         * exactly one company.
         */
        if (normalizedCompanies.length === 1) {
          applySelectedCompany(
            normalizedCompanies[0],
            {
              persist: true,
              notify: true,
            }
          );
        }
      } catch (error) {
        if (
          requestId !== companyRequestIdRef.current
        ) {
          return;
        }

        console.error(
          "Error loading companies:",
          error
        );

        setCompanies([]);

        setCompaniesError(
          error?.message ||
            tr(
              "header.companiesLoadError",
              "Error loading companies."
            )
        );
      } finally {
        if (
          requestId === companyRequestIdRef.current
        ) {
          setLoadingCompanies(false);
        }
      }
    },
    [
      applySelectedCompany,
      companyService,
      tr,
    ]
  );

  /**
   * Initial company load.
   */
  useEffect(() => {
    loadCompanies({ initialLoad: true });
  }, [loadCompanies]);

  /**
   * Client-side search over the companies already loaded.
   */
  const filteredCompanies = useMemo(() => {
    const term = companySearch.trim().toLowerCase();

    if (!term) {
      return companies;
    }

    return companies.filter((company) => {
      return (
        company.name.toLowerCase().includes(term) ||
        company.id.toLowerCase().includes(term) ||
        company.kind.toLowerCase().includes(term)
      );
    });
  }, [companies, companySearch]);

  const extractNotifications = (result) => {
    const possibleLists = [
      result?.notifications,
      result?.Notifications,
      result?.data?.notifications,
      result?.data?.Notifications,
      result?.data,
    ];

    const list = possibleLists.find((value) =>
      Array.isArray(value)
    );

    return Array.isArray(list) ? list : [];
  };

  const normalizeNotification = (
    item,
    index
  ) => ({
    id:
      item?.id ||
      item?.notificationId ||
      item?.NotificationID ||
      `${
        item?.descriptionKey ||
        "notification"
      }-${index}`,

    importance: String(
      item?.importance ||
        item?.Importance ||
        "low"
    ).toLowerCase(),

    descriptionKey:
      item?.descriptionKey ||
      item?.DescriptionKey ||
      "",

    url: item?.url || item?.URL || "",

    status: String(
      item?.status ||
        item?.Status ||
        "active"
    ).toLowerCase(),

    original: item,
  });

  const loadNotifications = useCallback(
    async () => {
      try {
        setLoadingNotifications(true);
        setNotificationsError("");

        const result =
          await notificationsService.getNotifications();

        const normalized =
          extractNotifications(result)
            .map(normalizeNotification)
            .filter(
              (item) =>
                item.status !== "resolved"
            );

        setNotifications(normalized);
      } catch (error) {
        console.error(
          "Error loading notifications:",
          error
        );

        setNotifications([]);

        setNotificationsError(
          error?.message ||
            tr(
              "header.notificationsError",
              "Error loading notifications"
            )
        );
      } finally {
        setLoadingNotifications(false);
      }
    },
    [notificationsService, tr]
  );

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const activeNotifications = useMemo(() => {
    return notifications.filter((item) => {
      const status = String(
        item.status || ""
      ).toLowerCase();

      return (
        status === "active" ||
        status === "unread" ||
        status === "pending"
      );
    });
  }, [notifications]);

  const notificationCount =
    activeNotifications.length;

  const hasNotifications =
    notificationCount > 0;

  const getNotificationTitle = () => {
    if (loadingNotifications) {
      return tr(
        "header.loadingNotifications",
        "Loading notifications..."
      );
    }

    if (notificationsError) {
      return tr(
        "header.notificationsError",
        "Error loading notifications"
      );
    }

    if (hasNotifications) {
      return `${notificationCount} ${tr(
        "header.pendingNotifications",
        "pending notification(s)"
      )}`;
    }

    return tr(
      "header.notifications",
      "Notifications"
    );
  };

  const handleCompanyButtonClick = () => {
    closeAllMenus();
    setCompanySearch("");
    setShowCompanies(true);

    /*
     * Reload the company list whenever the modal opens.
     */
    loadCompanies({ initialLoad: false });
  };

  const handleCompanySelect = (company) => {
    applySelectedCompany(company, {
      persist: true,
      notify: true,
    });

    setCompanySearch("");
    setShowCompanies(false);
  };

  const handleCompanySearchKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
  };

  const handleNotificationsClick = () => {
    closeAllMenus();
    setShowNotifications(true);

    onNotificationsClick();
    loadNotifications();
  };

  const handlePlatformClick = () => {
    closeAllMenus();
    setShowPlatforms(true);

    onPlatformClick();
  };

  const currentUser = useCurrentUser();

  const handleUserMenuClick = () => {
    closeAllMenus();
    setShowUserMenu(true);

    onUserMenuClick();

    setRefreshChecklogin(
      (previous) => !previous
    );
  };

  const handleCloseNotifications = (
    value
  ) => {
    setShowNotifications(value);

    if (!value) {
      loadNotifications();
    }
  };

  // AlephTelos = the /shao area (2026-10-25).
  const isTelosArea = String(
    (typeof window !== "undefined" && window.location.pathname) || ""
  ).toLowerCase().startsWith("/shao");

  const displayedCompanyName =
    selectedCompany?.name ||
    tr(
      "header.selectCompany",
      "Select company"
    );

  return (
    <header className="header-template">
      <div className="header-left">
        {/* AlephK brand (2026-10-25): AlephTelos inside /shao, AlephK elsewhere. */}
        <a
          href={isTelosArea ? "/shao" : "/"}
          className="header-brand"
          title={isTelosArea ? "AlephTelos" : "AlephK"}
        >
          <BrandLogo variant={isTelosArea ? "telos" : "alephk"} compact />
        </a>
        <span className="header-brand-divider" aria-hidden="true" />

        <div
          className="company-logo"
          title={tr(
            "header.companyLogo",
            "Company"
          )}
        >
          <FaBuilding />
        </div>

        <button
          className={`company-selector-button ${
            selectedCompany
              ? "company-selector-button--selected"
              : "company-selector-button--empty"
          }`}
          type="button"
          onClick={handleCompanyButtonClick}
          title={tr(
            "header.selectCompany",
            "Select company"
          )}
          aria-label={tr(
            "header.selectCompany",
            "Select company"
          )}
        >
          <span className="company-selector-button__content">
            <span className="company-selector-button__label">
              {selectedCompany
                ? tr(
                    "header.currentCompany",
                    "Current company"
                  )
                : tr(
                    "header.selectCompany",
                    "Select company"
                  )}
            </span>

            <span className="company-selector-button__name">
              {displayedCompanyName}
            </span>
          </span>

          <FaChevronDown className="company-selector-button__arrow" />
        </button>
      </div>

      <nav className="header-center">
        <a href="/" className="header-link">
          <FaHome />

          <span>
            {tr("header.home", "Home")}
          </span>
        </a>

        <button
          className="header-future-link"
          type="button"
          onClick={() => setShowSupport(true)}
        >
          <FaLifeRing />

          <span>
            {tr(
              "header.support",
              "Support"
            )}
          </span>
        </button>

        <button
          className={`header-future-link${
            showAssistant ? " header-future-link--active" : ""
          }`}
          type="button"
          onClick={() => setShowAssistant((current) => !current)}
          aria-expanded={showAssistant}
        >
          <FaSearch />

          <span>
            {tr(
              "header.searchAi",
              "AI search"
            )}
          </span>
        </button>
      </nav>

      <div className="header-right">
        {/* Clock (2026-11-04): time of the selected company (its zone in the
            Company page) and of this computer when it is in another zone. */}
        <CompanyClock t={t} companyId={selectedCompany?.id} />

        <button
          className={`header-icon-button notification-button ${
            hasNotifications
              ? "notification-button--active"
              : ""
          }`}
          type="button"
          onClick={
            handleNotificationsClick
          }
          title={getNotificationTitle()}
          aria-label={getNotificationTitle()}
        >
          <FaBell />

          {hasNotifications && (
            <>
              <span className="notification-dot" />

              <span className="notification-count">
                {notificationCount > 9
                  ? "9+"
                  : notificationCount}
              </span>
            </>
          )}
        </button>

        <button
          className="header-icon-button"
          type="button"
          onClick={handlePlatformClick}
          title={tr(
            "header.selectPlatform",
            "Select platform"
          )}
          aria-label={tr(
            "header.selectPlatform",
            "Select platform"
          )}
        >
          <FaLayerGroup />
        </button>

        {/* Who is signed in (QA 2026-10-29); hidden on small screens. */}
        {currentUserLabel(currentUser) && (
          <button
            type="button"
            className="header-user-tag"
            onClick={handleUserMenuClick}
            title={currentUser?.email || ""}
          >
            <small>{tr("header.signedInAs", "Signed in as")}</small>
            <span>{currentUserLabel(currentUser)}</span>
          </button>
        )}

        <button
          className="header-icon-button user"
          type="button"
          onClick={handleUserMenuClick}
          title={tr(
            "header.userMenu",
            "User menu"
          )}
          aria-label={tr(
            "header.userMenu",
            "User menu"
          )}
        >
          <FaUserCircle />
        </button>
      </div>

      <BasicModal
        show={showCompanies}
        setShow={setShowCompanies}
        name=""
      >
        <section className="company-selector-modal">
          <div className="company-selector-modal__header">
            <div>
              <span className="company-selector-modal__eyebrow">
                {tr(
                  "header.companySelection",
                  "Company selection"
                )}
              </span>

              <h2>
                {tr(
                  "header.selectCompany",
                  "Select company"
                )}
              </h2>

              <p>
                {tr(
                  "header.selectManagedCompany",
                  "Select one of the companies available to your user."
                )}
              </p>
            </div>

            <span className="company-selector-modal__count">
              {filteredCompanies.length}
            </span>
          </div>

          <div className="company-selector-modal__search">
            <FaSearch />

            <input
              type="search"
              value={companySearch}
              onChange={(event) =>
                setCompanySearch(
                  event.target.value
                )
              }
              onKeyDown={
                handleCompanySearchKeyDown
              }
              placeholder={tr(
                "header.searchCompany",
                "Search company"
              )}
              aria-label={tr(
                "header.searchCompany",
                "Search company"
              )}
              disabled={loadingCompanies}
            />
          </div>

          <div className="company-selector-modal__list">
            {loadingCompanies && (
              <div className="company-selector-modal__empty">
                <FaBuilding />

                <strong>
                  {tr(
                    "header.loadingCompanies",
                    "Loading companies..."
                  )}
                </strong>
              </div>
            )}

            {!loadingCompanies &&
              companiesError && (
                <div className="company-selector-modal__empty">
                  <FaBuilding />

                  <strong>
                    {tr(
                      "header.companiesLoadError",
                      "Error loading companies"
                    )}
                  </strong>

                  <span>
                    {companiesError}
                  </span>
                </div>
              )}

            {!loadingCompanies &&
              !companiesError &&
              filteredCompanies.map((company) => {
                const isSelected =
                  String(
                    selectedCompany?.id || ""
                  ) ===
                  String(company.id);

                return (
                  <button
                    key={company.id}
                    type="button"
                    className={`company-selector-item ${
                      isSelected
                        ? "company-selector-item--selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleCompanySelect(
                        company
                      )
                    }
                  >
                    <span className="company-selector-item__icon">
                      <FaBuilding />
                    </span>

                    <span className="company-selector-item__information">
                      <span className="company-selector-item__top">
                        <strong>
                          {company.name}
                        </strong>

                        {company.kind && (
                          <span className="company-selector-item__role">
                            {company.kind}
                          </span>
                        )}
                      </span>
                    </span>

                    <span className="company-selector-item__selection">
                      {isSelected && (
                        <FaCheck />
                      )}
                    </span>
                  </button>
                );
              })}

            {!loadingCompanies &&
              !companiesError &&
              filteredCompanies.length === 0 && (
                <div className="company-selector-modal__empty">
                  <FaBuilding />

                  <strong>
                    {tr(
                      "header.noCompaniesFound",
                      "No companies found"
                    )}
                  </strong>

                  <span>
                    {tr(
                      "header.changeSearch",
                      "Try another search."
                    )}
                  </span>
                </div>
              )}
          </div>
        </section>
      </BasicModal>

      <BasicModal
        show={showPlatforms}
        setShow={setShowPlatforms}
        name=""
      >
        <PlatformsContainer
          t={t}
          setRefreshChecklogin={
            setRefreshChecklogin
          }
        />
      </BasicModal>

      <BasicModal
        show={showNotifications}
        setShow={
          handleCloseNotifications
        }
        name=""
      >
        <NotificationsPanel
          t={t}
          setRefreshChecklogin={
            setRefreshChecklogin
          }
          notifications={notifications}
          reloadNotifications={
            loadNotifications
          }
        />
      </BasicModal>

      <BasicModal
        show={showUserMenu}
        setShow={setShowUserMenu}
        name=""
      >
        <UserMainMenu
          t={t}
          setRefreshChecklogin={
            setRefreshChecklogin
          }
        />
      </BasicModal>

      <BasicModal
        show={showSupport}
        setShow={setShowSupport}
        name=""
      >
        <SupportRequestForm
          t={t}
          onClose={() => setShowSupport(false)}
        />
      </BasicModal>

      {showAssistant && (
        <AiAssistantChat
          t={t}
          onClose={() => setShowAssistant(false)}
        />
      )}
    </header>
  );
}