import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { firebaseStorage } from "../../../../Shared/firebase/firebase";
import { ensureStorageSpace, forgetStorageFile } from "../../../../Shared/Services/StorageService";

// Uploads order-tracking stage attachments to the SAME Firebase storage.
export class OrderTrackingAttachmentUploadError extends Error {
  constructor(message, { cause } = {}) {
    super(message);
    this.name = "OrderTrackingAttachmentUploadError";
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

// companies/{companyId}/order-trackings/{orderInternalId}/{uuid}-{filename}
function buildPath(companyId, orderInternalId, file) {
  const c = String(companyId || "").trim() || "unknown-company";
  const o = String(orderInternalId || "").trim() || "unassigned";
  return `companies/${c}/order-trackings/${o}/${uniqueId()}-${safeFileName(file?.name)}`;
}

export default class OrderTrackingAttachmentUploadService {
  async uploadOne({ companyId, orderInternalId, file } = {}) {
    if (!file) throw new OrderTrackingAttachmentUploadError("No file was provided.");
    if (file.size > MAX_FILE_BYTES) {
      throw new OrderTrackingAttachmentUploadError("The file is too large. Max 10 MB.");
    }
    // Plan storage (2026-10-23): stop here when the file does not fit.
    // (shao counts the file when the stage is saved.)
    await ensureStorageSpace(companyId, file.size);

    const path = buildPath(companyId, orderInternalId, file);
    const storageRef = ref(firebaseStorage, path);
    try {
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      return { url, path, name: file.name, size: file.size, type: file.type };
    } catch (cause) {
      console.error("[OrderTrackingAttachmentUpload] failed:", cause);
      throw new OrderTrackingAttachmentUploadError("Upload failed. Please try again.", { cause });
    }
  }

  // Uploads new files; passes through already-uploaded ones (they carry a url).
  async uploadMany({ companyId, orderInternalId, attachments } = {}) {
    const list = Array.isArray(attachments) ? attachments : [];
    const out = [];
    for (const att of list) {
      if (att?.url && !att?.file) {
        out.push({
          url: att.url, storagePath: att.storagePath || att.path || "",
          fileName: att.fileName || att.name || "", fileType: att.fileType || att.type || "",
          fileSize: att.fileSize || att.size || 0,
        });
        continue;
      }
      if (!att?.file) continue;
      const up = await this.uploadOne({ companyId, orderInternalId, file: att.file });
      out.push({
        url: up.url, storagePath: up.path, fileName: up.name,
        fileType: up.type, fileSize: up.size,
      });
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
        console.error("[OrderTrackingAttachmentUpload] delete failed:", cause);
      }
    }
    await forgetStorageFile("", p);
  }
}
