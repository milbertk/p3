import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class TransferCompanyOwnerService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async transferCompanyOwner({ companyId, newOwnerUid }) {
    const response = await fetch(`${this.baseUrl}/transfercompanyowner`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        companyId,
        newOwnerUid,
      }),
    });

    const rawText = await response.text();

    let data = null;

    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Invalid JSON from server. Status ${response.status}. First 200 chars: ${rawText.slice(
            0,
            200
          )}`
        );
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          `Company owner transfer failed with status ${response.status}`
      );
    }

    return (
      data || {
        status: "OK",
        message: "Company owner updated successfully.",
        data: null,
      }
    );
  }
}