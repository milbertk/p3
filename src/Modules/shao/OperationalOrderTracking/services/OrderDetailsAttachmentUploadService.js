import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { firebaseStorage } from "../../../../Shared/firebase/firebase";
import { ensureStorageSpace } from "../../../../Shared/Services/StorageService";

// Uploads WHOLE-ORDER detail attachments (gift photos, delivery photos,
// signatures, invoices, documents) to Firebase storage.
export class OrderDetailsUploadError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "OrderDetailsUploadError";
    this.cause = cause;
  }
}

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

function uniqueId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function safeFileName(name) {
  return String(name || "file").toLowerCase().replace(/[^a-z0-9.\-_]/g, "-");
}

// companies/{companyId}/orders/{orderInternalId}/{uuid}-{filename}
function buildPath(companyId, orderInternalId, file) {
  const c = String(companyId || "").trim() || "unknown-company";
  const o = String(orderInternalId || "").trim() || "unassigned";
  return `companies/${c}/orders/${o}/${uniqueId()}-${safeFileName(file?.name)}`;
}

export default class OrderDetailsAttachmentUploadService {
  async uploadOne({ companyId, orderInternalId, file } = {}) {
    if (!file) throw new OrderDetailsUploadError("No file was provided.");
    if (file.size > MAX_FILE_BYTES) {
      throw new OrderDetailsUploadError("The file is too large. Max 10 MB.");
    }
    // Plan storage (2026-10-23): stop here when the file does not fit.
    // (shao counts the file when the attachment is saved.)
    await ensureStorageSpace(companyId, file.size);

    const path = buildPath(companyId, orderInternalId, file);
    const storageRef = ref(firebaseStorage, path);
    try {
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      return {
        url,
        storagePath: path,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      };
    } catch (cause) {
      console.error("[OrderDetailsUpload] failed:", cause);
      throw new OrderDetailsUploadError("Upload failed. Please try again.", { cause });
    }
  }

  // Uploads each File and returns the metadata list to send to the backend.
  async uploadMany({ companyId, orderInternalId, files } = {}) {
    const list = Array.isArray(files) ? files : [];
    const out = [];
    for (const file of list) {
      if (!file) continue;
      out.push(await this.uploadOne({ companyId, orderInternalId, file }));
    }
    return out;
  }

  async deleteByPath(path) {
    const p = String(path || "").trim();
    if (!p) return;
    try {
      await deleteObject(ref(firebaseStorage, p));
    } catch (cause) {
      if (cause?.code !== "storage/object-not-found") {
        console.error("[OrderDetailsUpload] delete failed:", cause);
      }
    }
  }
}
