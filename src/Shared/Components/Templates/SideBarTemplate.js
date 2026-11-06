import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "./SideBarTemplate.scss";

/**
 * Side menu. Each item: { key, icon, label, path, enable }.
 * Optional:
 *  - group / groupLabel: items with the same group are shown together under a
 *    small section title (a thin line when the menu is collapsed). A section
 *    whose items are all disabled is not shown.
 *  - externalUrl: opens that address in a new tab instead of navigating.
 */
export default function SideBarTemplate({
  t,
  setRefreshChecklogin = () => {},
  items = [],
  titleKey = "sidebar.title",
  onItemClick = () => {},
}) {
  const [collapsed, setCollapsed] = useState(true);
  const navigate = useNavigate();

  const handleItemClick = (item) => {
    onItemClick(item);

    if (item.externalUrl) {
      window.open(item.externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (item.path) {
      navigate(item.path);
    }

    setRefreshChecklogin((prev) => !prev);
  };

  // Show a section title before the first VISIBLE item of each group. A
  // group with only one visible option shows just the line (its option name
  // already says it, e.g. "Customers").
  const shownGroups = new Set();
  const visibleInGroup = items.reduce((count, item) => {
    if (item.enable && item.group) count[item.group] = (count[item.group] || 0) + 1;
    return count;
  }, {});

  return (
    <aside className={`sidebar-template ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-title">{t(titleKey)}</span>}

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? t("sidebar.expandMenu") : t("sidebar.collapseMenu")}
        >
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          let heading = null;
          if (item.enable && item.group && !shownGroups.has(item.group)) {
            shownGroups.add(item.group);
            heading = (
              <div
                className="sidebar-group-title"
                role="presentation"
                title={collapsed ? item.groupLabel : undefined}
              >
                {!collapsed && visibleInGroup[item.group] > 1 && (
                  <span>{item.groupLabel}</span>
                )}
              </div>
            );
          }

          return (
            <React.Fragment key={item.key}>
              {heading}
              <button
                type="button"
                className={item.enable ? "sidebar-item" : "hiden"}
                onClick={() => handleItemClick(item)}
                title={item.label}
              >
                <span className="sidebar-icon">{item.icon}</span>

                {!collapsed && <span className="sidebar-label">{item.label}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}
