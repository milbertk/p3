import React from "react";
import "./PlatformCard.scss";

export default function PlatformCard({
  t,
  setRefreshChecklogin = () => {},
  icon = null,
  color = "#2563eb",
  title = "",
  tooltip = "",
  href = "#",
}) {
  const handleClick = () => {
    setRefreshChecklogin((prev) => !prev);
  };

  return (
    <a
      href={href}
      className="platform-card"
      title={tooltip}
      onClick={handleClick}
    >
      <div className="platform-card-icon-container">
        <div
          className="platform-card-icon"
          style={{
            color: color,
          }}
        >
          {icon}
        </div>
      </div>

      <span className="platform-card-title">
        {title}
      </span>
    </a>
  );
}