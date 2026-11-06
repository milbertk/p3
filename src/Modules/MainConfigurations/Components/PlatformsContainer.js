import React from "react";

import {
  FaHome,
  FaApple,
  FaServicestack,
} from "react-icons/fa";

import PlatformCard from "./PlatformCard";
import { AKMark } from "../../../Shared/Components/Brand/BrandLogo";

import "./PlatformsContainer.scss";

export default function PlatformsContainer({
  t,
  setRefreshChecklogin,
}) {
  const cards = [
    {
      key: "home",
      icon: <FaHome />,
      color: "#2563eb",
      title: t("platforms.home.title"),
      tooltip: t("platforms.home.tooltip"),
      href: "/",
    },
    {
      key: "KT Flow",
      // AlephTelos (2026-10-25): the AK icon instead of the store icon.
      icon: <AKMark style={{ width: "1.6em" }} />,
      color: "#14243B",
      title: t("platforms.shao.title"),
      tooltip: t("platforms.shao.tooltip"),
      href: "/shao",
    },
  ];

  return (
    <div className="platforms-container">
      {cards.map((card) => (
        <PlatformCard
          key={card.key}
          t={t}
          setRefreshChecklogin={setRefreshChecklogin}
          icon={card.icon}
          color={card.color}
          title={card.title}
          tooltip={card.tooltip}
          href={card.href}
        />
      ))}
    </div>
  );
}