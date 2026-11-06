import { APIShao, APIUsers } from "../Utils/globalVar";

// Platforms the chat can send. The backends use them to pick the context.
export const ASSISTANT_PLATFORMS = {
  SERVICE_HUB: "ServiceHub",
  GENERAL: "UserManagement",
};

// Agents (backends) that answer the chat. Each one keeps its own conversations.
//   shao  -> Service Hub agent, can read the company's data (needs a company)
//   users -> general agent in usersAppAK (account, companies, general help)
export const ASSISTANT_AGENTS = {
  SHAO: "shao",
  USERS: "users",
};

/** Platform of the current screen: every /shao/... page is Service Hub. */
export function platformForPath(pathname) {
  return String(pathname || "").toLowerCase().startsWith("/shao")
    ? ASSISTANT_PLATFORMS.SERVICE_HUB
    : ASSISTANT_PLATFORMS.GENERAL;
}

/**
 * Agent that must answer. Service Hub questions go to shao only when a
 * company is selected (shao works inside one company); otherwise usersAppAK.
 */
export function resolveAssistantAgent(platform, companyId) {
  const hasCompany = String(companyId || "").trim() !== "";
  return platform === ASSISTANT_PLATFORMS.SERVICE_HUB && hasCompany
    ? ASSISTANT_AGENTS.SHAO
    : ASSISTANT_AGENTS.USERS;
}

export default class AiAssistantService {
  constructor(usersBaseUrl = APIUsers, shaoBaseUrl = APIShao) {
    this.usersBaseUrl = String(usersBaseUrl || "").replace(/\/$/, "");
    this.shaoBaseUrl = String(shaoBaseUrl || "").replace(/\/$/, "");
  }

  /**
   * Sends a question to the AI agent chosen by `agent`:
   *   shao  -> POST {APIShao}/companies/{companyId}/assistant/ask (response in `result`)
   *   users -> POST {APIUsers}/aichat                              (response in `data`)
   * Both return { conversationId, reply, ... }.
   * Auth goes in the access_token cookie (credentials: "include").
   */
  async sendMessage(
    { agent, conversationId, message, platform, companyId, companyName, currentPath, language },
    signal
  ) {
    const useShao = agent === ASSISTANT_AGENTS.SHAO;
    const normalizedCompanyId = String(companyId || "").trim();

    const url = useShao
      ? `${this.shaoBaseUrl}/companies/${encodeURIComponent(normalizedCompanyId)}/assistant/ask`
      : `${this.usersBaseUrl}/aichat`;

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId: conversationId || "",
        message,
        platform: platform || "",
        companyId: normalizedCompanyId,
        companyName: companyName || "",
        currentPath: currentPath || "",
        language: language || "",
      }),
      signal,
    });

    const rawText = await response.text();

    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        const error = new Error(
          `Invalid JSON from server. Status ${response.status}. First 200 chars: ${rawText.slice(
            0,
            200
          )}`
        );
        error.status = response.status;
        throw error;
      }
    }

    if (!response.ok) {
      const error = new Error(
        data?.message || `AI assistant request failed with status ${response.status}`
      );
      error.status = response.status;
      // AI_NOT_IN_PLAN | AI_MONTHLY_INTERACTIONS | AI_MONTHLY_LIMIT | AI_DAILY_LIMIT (shao agent).
      error.code = data?.result?.code || "";
      throw error;
    }

    return (useShao ? data?.result : data?.data) || null;
  }
}
