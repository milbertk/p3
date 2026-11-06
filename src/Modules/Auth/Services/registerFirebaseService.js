import {
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { auth } from "../../../Shared/firebase/firebase"

export default class RegisterFirebaseService {
  /**
   * Creates a new user in Firebase Authentication using email + password.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, idToken: string}>}
   *   - user:    the Firebase user object
   *   - idToken: the freshly issued JWT to send to the backend
   */
  async registerWithEmailAndPassword(email, password) {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    await setPersistence(auth, browserLocalPersistence);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const idToken = await userCredential.user.getIdToken();

    return {
      user: userCredential.user,
      idToken,
    };
  }
}