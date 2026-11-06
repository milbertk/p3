import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { firebaseStorage } from "../../../../Shared/firebase/firebase";
import { ensureStorageSpace, forgetStorageFile } from "../../../../Shared/Services/StorageService";

// Reuses the SAME Firebase app/storage as the product images and the login.
// Adjust the import path above if your firebase.js lives elsewhere.

export class OrderAttachmentUploadError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "OrderAttachmentUploadError";
    this.cause = cause;
  }
}

// Order attachments can be images OR documents.
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeFileName(name) {
  return String(name || "file")
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-");
}

// Build the storage path:
//   companies/{companyId}/orders/{orderInternalId}/{uuid}-{filename}
//
// When creating an order there is no orderInternalId yet, so it falls back to
// an "unassigned" folder. The file name is always unique (uuid).
function buildStoragePath(companyId, orderInternalId, file) {
  const company = String(companyId || "").trim() || "unknown-company";
  const orderFolder = String(orderInternalId || "").trim() || "unassigned";
  const fileName = `${uniqueId()}-${safeFileName(file?.name)}`;

  return `companies/${company}/orders/${orderFolder}/${fileName}`;
}

export default class OrderAttachmentUploadService {
  /**
   * Uploads ONE order attachment (image or document) to Firebase Storage and
   * returns its public download URL plus the storage path.
   *
   * @param {object} params
   * @param {string} params.companyId
   * @param {string} [params.orderInternalId]  optional; groups files per order
   * @param {File}   params.file
   * @returns {Promise<{ url, path, name, size, type }>}
   */
  async uploadOrderAttachment({ companyId, orderInternalId, file } = {}) {
    if (!file) {
      throw new OrderAttachmentUploadError("No file was provided.");
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      throw new OrderAttachmentUploadError(
        "Unsupported file type. Use images, PDF, Word or Excel.",
      );
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new OrderAttachmentUploadError(
        "The file is too large. Maximum size is 10 MB.",
      );
    }

    // Plan storage (2026-10-23): stop here when the file does not fit.
    // (shao counts the file when the order is saved.)
    await ensureStorageSpace(companyId, file.size);

    const path = buildStoragePath(companyId, orderInternalId, file);
    const storageRef = ref(firebaseStorage, path);

    try {
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      return {
        url,
        path,
        name: file.name,
        size: file.size,
        type: file.type,
      };
    } catch (cause) {
      console.error("[OrderAttachmentUploadService] Upload failed:", cause);
      throw new OrderAttachmentUploadError(
        "The file could not be uploaded. Please try again.",
        { cause },
      );
    }
  }

  /**
   * Uploads MANY attachments; returns the list of uploaded results.
   * Files that already have a url (previously uploaded) are passed through.
   */
  async uploadManyOrderAttachments({ companyId, orderInternalId, attachments } = {}) {
    const list = Array.isArray(attachments) ? attachments : [];
    const results = [];

    for (const attachment of list) {
      // Already uploaded (has a url and no new File) -> keep as is.
      if (attachment?.url && !attachment?.file) {
        results.push({
          url: attachment.url,
          path: attachment.path || "",
          name: attachment.name || "",
          size: attachment.size || 0,
          type: attachment.type || "",
        });
        continue;
      }

      if (!attachment?.file) {
        continue; // nothing to upload (e.g. a mock placeholder)
      }

      const uploaded = await this.uploadOrderAttachment({
        companyId,
        orderInternalId,
        file: attachment.file,
      });
      results.push(uploaded);
    }

    return results;
  }

  /** Deletes one attachment by its storage path. Best-effort. */
  async deleteOrderAttachment(path) {
    const normalizedPath = String(path || "").trim();
    if (!normalizedPath) return;

    try {
      await deleteObject(ref(firebaseStorage, normalizedPath));
    } catch (cause) {
      if (cause?.code !== "storage/object-not-found") {
        console.error("[OrderAttachmentUploadService] Delete failed:", cause);
      }
    }
    await forgetStorageFile("", normalizedPath);
  }
}
