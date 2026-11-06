import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import { FaHome, FaCubes } from "react-icons/fa";
import { FaPerson, FaUserClock } from "react-icons/fa6";
import {
  TbCategoryPlus,
  TbReport,
  TbTrack,
} from "react-icons/tb";
import { RiCustomerServiceLine } from "react-icons/ri";
import {
  LuCalendar,
  LuCalendarCheck,
  LuCheck,
  LuDatabase,
  LuListChecks,
  LuUserCheck,
  LuPalette,
  LuExternalLink,
} from "react-icons/lu";

import "./maintemplateshao.scss";
import SideBarTemplate from "../../../../Shared/Components/Templates/SideBarTemplate";
import HeaderTemplate from "../../../../Shared/Components/Templates/HeaderTemplate";
import MenuAccessService from "./Menuaccessservice";
import { Showcaselink } from "../../../../Shared/Utils/globalVar";
import ReadOnlyBanner from "../../../../Shared/Components/Plans/ReadOnlyBanner";
import { PoweredBy } from "../../../../Shared/Components/Brand/BrandLogo";
// Adjust the path/casing to wherever you save the service.


// Same key the HeaderTemplate uses to persist the selected company.
const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

// Roles that always see every option, regardless of individual permissions.
const FULL_ACCESS_ROLES = ["OWNER", "MANAGER"];

const menuAccessService = new MenuAccessService();

// Menu options. `key` IS the permission code stored in the database
// (tbl_company_user_permission.permission_code), so the sidebar and the
// stored permissions match by the exact same standard key.
// `group` puts the option under a section title (see MENU_GROUPS). The old
// paths still work: routing.js redirects them to the new ones.
const MENU_ITEMS = [
  {
    key: "NAV_HOME_ACCESS",
    icon: <FaHome />,
    labelKey: "sidebar.home",
    path: "/shao",
  },
  // ---- Sell ----
  {
    key: "NAV_PRODUCTS_ACCESS",
    group: "sell",
    icon: <FaCubes />,
    labelKey: "sidebar.products",
    path: "/shao/products",
  },
  {
    key: "NAV_CATEGORIES_ACCESS",
    group: "sell",
    icon: <TbCategoryPlus />,
    labelKey: "sidebar.category",
    path: "/shao/categories",
  },
  {
    key: "NAV_APPROVAL_A_ACCESS",
    group: "sell",
    icon: <LuCheck />,
    labelKey: "sidebar.aprovala",
    path: "/shao/web-orders",
  },
  {
    key: "NAV_ORDER_CREATE_ACCESS",
    group: "sell",
    icon: <RiCustomerServiceLine />,
    labelKey: "sidebar.order",
    path: "/shao/orders",
  },
  {
    key: "NAV_ORDER_TRACKING_ACCESS",
    group: "sell",
    icon: <LuListChecks />,
    labelKey: "sidebar.trackingord",
    path: "/shao/order-tracking",
  },
  {
    key: "NAV_TRACKING_MAINTENANCE_ACCESS",
    group: "sell",
    icon: <TbTrack />,
    labelKey: "sidebar.trackingm",
    path: "/shao/order-stages",
  },
  // ---- Bookings ----
  {
    key: "NAV_BOOKING_ACCESS",
    group: "bookings",
    icon: <LuCalendar />,
    labelKey: "sidebar.booking",
    path: "/shao/booking-schedules",
  },
  {
    key: "NAV_APPROVAL_B_ACCESS",
    group: "bookings",
    icon: <LuDatabase />,
    labelKey: "sidebar.aprovalb",
    path: "/shao/booking-requests",
  },
  {
    key: "NAV_APPOINTMENTS_ACCESS",
    group: "bookings",
    icon: <LuCalendarCheck />,
    labelKey: "sidebar.appointments",
    path: "/shao/appointments",
  },
  {
    key: "NAV_SELF_BOOKING",
    group: "bookings",
    icon: <FaUserClock />,
    labelKey: "sidebar.selfbooking",
    path: "/shao/book-for-customer",
  },
  // ---- Customers ----
  {
    key: "NAV_CUSTOMERS_ACCESS",
    group: "customers",
    icon: <FaPerson />,
    labelKey: "sidebar.customers",
    path: "/shao/customers",
  },
  // ---- My store ----
  {
    key: "NAV_PAGE_CONFIGURATION_ACCESS",
    group: "myStore",
    icon: <LuPalette />,
    labelKey: "sidebar.pageConfiguration",
    path: "/shao/page-configuration",
  },
  {
    // Opens the public store in a new tab (same permission as the page).
    key: "NAV_PAGE_CONFIGURATION_ACCESS",
    id: "VIEW_MY_STORE",
    group: "myStore",
    icon: <LuExternalLink />,
    labelKey: "sidebar.viewStore",
    external: "store",
  },
  // ---- Reports ----
  {
    key: "NAV_REPORTS_ACCESS",
    group: "reports",
    icon: <TbReport />,
    labelKey: "sidebar.reports",
    path: "/shao/reports",
  },
  // ---- Team ----
  {
    key: "NAV_COMPANY_USERS_ACCESS",
    group: "team",
    icon: <LuUserCheck />,
    labelKey: "sidebar.usersbcompany",
    path: "/shao/team",
  },
];

// Section titles, in menu order.
const MENU_GROUPS = {
  sell: "sidebar.groups.sell",
  bookings: "sidebar.groups.bookings",
  customers: "sidebar.groups.customers",
  myStore: "sidebar.groups.myStore",
  reports: "sidebar.groups.reports",
  team: "sidebar.groups.team",
};

// Public store link of a company: {Showcaselink}/{companyId}
// (same link as the "Showcase link" button on the start page).
function storeUrl(companyId) {
  if (!companyId) return "";
  return `${String(Showcaselink || "").replace(/\/$/, "")}/${encodeURIComponent(companyId)}`;
}

function readSelectedCompanyId() {
  try {
    const raw = localStorage.getItem(
      SELECTED_COMPANY_STORAGE_KEY,
    );
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    return String(
      parsed?.companyId || parsed?.id || "",
    ).trim();
  } catch {
    return "";
  }
}

export default function MainTemplateShao(props) {
  const {
    t,
    setRefreshChecklogin,
    children,
    companyName,
  } = props;

  const [role, setRole] = useState("");
  const [permissions, setPermissions] = useState(
    () => new Set(),
  );
  const [loadingAccess, setLoadingAccess] =
    useState(true);

  // Load the current user's role + permissions for the selected company.
  // Reloads automatically when the company changes (HeaderTemplate dispatches
  // the "selectedCompanyChanged" event when the user switches companies).
  useEffect(() => {
    let active = true;

    const loadAccess = () => {
      const companyId = readSelectedCompanyId();

      if (!companyId) {
        setRole("");
        setPermissions(new Set());
        setLoadingAccess(false);
        return;
      }

      setLoadingAccess(true);

      menuAccessService
        .getMyMenuAccess({ companyId })
        .then((access) => {
          if (!active) return;
          setRole(
            String(
              access?.role || "",
            ).toUpperCase(),
          );
          //alert(role)
          setPermissions(
            new Set(access?.permissions || []),
          );
        })
        .catch(() => {
          if (!active) return;
          // On failure, grant nothing (fail closed).
          setRole("");
          setPermissions(new Set());
        })
        .finally(() => {
          if (active) setLoadingAccess(false);
        });
    };

    loadAccess();
    window.addEventListener(
      "selectedCompanyChanged",
      loadAccess,
    );

    return () => {
      active = false;
      window.removeEventListener(
        "selectedCompanyChanged",
        loadAccess,
      );
    };
  }, []);

  // OWNER/MANAGER see everything; other roles only what they were given.
  const hasFullAccess = FULL_ACCESS_ROLES.includes(role);

  // OWNER/MANAGER -> every option enabled.
  // Any other role -> only the options whose key is in their permissions.
  const menuItems = useMemo(() => {
    const companyId = readSelectedCompanyId();
    return MENU_ITEMS.map((item) => ({
      key: item.id || item.key,
      icon: item.icon,
      label: t(item.labelKey),
      path: item.path,
      externalUrl: item.external === "store" ? storeUrl(companyId) : "",
      group: item.group || "",
      groupLabel: item.group ? t(MENU_GROUPS[item.group]) : "",
      // Home is open to every member of the company.
      enable:
        (item.key === "NAV_HOME_ACCESS" ||
          hasFullAccess ||
          permissions.has(item.key)) &&
        (item.external !== "store" || Boolean(companyId)),
    }));
  }, [hasFullAccess, permissions, t]);

  const handleSidebarClick = (item) => {
    console.log("Selected item:", item);

    // Future:
    // navigate(item.path);
  };

  return (
    <div className="main-template">
      <HeaderTemplate
        t={t}
        setRefreshChecklogin={setRefreshChecklogin}
        companyName={companyName}
      />

      <SideBarTemplate
        t={t}
        setRefreshChecklogin={setRefreshChecklogin}
        items={menuItems}
        onItemClick={handleSidebarClick}
        loading={loadingAccess}
      />

      <main className="main-template-content">
        {/* No active plan -> read-only notice (2026-10-23). */}
        <ReadOnlyBanner />
        {children}
        <PoweredBy label={t("brand.poweredBy", { defaultValue: "Powered by" })} />
      </main>
    </div>
  );
}
