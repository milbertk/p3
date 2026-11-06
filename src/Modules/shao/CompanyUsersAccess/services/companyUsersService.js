// companyUsersService.js

// Replace this import with the location of your existing APIShao constant.
import { APIShao } from "../../../../Shared/Utils/globalVar";

export async function searchCompanyUsers({
  companyId,
  search = "",
  active = true,
  signal,
}) {
  const normalizedCompanyId = String(companyId ?? "").trim();

  if (!normalizedCompanyId) {
    throw new Error("companyId is required");
  }

  if (typeof active !== "boolean") {
    throw new Error("active must be true or false");
  }

  const queryParameters = new URLSearchParams({
    active: String(active),
  });

  const normalizedSearch = String(search ?? "").trim();

  // Search is optional. Do not send it when it is empty.
  if (normalizedSearch) {
    queryParameters.set("search", normalizedSearch);
  }

  const baseURL = APIShao.replace(/\/+$/, "");

  const endpoint =
    `${baseURL}/companies/` +
    `${encodeURIComponent(normalizedCompanyId)}/company-users/search?` +
    queryParameters.toString();

  const response = await fetch(endpoint, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `The server returned an invalid response (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        `The company-user search failed (${response.status}).`,
    );
  }

  return {
    ...data,
    result: Array.isArray(data?.result) ? data.result : [],
  };
}