import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { firebaseStorage } from "../../../../Shared/firebase/firebase";
import { ensureStorageSpace, forgetStorageFile, registerStorageFile, STORAGE_KINDS } from "../../../../Shared/Services/StorageService";

export class PageConfigurationImageUploadError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "PageConfigurationImageUploadError";
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

// Image kinds the backend accepts; each one is stored in its own folder.
const IMAGE_KINDS = ["logo", "header"];

// Storage path: companies/{companyId}/page-configuration/{kind}/{uuid}-{filename}
// The backend only accepts paths inside the folder of each kind.
function buildStoragePath(companyId, kind, file) {
  const company = String(companyId || "").trim();
  return `companies/${company}/page-configuration/${kind}/${uniqueId()}-${safeFileName(file?.name)}`;
}

export default class PageConfigurationImageUploadService {
  /**
   * Uploads a page image (logo or header) to Firebase Storage.
   *
   * @param {"logo"|"header"} params.kind
   * @returns {Promise<{ url: string, path: string }>}
   */
  async uploadImage({ companyId, kind, file } = {}) {
    if (!String(companyId || "").trim()) {
      throw new PageConfigurationImageUploadError("The selected company ID is required.");
    }
    if (!IMAGE_KINDS.includes(kind)) {
      throw new PageConfigurationImageUploadError(`Unknown image kind: ${kind}`);
    }
    if (!file) {
      throw new PageConfigurationImageUploadError("No image file was provided.");
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new PageConfigurationImageUploadError(
        "Unsupported image type. Use JPG, PNG, WEBP or GIF."
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new PageConfigurationImageUploadError(
        "The image is too large. Maximum size is 5 MB."
      );
    }

    // Plan storage (2026-10-23): stop here when the file does not fit.
    // PAGE_IMAGE (2026-10-29): allowed without a plan (basic company).
    await ensureStorageSpace(companyId, file.size, STORAGE_KINDS.pageImage);

    const path = buildStoragePath(companyId, kind, file);
    const storageRef = ref(firebaseStorage, path);

    try {
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      await registerStorageFile(companyId, { storagePath: path, sizeBytes: file.size, kind: STORAGE_KINDS.pageImage });
      return { url, path };
    } catch (cause) {
      console.error("[PageConfigurationImageUploadService] Upload failed:", cause);
      throw new PageConfigurationImageUploadError(
        "The image could not be uploaded. Please try again.",
        { cause }
      );
    }
  }

  /**
   * Deletes a previously uploaded image by its storage path. Best-effort:
   * a missing object does not throw.
   */
  async deleteImage(path) {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) return;

    try {
      await deleteObject(ref(firebaseStorage, normalizedPath));
    } catch (cause) {
      if (cause?.code !== "storage/object-not-found") {
        console.error("[PageConfigurationImageUploadService] Delete failed:", cause);
      }
    }
    await forgetStorageFile("", normalizedPath);
  }
}
