import React from "react";

import HeaderTemplate from "../../../Shared/Components/Templates/HeaderTemplate";
import SideBarTemplate from "../../../Shared/Components/Templates/SideBarTemplate";

import {
  FaHome,
  FaUserPlus,
  FaUserCheck,
  FaTasks,
  FaBuilding,
  FaUsersCog,
} from "react-icons/fa";

import { PoweredBy } from "../../../Shared/Components/Brand/BrandLogo";
import "./MainTemplate.scss";

export default function MainTemplate(props) {
  const {
    t,
    setRefreshChecklogin,
    children,
    companyName,
  } = props;

  const menuItems = [
    {
      key: "home",
      icon: <FaHome />,
      label: t("sidebar.home"),
      path: "/",
      enable: true,
    },
    {
      key: "inviteNewUsers",
      icon: <FaUserPlus />,
      label: t("sidebar.inviteNewUsers"),
      path: "/invitationsend",
      enable: true,
    },
    {
      key: "addUsersToCompany",
      icon: <FaUserCheck />,
      label: t("sidebar.addUsersToCompany"),
      path: "/adduserstocompany",
      enable: true,
    },
    {
      key: "manageInvitations",
      icon: <FaTasks />,
      label: t("sidebar.manageInvitations"),
      path: "/manageinvitatinsbyuser",
      enable: true,
    },
    {
      key: "companies",
      icon: <FaBuilding />,
      label: t("sidebar.companies"),
      path: "/companies",
      enable: true,
    },
    {
      key: "companyUsers",
      icon: <FaUsersCog />,
      label: t("sidebar.companyUsers"),
      path: "/companyusersmanagerpage",
      enable: true,
    },
    
  ];

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
      />

      <main className="main-template-content">
        {children}
        <PoweredBy label={t("brand.poweredBy", { defaultValue: "Powered by" })} />
      </main>
    </div>
  );
}