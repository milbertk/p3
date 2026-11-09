import { useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaCheck,
  FaFloppyDisk,
  FaMagnifyingGlass,
  FaShieldHalved,
  FaUserCheck,
  FaUserPlus,
  FaUserSlash,
  FaUsers,
  FaXmark,
} from "react-icons/fa6";

import "./CompanyUsersAccess.scss";

import SearchCompanyUsersService from "../../../Companies/Services/SearchCompanyUsersService";
import CreateOrUpdateCompanyUserService from "../services/CreateOrUpdateCompanyUserService";
import SelectCompanyUserService from "../services/SelectCompanyUserService";
import SelectCompanyUserPermissionsService from "../services/SelectCompanyUserPermissionsService";
import ReplaceCompanyUserPermissionsService from "../services/ReplaceCompanyUserPermissionsService";
import { searchCompanyUsers } from "../services/companyUsersService";
import planLimitMessage, { readPlanLimit } from "../../../../Shared/Utils/planLimitMessage";

export const companyUsersMenuOption = {
  key: "companyUsersAccess",
  labelKey: "companyUsersAccess.menuLabel",
  path: "/administration/company-users",
  icon: FaUsers,
};

// Real system options. `id` is the permission key stored in the database
// (e.g. NAV_HOME_ACCESS). `label` / `description` are fallbacks shown via
// t(labelKey, { defaultValue: label }) until the i18n keys are translated.
const PERMISSION_GROUPS = [
  {
    id: "navigation",
    labelKey: "companyUsersAccess.permissions.groups.navigation",
    label: "Navigation",
    descriptionKey:
      "companyUsersAccess.permissions.groupDescriptions.navigation",
    description:
      "Controls which menu options this user can access.",
    items: [
      {
        id: "NAV_HOME_ACCESS",
        labelKey: "sidebar.home",
        label: "Home",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.home",
        description: "Access to the start page.",
      },
      {
        id: "NAV_PRODUCTS_ACCESS",
        labelKey: "sidebar.products",
        label: "Products",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.products",
        description: "Products and services.",
      },
      {
        id: "NAV_CATEGORIES_ACCESS",
        labelKey: "sidebar.category",
        label: "Categories",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.category",
        description: "Group products in categories.",
      },
      {
        id: "NAV_APPROVAL_A_ACCESS",
        labelKey: "sidebar.aprovala",
        label: "Web orders",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.aprovala",
        description: "Approve or reject orders from the public store.",
      },
      {
        id: "NAV_ORDER_CREATE_ACCESS",
        labelKey: "sidebar.order",
        label: "New order",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.order",
        description: "Create new orders.",
      },
      {
        id: "NAV_ORDER_TRACKING_ACCESS",
        labelKey: "sidebar.trackingord",
        label: "Order tracking",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.trackingord",
        description: "Follow and update the progress of orders.",
      },
      {
        id: "NAV_TRACKING_MAINTENANCE_ACCESS",
        labelKey: "sidebar.trackingm",
        label: "Order stages",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.trackingm",
        description: "The stages an order goes through.",
      },
      {
        id: "NAV_BOOKING_ACCESS",
        labelKey: "sidebar.booking",
        label: "Booking schedules",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.booking",
        description: "Hours available for booking.",
      },
      {
        id: "NAV_APPROVAL_B_ACCESS",
        labelKey: "sidebar.aprovalb",
        label: "Booking requests",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.aprovalb",
        description: "Approve or reject booking requests.",
      },
      {
        id: "NAV_APPOINTMENTS_ACCESS",
        labelKey: "sidebar.appointments",
        label: "Appointments",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.appointments",
        description: "Manage appointments.",
      },
      {
        id: "NAV_SELF_BOOKING",
        labelKey: "sidebar.selfbooking",
        label: "Book for a customer",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.selfbooking",
        description: "Create appointments for customers.",
      },
      {
        // Locations ("Sedes", 2026-11-07).
        id: "NAV_LOCATIONS_ACCESS",
        labelKey: "sidebar.locations",
        label: "Locations",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.locations",
        description: "The places where the company attends appointments.",
      },
      {
        id: "NAV_CUSTOMERS_ACCESS",
        labelKey: "sidebar.customers",
        label: "Customers",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.customers",
        description: "Add, search and edit customers.",
      },
      {
        id: "NAV_PAGE_CONFIGURATION_ACCESS",
        labelKey: "sidebar.pageConfiguration",
        label: "Company page",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.pageConfiguration",
        description: "Logo, header, notification email and email server of the store.",
      },
      {
        id: "NAV_REPORTS_ACCESS",
        labelKey: "sidebar.reports",
        label: "Reports",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.reports",
        description: "Sales and booking reports.",
      },
      {
        id: "NAV_COMPANY_USERS_ACCESS",
        labelKey: "sidebar.usersbcompany",
        label: "Team and permissions",
        descriptionKey: "companyUsersAccess.permissions.menuDescriptions.usersbcompany",
        description: "Users of the company and their access.",
      },
    ],
  },
];

const ALL_PERMISSION_IDS = PERMISSION_GROUPS.flatMap(
  (group) =>
    group.items.map((permission) => permission.id),
);

const ROLE_OPTIONS = [
  "manager",
  "operator",
  "viewer",
];

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const companyUserSearchService =
  new SearchCompanyUsersService();

const selectCompanyUserService =
  new SelectCompanyUserService();

const createOrUpdateCompanyUserService =
  new CreateOrUpdateCompanyUserService();

const selectCompanyUserPermissionsService =
  new SelectCompanyUserPermissionsService();

const replaceCompanyUserPermissionsService =
  new ReplaceCompanyUserPermissionsService();

const LOAD_USERS_NOTICES = {
  companyRequired: {
    key: "companyUsersAccess.list.companyRequired",
    defaultValue:
      "Select a company to view its users.",
  },
  usersUnavailable: {
    key: "companyUsersAccess.list.usersUnavailable",
    defaultValue:
      "Company users are not available right now.",
  },
};

const firstDefined = (
  record,
  keys,
  fallback = undefined,
) => {
  for (const key of keys) {
    if (
      record?.[key] !== undefined &&
      record?.[key] !== null
    ) {
      return record[key];
    }
  }

  return fallback;
};

const normalizeSelectedCompany = (company) => {
  const id = firstDefined(
    company,
    [
      "companyId",
      "company_id",
      "CompanyID",
      "id",
      "ID",
    ],
    "",
  );

  const name = firstDefined(
    company,
    [
      "companyName",
      "company_name",
      "CompanyName",
      "name",
      "Name",
    ],
    "",
  );

  const internalCode = firstDefined(
    company,
    [
      "internalCode",
      "internal_code",
      "code",
      "Code",
    ],
    "",
  );

  if (!id || !name) {
    return null;
  }

  return {
    id: String(id),
    name: String(name || ""),
    internalCode: String(internalCode || ""),
  };
};

const readStoredSelectedCompany = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(
      SELECTED_COMPANY_STORAGE_KEY,
    );

    if (!rawValue) {
      return null;
    }

    const selectedCompany = normalizeSelectedCompany(
      JSON.parse(rawValue),
    );

    if (!selectedCompany) {
      window.localStorage.removeItem(
        SELECTED_COMPANY_STORAGE_KEY,
      );
    }

    return selectedCompany;
  } catch (error) {
    console.error(
      "Error reading selected company from localStorage:",
      error,
    );

    return null;
  }
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  return [
    "true",
    "1",
    "active",
    "s",
    "yes",
  ].includes(normalizedValue);
};

const normalizeAvailableUser = (record) => {
  const companyUserId = firstDefined(
    record,
    [
      "companyUserId",
      "company_user_id",
      "CompanyUserID",
    ],
    "",
  );

  const id = firstDefined(
    record,
    [
      "userId",
      "user_id",
      "UserID",
      "uid",
      "UID",
      "firebaseUid",
      "firebase_uid",
      "FirebaseUID",
      "id",
      "ID",
    ],
    "",
  );

  const email = firstDefined(
    record,
    [
      "email",
      "Email",
      "userEmail",
      "UserEmail",
    ],
    "",
  );

  const name = firstDefined(
    record,
    [
      "name",
      "Name",
      "displayName",
      "display_name",
      "DisplayName",
      "userName",
      "UserName",
      "fullName",
      "full_name",
      "FullName",
    ],
    "",
  );

  if (!id) {
    return null;
  }

  return {
    ...record,
    id: String(id),
    companyUserId: String(companyUserId || id),
    name: String(name || email || id),
    email: String(email || ""),
  };
};

const normalizeCompanyUser = (
  record,
  fallbackCompanyId,
) => {
  const companyUserId = firstDefined(
    record,
    [
      "companyUserId",
      "company_user_id",
      "CompanyUserID",
    ],
    "",
  );

  const companyId = firstDefined(
    record,
    [
      "companyId",
      "company_id",
      "CompanyID",
    ],
    fallbackCompanyId,
  );

  const userId = firstDefined(
    record,
    ["userId", "user_id", "UserID"],
    "",
  );

  const email = firstDefined(
    record,
    [
      "email",
      "Email",
      "userEmail",
      "UserEmail",
    ],
    "",
  );

  const displayName = firstDefined(
    record,
    [
      "name",
      "Name",
      "displayName",
      "display_name",
      "DisplayName",
      "userName",
      "UserName",
    ],
    "",
  );

  const joinedAt = firstDefined(
    record,
    [
      "joinedAt",
      "joined_at",
      "JoinedAt",
    ],
    "",
  );

  const rawPermissions = firstDefined(
    record,
    ["permissions", "Permissions"],
    [],
  );

  return {
    ...record,
    companyUserId: String(companyUserId || userId),
    companyId: String(
      companyId || fallbackCompanyId,
    ),
    userId: String(userId || ""),
    name: String(
      displayName || email || userId,
    ),
    email: String(email || ""),
    role: String(
      firstDefined(
        record,
        ["role", "Role"],
        "operator",
      ),
    ).toLowerCase(),
    active: normalizeBoolean(
      firstDefined(
        record,
        ["active", "Active"],
        false,
      ),
    ),
    joinedAt: joinedAt
      ? String(joinedAt).slice(0, 10)
      : "",
    permissions: Array.isArray(rawPermissions)
      ? rawPermissions
          .map((permission) =>
            typeof permission === "string"
              ? permission
              : firstDefined(permission, [
                  "permissionCode",
                  "permission_code",
                  "PermissionCode",
                  "id",
                ]),
          )
          .filter(Boolean)
      : [],
    protected: normalizeBoolean(
      firstDefined(
        record,
        [
          "protected",
          "isProtected",
          "is_protected",
          "IsProtected",
        ],
        false,
      ),
    ),
  };
};

const extractCompanyUsers = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  const possibleLists = [
    response?.result,
    response?.users,
    response?.Users,
    response?.companyUsers,
    response?.CompanyUsers,
    response?.items,
    response?.Items,
    response?.data?.result,
    response?.data?.users,
    response?.data?.Users,
    response?.data?.companyUsers,
    response?.data?.CompanyUsers,
    response?.data?.items,
    response?.data?.Items,
    response?.data,
  ];

  return (
    possibleLists.find(Array.isArray) || []
  );
};

const logAddCompanyUserError = ({
  phase,
  error,
  companyId,
  candidate,
  role,
}) => {
  console.group(
    `[CompanyUserAccess] Add-user ${phase} has failed`,
  );

  console.error("Phase:", phase);
  console.error(
    "Message:",
    error?.message || "Unknown error",
  );
  console.error(
    "HTTP status:",
    error?.status ?? "No HTTP response",
  );
  console.error(
    "HTTP status text:",
    error?.statusText || "",
  );
  console.error(
    "Backend response:",
    error?.response ?? null,
  );
  console.error(
    "Request details:",
    error?.request ?? null,
  );
  console.error(
    "Original cause:",
    error?.cause ?? null,
  );
  console.error("Selected values:", {
    companyId,
    companyUserId:
      candidate?.companyUserId || "",
    userId: candidate?.id || "",
    role,
  });
  console.error(
    "Complete error object:",
    error,
  );

  console.groupEnd();
};

export default function CompanyUserAccess({
  t,
  selectedCompany: selectedCompanyProp,
}) {
  const [users, setUsers] = useState([]);
  const [searchFilter, setSearchFilter] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("active");
  const [isLoadingUsers, setIsLoadingUsers] =
    useState(false);
  const [loadUsersNotice, setLoadUsersNotice] =
    useState("");
  const [permissionUserId, setPermissionUserId] =
    useState(null);
  const [
    loadingPermissions,
    setLoadingPermissions,
  ] = useState(false);

  const [
    permissionsError,
    setPermissionsError,
  ] = useState("");

  const [
    savingPermissions,
    setSavingPermissions,
  ] = useState(false);

  const [draftPermissions, setDraftPermissions] =
    useState(new Set());
  const [showAddUser, setShowAddUser] =
    useState(false);
  const [candidateSearch, setCandidateSearch] =
    useState("");
  const [availableUsers, setAvailableUsers] =
    useState([]);
  const [
    isLoadingCandidates,
    setIsLoadingCandidates,
  ] = useState(false);
  const [
    candidateLoadNotice,
    setCandidateLoadNotice,
  ] = useState("");
  const [
    selectedCandidateId,
    setSelectedCandidateId,
  ] = useState("");
  const [selectedRole, setSelectedRole] =
    useState("operator");
  const [addUserNotice, setAddUserNotice] =
    useState("");
  // QA 2026-10-29: the add-user notice is shown as a warning when the
  // company has no active plan (403 PLAN_REQUIRED).
  const [addUserNoticeIsWarning, setAddUserNoticeIsWarning] =
    useState(false);
  const [isSavingUser, setIsSavingUser] =
    useState(false);
  const [usersReloadKey, setUsersReloadKey] =
    useState(0);
  const [message, setMessage] = useState("");

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    () =>
      normalizeSelectedCompany(
        selectedCompanyProp,
      ) || readStoredSelectedCompany(),
  );

  const propCompanyId = firstDefined(
    selectedCompanyProp,
    [
      "companyId",
      "company_id",
      "CompanyID",
      "id",
      "ID",
    ],
    "",
  );

  const propCompanyName = firstDefined(
    selectedCompanyProp,
    [
      "companyName",
      "company_name",
      "CompanyName",
      "name",
      "Name",
    ],
    "",
  );

  const propCompanyCode = firstDefined(
    selectedCompanyProp,
    [
      "internalCode",
      "internal_code",
      "code",
      "Code",
    ],
    "",
  );

  const selectedCompanyId =
    selectedCompany?.id || "";

  const selectedCompanyName =
    selectedCompany?.name || "";

  const selectedCompanyCode =
    selectedCompany?.internalCode || "";

  useEffect(() => {
    if (!propCompanyId) {
      return;
    }

    setSelectedCompany(
      normalizeSelectedCompany({
        companyId: propCompanyId,
        companyName: propCompanyName,
        internalCode: propCompanyCode,
      }),
    );

    setSearchFilter("");
    setStatusFilter("active");
  }, [
    propCompanyCode,
    propCompanyId,
    propCompanyName,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const applyCompany = (company) => {
      const normalizedCompany =
        normalizeSelectedCompany(company) ||
        readStoredSelectedCompany();

      setSelectedCompany(normalizedCompany);
      setSearchFilter("");
      setStatusFilter("active");
    };

    const handleSelectedCompanyChanged = (
      event,
    ) => {
      applyCompany(event.detail);
    };

    const handleStorage = (event) => {
      if (
        event.key !==
        SELECTED_COMPANY_STORAGE_KEY
      ) {
        return;
      }

      if (!event.newValue) {
        applyCompany(null);
        return;
      }

      try {
        applyCompany(
          JSON.parse(event.newValue),
        );
      } catch (error) {
        console.error(
          "Invalid selectedCompany storage value:",
          error,
        );

        applyCompany(null);
      }
    };

    window.addEventListener(
      "selectedCompanyChanged",
      handleSelectedCompanyChanged,
    );

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        "selectedCompanyChanged",
        handleSelectedCompanyChanged,
      );

      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, []);

  useEffect(() => {
    if (!selectedCompanyId) {
      setUsers([]);
      setLoadUsersNotice("companyRequired");
      setIsLoadingUsers(false);

      return undefined;
    }

    const controller =
      new AbortController();

    const search = searchFilter.trim();

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setLoadUsersNotice("");

      try {
        const activeValues =
          statusFilter === "all"
            ? [true, false]
            : [
                statusFilter === "active",
              ];

        const responses =
          await Promise.all(
            activeValues.map((active) =>
              searchCompanyUsers({
                companyId:
                  selectedCompanyId,
                search,
                active,
                signal:
                  controller.signal,
              }),
            ),
          );

        const loadedUsers =
          responses.flatMap((response) =>
            Array.isArray(
              response?.result,
            )
              ? response.result
              : [],
          );

        setUsers(
          loadedUsers.map((user) =>
            normalizeCompanyUser(
              user,
              selectedCompanyId,
            ),
          ),
        );
      } catch (error) {
        if (
          error?.name !== "AbortError"
        ) {
          console.error(
            "Error loading company users:",
            error,
          );

          setUsers([]);
          setLoadUsersNotice(
            "usersUnavailable",
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setIsLoadingUsers(false);
        }
      }
    };

    const timeoutId =
      window.setTimeout(
        loadUsers,
        search ? 300 : 0,
      );

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    searchFilter,
    selectedCompanyId,
    statusFilter,
    usersReloadKey,
  ]);

  useEffect(() => {
    if (
      !showAddUser ||
      !selectedCompanyId
    ) {
      return undefined;
    }

    let isCurrentRequest = true;

    const loadAvailableUsers =
      async () => {
        setIsLoadingCandidates(true);
        setCandidateLoadNotice("");

        try {
          const response =
            await companyUserSearchService.searchCompanyUsers(
              {
                companyId:
                  selectedCompanyId,
                includeInactive: false,
              },
            );

          const loadedUsers =
            extractCompanyUsers(response);

          if (!isCurrentRequest) {
            return;
          }

          setAvailableUsers(
            loadedUsers
              .map(
                normalizeAvailableUser,
              )
              .filter(Boolean),
          );
        } catch (error) {
          if (isCurrentRequest) {
            console.error(
              "Error loading available users:",
              error,
            );

            setAvailableUsers([]);
            setCandidateLoadNotice(
              "usersUnavailable",
            );
          }
        } finally {
          if (isCurrentRequest) {
            setIsLoadingCandidates(
              false,
            );
          }
        }
      };

    loadAvailableUsers();

    return () => {
      isCurrentRequest = false;
    };
  }, [
    selectedCompanyId,
    showAddUser,
  ]);

  const companyUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          String(user.companyId) ===
          String(selectedCompanyId),
      ),
    [users, selectedCompanyId],
  );

  const visibleUsers = useMemo(() => {
    const searchTerm = searchFilter
      .trim()
      .toLowerCase();

    return companyUsers.filter(
      (user) => {
        const matchesSearch =
          !searchTerm ||
          user.userId
            .toLowerCase()
            .includes(searchTerm) ||
          user.email
            .toLowerCase()
            .includes(searchTerm) ||
          user.name
            .toLowerCase()
            .includes(searchTerm);

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter ===
            "active" &&
            user.active) ||
          (statusFilter ===
            "inactive" &&
            !user.active);

        return (
          matchesSearch &&
          matchesStatus
        );
      },
    );
  }, [
    companyUsers,
    searchFilter,
    statusFilter,
  ]);

  const availableCandidates =
    useMemo(() => {
      const term = candidateSearch
        .trim()
        .toLowerCase();

      return availableUsers.filter(
        (candidate) =>
          !term ||
          candidate.id
            .toLowerCase()
            .includes(term) ||
          candidate.name
            .toLowerCase()
            .includes(term) ||
          candidate.email
            .toLowerCase()
            .includes(term),
      );
    }, [
      availableUsers,
      candidateSearch,
    ]);

  const permissionUser =
    users.find(
      (user) =>
        user.companyUserId ===
        permissionUserId,
    ) || null;

  const activeCount =
    companyUsers.filter(
      (user) => user.active,
    ).length;

  const clearFilters = () => {
    setSearchFilter("");
    setStatusFilter("active");
  };

  const [
    togglingUserId,
    setTogglingUserId,
  ] = useState(null);

  const toggleUserStatus = async (
    companyUserId,
  ) => {
    const target = users.find(
      (user) =>
        user.companyUserId ===
        companyUserId,
    );

    if (
      !target ||
      target.protected ||
      togglingUserId ||
      !selectedCompanyId
    ) {
      return;
    }

    const nextActive = !target.active;

    // Optimistic update: reflect the change immediately in the UI.
    setUsers((current) =>
      current.map((user) =>
        user.companyUserId ===
        companyUserId
          ? {
              ...user,
              active: nextActive,
            }
          : user,
      ),
    );

    setTogglingUserId(companyUserId);
    setMessage("");

    try {
      // Reuse the SAME update flow as create: only the active flag changes.
      await createOrUpdateCompanyUserService.createOrUpdateCompanyUser(
        {
          companyId: selectedCompanyId,
          companyUser: {
            companyUserId,
            active: nextActive,
          },
        },
      );

      setMessage(
        t(
          nextActive
            ? "companyUsersAccess.messages.userActivated"
            : "companyUsersAccess.messages.userDeactivated",
          {
            name: target.name,
          },
        ),
      );

      setUsersReloadKey(
        (current) => current + 1,
      );
    } catch (error) {
      // Revert the optimistic change if the backend rejected it.
      setUsers((current) =>
        current.map((user) =>
          user.companyUserId ===
          companyUserId
            ? {
                ...user,
                active: target.active,
              }
            : user,
        ),
      );

      setMessage(
        // Plan limit of active users (e.g. FREE = 1 user).
        planLimitMessage(error, t) ||
        t(
          "companyUsersAccess.messages.statusUpdateError",
          {
            name: target.name,
            defaultValue:
              "The status of {{name}} could not be updated.",
          },
        ),
      );
    } finally {
      setTogglingUserId(null);
    }
  };

  const openPermissions = async (user) => {
    setPermissionUserId(
      user.companyUserId,
    );

    // Start from whatever the row already carries, then refresh from the DB.
    setDraftPermissions(
      new Set(user.permissions || []),
    );
    setPermissionsError("");
    setMessage("");

    if (!selectedCompanyId) {
      return;
    }

    setLoadingPermissions(true);

    try {
      // The permission code (NAV_*) IS the id stored in the Set.
      const codes =
        await selectCompanyUserPermissionsService.getPermissionCodes(
          {
            companyId: selectedCompanyId,
            companyUserId:
              user.companyUserId,
          },
        );

      setDraftPermissions(new Set(codes));

      // Keep the row in sync so the drawer and the table agree.
      setUsers((current) =>
        current.map((item) =>
          item.companyUserId ===
          user.companyUserId
            ? {
                ...item,
                permissions: codes,
              }
            : item,
        ),
      );
    } catch (error) {
      setPermissionsError(
        t(
          "companyUsersAccess.messages.permissionsLoadError",
          {
            defaultValue:
              "The permissions could not be loaded.",
          },
        ),
      );
    } finally {
      setLoadingPermissions(false);
    }
  };

  const closePermissions = () => {
    setPermissionUserId(null);
    setDraftPermissions(new Set());
  };

  const togglePermission = (
    permissionId,
  ) => {
    setDraftPermissions(
      (current) => {
        const next = new Set(current);

        if (
          next.has(permissionId)
        ) {
          next.delete(permissionId);
        } else {
          next.add(permissionId);
        }

        return next;
      },
    );
  };

  const togglePermissionGroup = (
    group,
  ) => {
    const groupPermissionIds =
      group.items.map(
        (item) => item.id,
      );

    const groupIsSelected =
      groupPermissionIds.every(
        (id) =>
          draftPermissions.has(id),
      );

    setDraftPermissions(
      (current) => {
        const next = new Set(current);

        groupPermissionIds.forEach(
          (id) => {
            if (groupIsSelected) {
              next.delete(id);
            } else {
              next.add(id);
            }
          },
        );

        return next;
      },
    );
  };

  const savePermissions = async () => {
    if (
      !permissionUser ||
      savingPermissions ||
      !selectedCompanyId
    ) {
      return;
    }

    // The ids in the Set are the permission codes (NAV_*) to store.
    const permissionCodes = [
      ...draftPermissions,
    ];

    setSavingPermissions(true);
    setPermissionsError("");

    try {
      // Replace: the backend deletes all and recreates from this list.
      const response =
        await replaceCompanyUserPermissionsService.replaceCompanyUserPermissions(
          {
            companyId: selectedCompanyId,
            companyUserId:
              permissionUser.companyUserId,
            permissionCodes,
          },
        );

      // Trust the backend's returned list as the source of truth.
      const savedCodes = (
        response?.result?.permissions ||
        []
      )
        .map((permission) =>
          String(
            permission?.permissionCode ||
              "",
          ).trim(),
        )
        .filter(Boolean);

      const finalCodes =
        savedCodes.length ||
        permissionCodes.length === 0
          ? savedCodes
          : permissionCodes;

      setUsers((current) =>
        current.map((user) =>
          user.companyUserId ===
          permissionUser.companyUserId
            ? {
                ...user,
                permissions: finalCodes,
              }
            : user,
        ),
      );

      setMessage(
        t(
          "companyUsersAccess.messages.permissionsSaved",
          {
            name:
              permissionUser.name,
          },
        ),
      );

      closePermissions();
    } catch (error) {
      setPermissionsError(
        t(
          "companyUsersAccess.messages.permissionsSaveError",
          {
            name:
              permissionUser.name,
            defaultValue:
              "The permissions of {{name}} could not be saved.",
          },
        ),
      );
    } finally {
      setSavingPermissions(false);
    }
  };

  const openAddUser = () => {
    setCandidateSearch("");
    setAvailableUsers([]);
    setCandidateLoadNotice("");
    setSelectedCandidateId("");
    setSelectedRole("operator");
    setAddUserNotice("");
    setAddUserNoticeIsWarning(false);
    setIsSavingUser(false);
    setMessage("");
    setShowAddUser(true);
  };

  const closeAddUser = () => {
    setShowAddUser(false);
    setAvailableUsers([]);
    setCandidateLoadNotice("");
    setSelectedCandidateId("");
    setAddUserNotice("");
    setAddUserNoticeIsWarning(false);
    setIsSavingUser(false);
  };

  const addUserToCompany =
    async (event) => {
      event.preventDefault();

      const candidate =
        availableUsers.find(
          (user) =>
            user.id ===
            selectedCandidateId,
        );

      if (
        !candidate ||
        !selectedCompanyId ||
        isSavingUser
      ) {
        return;
      }

      setIsSavingUser(true);
      setAddUserNotice("");
      setAddUserNoticeIsWarning(false);

      let operationPhase =
        "validation";

      try {
        const validation =
          await selectCompanyUserService.companyUserExists(
            {
              companyId:
                selectedCompanyId,
              companyUserId:
                candidate.companyUserId,
            },
          );

        if (validation.exists) {
          setAddUserNotice(
            t(
              "companyUsersAccess.addUser.alreadyAssigned",
              {
                name: candidate.name,
                defaultValue:
                  "{{name}} is already assigned to this company. Use the user options to modify it.",
              },
            ),
          );

          setUsersReloadKey(
            (current) =>
              current + 1,
          );

          return;
        }

        operationPhase = "creation";

        await createOrUpdateCompanyUserService.createOrUpdateCompanyUser(
          {
            companyId:
              selectedCompanyId,
            companyUser: {
              companyUserId: "",
              userId: candidate.id,
              role: selectedRole,
              active: true,
            },
          },
        );

        setMessage(
          t(
            "companyUsersAccess.messages.userAdded",
            {
              name: candidate.name,
              defaultValue:
                "{{name}} has been added to the company.",
            },
          ),
        );

        closeAddUser();

        setUsersReloadKey(
          (current) => current + 1,
        );
      } catch (error) {
        logAddCompanyUserError({
          phase: operationPhase,
          error,
          companyId:
            selectedCompanyId,
          candidate,
          role: selectedRole,
        });

        const noPlan =
          readPlanLimit(error)?.code === "PLAN_REQUIRED";
        setAddUserNoticeIsWarning(noPlan);

        setAddUserNotice(
          // QA 2026-10-29: clear message when there is no active plan.
          (noPlan &&
            t("companyUsersAccess.addUser.noPlan", {
              defaultValue:
                "This company doesn't have an active plan, so you can't add users. Choose a plan or request a free trial from Home → Your plan.",
            })) ||
          // Plan limit of active users (e.g. FREE = 1 user).
          planLimitMessage(error, t) ||
          t(
            "companyUsersAccess.addUser.saveError",
            {
              defaultValue:
                "The company user could not be saved.",
            },
          ),
        );
      } finally {
        setIsSavingUser(false);
      }
    };

  return (
    <section className="company-access">
      <header className="company-access__header">
        <div>
          <p className="company-access__eyebrow">
            {t(
              "companyUsersAccess.sectionLabel",
            )}
          </p>

          <h1>
            {t(
              "companyUsersAccess.title",
            )}
          </h1>

          <p>
            {t(
              "companyUsersAccess.subtitle",
            )}
          </p>
        </div>

        <div
          className="current-company"
          aria-label={t(
            "companyUsersAccess.currentCompany",
          )}
        >
          <span className="current-company__icon">
            <FaBuilding />
          </span>

          <span>
            <small>
              {t(
                "companyUsersAccess.currentCompany",
              )}
            </small>

            <strong>
              {selectedCompanyName}
            </strong>

            <em>
              {selectedCompanyCode}
            </em>
          </span>
        </div>
      </header>

      <div className="company-access__summary">
        <div>
          <span>
            <FaUsers />
          </span>

          <p>
            {t(
              "companyUsersAccess.summary.total",
            )}
          </p>

          <strong>
            {companyUsers.length}
          </strong>
        </div>

        <div>
          <span className="summary-icon--active">
            <FaUserCheck />
          </span>

          <p>
            {t(
              "companyUsersAccess.summary.active",
            )}
          </p>

          <strong>
            {activeCount}
          </strong>
        </div>

        <div>
          <span className="summary-icon--inactive">
            <FaUserSlash />
          </span>

          <p>
            {t(
              "companyUsersAccess.summary.inactive",
            )}
          </p>

          <strong>
            {companyUsers.length -
              activeCount}
          </strong>
        </div>

        <button
          type="button"
          className="company-button company-button--primary"
          onClick={openAddUser}
        >
          <FaUserPlus />

          {t(
            "companyUsersAccess.actions.addUser",
          )}
        </button>
      </div>

      <div className="company-access__filters">
        <label>
          <span>
            {t(
              "companyUsersAccess.filters.search",
              {
                defaultValue:
                  "User ID or email",
              },
            )}
          </span>

          <div className="filter-input">
            <FaMagnifyingGlass />

            <input
              value={searchFilter}
              onChange={(event) =>
                setSearchFilter(
                  event.target.value,
                )
              }
              placeholder={t(
                "companyUsersAccess.filters.searchPlaceholder",
                {
                  defaultValue:
                    "Search by user ID or email",
                },
              )}
            />
          </div>
        </label>

        <label>
          <span>
            {t(
              "companyUsersAccess.filters.status",
            )}
          </span>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
          >
            <option value="all">
              {t(
                "companyUsersAccess.filters.allStatuses",
              )}
            </option>

            <option value="active">
              {t(
                "companyUsersAccess.status.active",
              )}
            </option>

            <option value="inactive">
              {t(
                "companyUsersAccess.status.inactive",
              )}
            </option>
          </select>
        </label>

        <button
          type="button"
          className="company-button company-button--ghost"
          onClick={clearFilters}
        >
          <FaXmark />

          {t(
            "companyUsersAccess.actions.clear",
          )}
        </button>
      </div>

      {message && (
        <div
          className="company-access__message"
          role="status"
        >
          <FaCheck />
          {message}
        </div>
      )}

      {loadUsersNotice && (
        <div
          className="company-access__message"
          role="status"
        >
          {t(
            LOAD_USERS_NOTICES[
              loadUsersNotice
            ].key,
            {
              defaultValue:
                LOAD_USERS_NOTICES[
                  loadUsersNotice
                ].defaultValue,
            },
          )}
        </div>
      )}

      <div className="company-access__list-heading">
        <div>
          <h2>
            {t(
              "companyUsersAccess.list.title",
            )}
          </h2>

          <p>
            {t(
              "companyUsersAccess.list.count",
              {
                visible:
                  visibleUsers.length,
                total:
                  companyUsers.length,
              },
            )}
          </p>
        </div>

        <span>
          {selectedCompanyName}
        </span>
      </div>

      <div className="company-users-table-wrap">
        <table className="company-users-table">
          <thead>
            <tr>
              <th>
                {t(
                  "companyUsersAccess.table.user",
                )}
              </th>

              <th>
                {t(
                  "companyUsersAccess.table.role",
                )}
              </th>

              <th>
                {t(
                  "companyUsersAccess.table.joinedAt",
                )}
              </th>

              <th>
                {t(
                  "companyUsersAccess.table.permissions",
                )}
              </th>

              <th>
                {t(
                  "companyUsersAccess.table.status",
                )}
              </th>

              <th>
                {t(
                  "companyUsersAccess.table.actions",
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {isLoadingUsers && (
              <tr>
                <td
                  colSpan="6"
                  className="company-users-table__empty"
                >
                  {t(
                    "companyUsersAccess.list.loading",
                    {
                      defaultValue:
                        "Loading company users...",
                    },
                  )}
                </td>
              </tr>
            )}

            {!isLoadingUsers &&
              visibleUsers.map(
                (user) => (
                  <tr
                    key={
                      user.companyUserId
                    }
                  >
                    <td>
                      <div className="user-cell">
                        <span>
                          {user.name
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>

                        <div>
                          <strong>
                            {user.name}
                          </strong>

                          <small>
                            {user.email}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`role-badge role-badge--${user.role}`}
                      >
                        {t(
                          `companyUsersAccess.roles.${user.role}`,
                        )}
                      </span>
                    </td>

                    <td>
                      {user.joinedAt}
                    </td>

                    <td>
                      <strong>
                        {
                          user.permissions
                            .length
                        }
                      </strong>

                      <small>
                        {t(
                          "companyUsersAccess.table.permissionsAssigned",
                        )}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`user-status user-status--${
                          user.active
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {t(
                          `companyUsersAccess.status.${
                            user.active
                              ? "active"
                              : "inactive"
                          }`,
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="company-row-actions">
                        <button
                          type="button"
                          className={`company-button ${
                            user.active
                              ? "company-button--danger"
                              : "company-button--success"
                          }`}
                          onClick={() =>
                            toggleUserStatus(
                              user.companyUserId,
                            )
                          }
                          disabled={
                            user.protected ||
                            togglingUserId ===
                              user.companyUserId
                          }
                          title={
                            user.protected
                              ? t(
                                  "companyUsersAccess.ownerProtected",
                                )
                              : undefined
                          }
                        >
                          {user.active ? (
                            <FaUserSlash />
                          ) : (
                            <FaUserCheck />
                          )}

                          {togglingUserId ===
                          user.companyUserId
                            ? t(
                                "companyUsersAccess.actions.saving",
                                {
                                  defaultValue:
                                    "Saving...",
                                },
                              )
                            : t(
                                user.active
                                  ? "companyUsersAccess.actions.deactivate"
                                  : "companyUsersAccess.actions.activate",
                              )}
                        </button>

                        <button
                          type="button"
                          className="company-button company-button--permissions"
                          onClick={() =>
                            openPermissions(
                              user,
                            )
                          }
                        >
                          <FaShieldHalved />

                          {t(
                            "companyUsersAccess.actions.permissions",
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}

            {!isLoadingUsers &&
              !visibleUsers.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="company-users-table__empty"
                  >
                    {t(
                      "companyUsersAccess.list.empty",
                    )}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {showAddUser && (
        <div
          className="company-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
        >
          <button
            type="button"
            className="company-modal__backdrop"
            onClick={closeAddUser}
            aria-label={t(
              "companyUsersAccess.actions.close",
            )}
          />

          <form
            className="company-dialog company-dialog--small"
            onSubmit={
              addUserToCompany
            }
          >
            <div className="company-dialog__header">
              <div>
                <span>
                  <FaUserPlus />
                </span>

                <div>
                  <p>
                    {selectedCompanyName}
                  </p>

                  <h2 id="add-user-title">
                    {t(
                      "companyUsersAccess.addUser.title",
                    )}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={closeAddUser}
                aria-label={t(
                  "companyUsersAccess.actions.close",
                )}
              >
                <FaXmark />
              </button>
            </div>

            <div className="company-dialog__body">
              <label>
                <span>
                  {t(
                    "companyUsersAccess.addUser.search",
                  )}
                </span>

                <div className="filter-input">
                  <FaMagnifyingGlass />

                  <input
                    value={
                      candidateSearch
                    }
                    onChange={(event) =>
                      setCandidateSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder={t(
                      "companyUsersAccess.addUser.searchPlaceholder",
                    )}
                    autoFocus
                  />
                </div>
              </label>

              <div className="candidate-list">
                {isLoadingCandidates && (
                  <p className="candidate-list__empty">
                    {t(
                      "companyUsersAccess.addUser.loading",
                      {
                        defaultValue:
                          "Loading available users...",
                      },
                    )}
                  </p>
                )}

                {!isLoadingCandidates &&
                  candidateLoadNotice && (
                    <p
                      className="candidate-list__empty"
                      role="status"
                    >
                      {t(
                        "companyUsersAccess.addUser.usersUnavailable",
                        {
                          defaultValue:
                            "Available users cannot be loaded right now.",
                        },
                      )}
                    </p>
                  )}

                {!isLoadingCandidates &&
                  !candidateLoadNotice &&
                  availableCandidates.map(
                    (candidate) => (
                      <label
                        key={
                          candidate.id
                        }
                        className={`candidate-item ${
                          selectedCandidateId ===
                          candidate.id
                            ? "candidate-item--selected"
                            : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="candidate"
                          value={
                            candidate.id
                          }
                          checked={
                            selectedCandidateId ===
                            candidate.id
                          }
                          onChange={() => {
                            setSelectedCandidateId(
                              candidate.id,
                            );

                            setAddUserNotice(
                              "",
                            );
                          }}
                          disabled={
                            isSavingUser
                          }
                        />

                        <span>
                          {candidate.name.slice(
                            0,
                            1,
                          )}
                        </span>

                        <div>
                          <strong>
                            {
                              candidate.name
                            }
                          </strong>

                          <small>
                            {
                              candidate.email
                            }
                          </small>
                        </div>

                        {selectedCandidateId ===
                          candidate.id && (
                          <FaCheck />
                        )}
                      </label>
                    ),
                  )}

                {!isLoadingCandidates &&
                  !candidateLoadNotice &&
                  !availableCandidates.length && (
                    <p className="candidate-list__empty">
                      {t(
                        "companyUsersAccess.addUser.noCandidates",
                      )}
                    </p>
                  )}
              </div>

              {addUserNotice && (
                <p
                  className={
                    addUserNoticeIsWarning
                      ? "candidate-list__empty candidate-list__empty--warning"
                      : "candidate-list__empty"
                  }
                  role="status"
                >
                  {addUserNotice}
                </p>
              )}

              <label>
                <span>
                  {t(
                    "companyUsersAccess.addUser.role",
                  )}
                </span>

                <select
                  value={selectedRole}
                  onChange={(event) =>
                    setSelectedRole(
                      event.target.value,
                    )
                  }
                  disabled={
                    isSavingUser
                  }
                >
                  {ROLE_OPTIONS.map(
                    (role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {t(
                          `companyUsersAccess.roles.${role}`,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <div className="company-dialog__footer">
              <button
                type="button"
                className="company-button company-button--ghost"
                onClick={
                  closeAddUser
                }
                disabled={
                  isSavingUser
                }
              >
                {t(
                  "companyUsersAccess.actions.cancel",
                )}
              </button>

              <button
                type="submit"
                className="company-button company-button--primary"
                disabled={
                  !selectedCandidateId ||
                  isSavingUser
                }
              >
                <FaUserPlus />

                {isSavingUser
                  ? t(
                      "companyUsersAccess.addUser.saving",
                      {
                        defaultValue:
                          "Validating user...",
                      },
                    )
                  : t(
                      "companyUsersAccess.actions.addToCompany",
                    )}
              </button>
            </div>
          </form>
        </div>
      )}

      {permissionUser && (
        <div
          className="company-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="permissions-title"
        >
          <button
            type="button"
            className="company-modal__backdrop"
            onClick={
              closePermissions
            }
            aria-label={t(
              "companyUsersAccess.actions.close",
            )}
          />

          <div className="permission-drawer">
            <div className="company-dialog__header">
              <div>
                <span>
                  <FaShieldHalved />
                </span>

                <div>
                  <p>
                    {
                      permissionUser.name
                    }
                  </p>

                  <h2 id="permissions-title">
                    {t(
                      "companyUsersAccess.permissions.title",
                    )}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closePermissions
                }
                aria-label={t(
                  "companyUsersAccess.actions.close",
                )}
              >
                <FaXmark />
              </button>
            </div>

            <div className="permission-drawer__intro">
              <p>
                {t(
                  "companyUsersAccess.permissions.subtitle",
                  {
                    company:
                      selectedCompanyName,
                  },
                )}
              </p>

              <span>
                {t(
                  "companyUsersAccess.permissions.selectedCount",
                  {
                    selected:
                      draftPermissions.size,
                    total:
                      ALL_PERMISSION_IDS.length,
                  },
                )}
              </span>
            </div>

            <div className="permission-drawer__body">
              {loadingPermissions && (
                <p className="permission-drawer__hint">
                  {t(
                    "companyUsersAccess.messages.permissionsLoading",
                    {
                      defaultValue:
                        "Loading permissions...",
                    },
                  )}
                </p>
              )}

              {permissionsError && (
                <p className="permission-drawer__error">
                  {permissionsError}
                </p>
              )}

              {PERMISSION_GROUPS.map(
                (group) => {
                  const selectedInGroup =
                    group.items.filter(
                      (item) =>
                        draftPermissions.has(
                          item.id,
                        ),
                    ).length;

                  const allSelected =
                    selectedInGroup ===
                    group.items.length;

                  return (
                    <section
                      className="permission-group"
                      key={group.id}
                    >
                      <header>
                        <div>
                          <h3>
                            {t(
                              group.labelKey,
                              {
                                defaultValue:
                                  group.label,
                              },
                            )}
                          </h3>

                          <p>
                            {t(
                              group.descriptionKey,
                              {
                                defaultValue:
                                  group.description,
                              },
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          className={
                            allSelected
                              ? "permission-group__clear"
                              : ""
                          }
                          onClick={() =>
                            togglePermissionGroup(
                              group,
                            )
                          }
                        >
                          {t(
                            allSelected
                              ? "companyUsersAccess.permissions.clearGroup"
                              : "companyUsersAccess.permissions.selectGroup",
                          )}
                        </button>
                      </header>

                      <div className="permission-group__items">
                        {group.items.map(
                          (
                            permission,
                          ) => (
                            <label
                              key={
                                permission.id
                              }
                            >
                              <input
                                type="checkbox"
                                checked={draftPermissions.has(
                                  permission.id,
                                )}
                                onChange={() =>
                                  togglePermission(
                                    permission.id,
                                  )
                                }
                              />

                              <span aria-hidden="true">
                                <FaCheck />
                              </span>

                              <span className="permission-item__text">
                                <strong>
                                  {t(
                                    permission.labelKey,
                                    {
                                      defaultValue:
                                        permission.label,
                                    },
                                  )}
                                </strong>

                                {permission.description && (
                                  <small>
                                    {permission.descriptionKey
                                      ? t(
                                          permission.descriptionKey,
                                          {
                                            defaultValue:
                                              permission.description,
                                          },
                                        )
                                      : permission.description}
                                  </small>
                                )}
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                    </section>
                  );
                },
              )}
            </div>

            <div className="company-dialog__footer">
              <button
                type="button"
                className="company-button company-button--ghost"
                onClick={
                  closePermissions
                }
                disabled={savingPermissions}
              >
                {t(
                  "companyUsersAccess.actions.cancel",
                )}
              </button>

              <button
                type="button"
                className="company-button company-button--primary"
                onClick={
                  savePermissions
                }
                disabled={
                  savingPermissions ||
                  loadingPermissions
                }
              >
                <FaFloppyDisk />

                {savingPermissions
                  ? t(
                      "companyUsersAccess.actions.saving",
                      {
                        defaultValue:
                          "Saving...",
                      },
                    )
                  : t(
                      "companyUsersAccess.actions.savePermissions",
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}