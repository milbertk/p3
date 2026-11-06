import { APIUsers } from "../../../Shared/Utils/globalVar";

export default class CreateUserService {
  constructor(baseUrl = APIUsers) {
    this.baseUrl = baseUrl;
  }

  async createUserFromFirebaseToken(firebaseToken) {
    const response = await fetch(`${this.baseUrl}/createuser`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Error creating local user.");
    }

    return data;
  }
}