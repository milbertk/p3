import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { firebaseStorage } from "../../../../Shared/firebase/firebase";
import { ensureStorageSpace, forgetStorageFile, registerStorageFile, STORAGE_KINDS } from "../../../../Shared/Services/StorageService";

// Reuse the SAME Firebase app used for LOGIN. Adjust this path to where your
// firebase.js actually lives (the one that exports firebaseStorage).
// Examples depending on your structure:
//   "../../../firebase"
//   "../../../Shared/firebase"
//   "../../../Shared/Firebase/firebase"
//import { firebaseStorage } from "../../../firebase";

export class ProductImageUploadError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "ProductImageUploadError";
    this.cause = cause;
  }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Generate a unique id even if crypto.randomUUID is unavailable.
function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Keep only safe characters for a storage object name.
function safeFileName(name) {
  return String(name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-");
}

// Build the storage path:
//   companies/{companyId}/products/{productInternalId}/{uuid}-{filename}
//
// When creating a product there is no productInternalId yet, so it falls back
// to an "unassigned" folder. The file name is always unique (uuid), so nothing
// is overwritten.
function buildStoragePath(companyId, productInternalId, file) {
  const company = String(companyId || "").trim() || "unknown-company";
  const product = String(productInternalId || "").trim() || "unassigned";
  const fileName = `${uniqueId()}-${safeFileName(file?.name)}`;

  return `companies/${company}/products/${product}/${fileName}`;
}

export default class ProductImageUploadService {
  /**
   * Uploads a product image to Firebase Storage and returns its public
   * download URL plus the storage path (store both; path lets you delete later).
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {string} [params.productInternalId]  optional; groups images per product
   * @param {File}   params.file
   * @returns {Promise<{ url: string, path: string }>}
   */
  async uploadProductImage({ companyId, productInternalId, file } = {}) {
    if (!file) {
      throw new ProductImageUploadError("No image file was provided.");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ProductImageUploadError(
        "Unsupported image type. Use JPG, PNG, WEBP or GIF."
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ProductImageUploadError(
        "The image is too large. Maximum size is 5 MB."
      );
    }

    // Plan storage (2026-10-23): stop here when the file does not fit.
    await ensureStorageSpace(companyId, file.size);

    const path = buildStoragePath(companyId, productInternalId, file);
    const storageRef = ref(firebaseStorage, path);

    try {
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await registerStorageFile(companyId, { storagePath: path, sizeBytes: file.size, kind: STORAGE_KINDS.productImage });
      return { url, path };
    } catch (cause) {
      console.error("[ProductImageUploadService] Upload failed:", cause);
      throw new ProductImageUploadError(
        "The image could not be uploaded. Please try again.",
        { cause }
      );
    }
  }

  /**
   * Deletes a previously uploaded image by its storage path. Best-effort:
   * a missing object does not throw.
   */
  async deleteProductImage(path) {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) return;

    try {
      await deleteObject(ref(firebaseStorage, normalizedPath));
    } catch (cause) {
      if (cause?.code !== "storage/object-not-found") {
        console.error("[ProductImageUploadService] Delete failed:", cause);
      }
    }
    await forgetStorageFile("", normalizedPath);
  }
}