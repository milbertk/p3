// Addresses of the services (2026-10-24): read from environment variables at
// build time (.env / .env.production, see .env.example), with the local
// network values as fallback so nothing changes in development.
const env = (name, fallback) => {
  const value = process.env[name];
  return value && String(value).trim() ? String(value).trim().replace(/\/$/, "") : fallback;
};

export const UserName = ""

export const FbToken = ""

export const Uid = ""

export const CompanyId = ""

export const CompanyName = ""

export const APIUsers = env("REACT_APP_API_USERS", "http://192.168.100.110:8080")

export const APIShao = env("REACT_APP_API_SHAO", "http://192.168.100.110:8081")

export const ValidateEmailJs = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const Showcaselink = env("REACT_APP_SHOWCASE_LINK", "http://192.168.100.110:3001")
