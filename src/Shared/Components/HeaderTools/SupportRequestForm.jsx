import React, { useEffect, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaEnvelope,
  FaImage,
  FaLifeRing,
  FaPaperPlane,
  FaPhoneAlt,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";

import "./SupportRequestForm.scss";
import { readSelectedCompany, sendSupportRequest, uploadSupportImages } from "./SupportRequestService";
import useCaptcha, { CaptchaWidget } from "../../Hooks/useCaptcha";

const CONTACT_METHODS = [
  { value: "email", icon: <FaEnvelope />, inputType: "email" },
  { value: "phone", icon: <FaPhoneAlt />, inputType: "tel" },
  { value: "whatsapp", icon: <FaWhatsapp />, inputType: "tel" },
  // "videoCall" removed from the options (QA 2026-10-29); the backend still accepts it.
];
const TIME_SLOTS = ["morning", "afternoon", "evening"];
const CATEGORIES = ["technical", "account", "billing", "howTo", "other"];
const PRIORITIES = ["low", "normal", "high"];

const MAX_IMAGES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const EMPTY_FORM = {
  contactMethod: "email",
  contactValue: "",
  preferredDate: "",
  timeSlots: [],
  category: "technical",
  priority: "normal",
  subject: "",
  description: "",
};

function todayInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// Text with an English fallback when the key is missing in the locale file.
const tr = (t, key, fallback, options = {}) => t(key, { defaultValue: fallback, ...options });

export default function SupportRequestForm({ t, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]); // { id, file, url }
  const [imageError, setImageError] = useState("");
  const [sending, setSending] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [sendError, setSendError] = useState("");
  // CAPTCHA (Cloudflare Turnstile, 2026-10-25).
  const captcha = useCaptcha();
  const captchaLanguage = (document.documentElement.lang || navigator.language || "en").slice(0, 2);

  // Release the remaining preview URLs when the form closes.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((image) => URL.revokeObjectURL(image.url)), []);

  const method = CONTACT_METHODS.find((item) => item.value === form.contactMethod);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const toggleTimeSlot = (slot) => {
    setForm((current) => ({
      ...current,
      timeSlots: current.timeSlots.includes(slot)
        ? current.timeSlots.filter((item) => item !== slot)
        : [...current.timeSlots, slot],
    }));
  };

  const addImages = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setImageError("");

    const valid = [];
    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setImageError(t("supportRequest.errors.imageType"));
      } else if (file.size > MAX_IMAGE_BYTES) {
        setImageError(t("supportRequest.errors.imageSize"));
      } else {
        valid.push(file);
      }
    }

    const free = MAX_IMAGES - images.length;
    if (valid.length > free) setImageError(t("supportRequest.errors.imageCount", { max: MAX_IMAGES }));

    const added = valid.slice(0, Math.max(free, 0)).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((current) => [...current, ...added]);
  };

  const removeImage = (id) => {
    const removed = images.find((image) => image.id === id);
    if (removed) URL.revokeObjectURL(removed.url);
    setImages((current) => current.filter((image) => image.id !== id));
  };

  // Real send (2026-10-24): screenshots go to Firebase Storage (best effort),
  // then the request is saved in usersAK, which emails the support team.
  const submit = async (event) => {
    event.preventDefault();
    if (sending) return;
    if (!captcha.ready) {
      setSendError(tr(t, "supportRequest.errors.captchaPending", "Please complete the security check above the buttons."));
      return;
    }
    setSending(true);
    setSendError("");

    try {
      const { companyId, companyName } = readSelectedCompany();
      const { urls, failed } = await uploadSupportImages(companyId, images.map((image) => image.file));

      const result = await sendSupportRequest({
        companyId,
        companyName,
        platform: "shao",
        category: form.category,
        priority: form.priority,
        subject: form.subject.trim(),
        description: form.description.trim(),
        contactMethod: form.contactMethod,
        contactValue: form.contactValue.trim(),
        preferredDate: form.preferredDate,
        timeSlots: form.timeSlots,
        imageUrls: urls,
        currentPath: window.location.pathname,
        language: (document.documentElement.lang || navigator.language || "en").slice(0, 2),
      }, captcha.token);

      setTicket({
        code: result?.ticketCode || "",
        method: form.contactMethod,
        contactValue: form.contactValue,
        imagesSkipped: failed,
      });
    } catch (error) {
      console.error("Support request error:", error);
      if (error?.code === "CAPTCHA") {
        setSendError(tr(t, "supportRequest.errors.captchaFailed", "The security check failed. Please complete it again and resend."));
      } else if (error?.code === "TOO_MANY") {
        setSendError(tr(t, "supportRequest.errors.tooMany", "You sent many requests today. Please try again tomorrow or contact us by WhatsApp."));
      } else if (error?.code === "INVALID") {
        setSendError(tr(t, "supportRequest.errors.invalid", "Please check the form data and try again."));
      } else {
        setSendError(tr(t, "supportRequest.errors.send", "We could not send your request. Please try again in a few minutes."));
      }
    } finally {
      setSending(false);
      captcha.reset(); // a CAPTCHA token works only once
    }
  };

  const startNewRequest = () => {
    images.forEach((image) => URL.revokeObjectURL(image.url));
    setForm(EMPTY_FORM);
    setImages([]);
    setTicket(null);
    setSendError("");
  };

  if (ticket) {
    return (
      <section className="support-request support-request--sent">
        <FaCheckCircle className="support-request__sent-icon" />
        <h2>{t("supportRequest.sent.title")}</h2>
        <p>
          {t("supportRequest.sent.description", {
            method: t(`supportRequest.methods.${ticket.method}`).toLowerCase(),
            contact: ticket.contactValue,
          })}
        </p>
        {ticket.code && <strong className="support-request__ticket">{ticket.code}</strong>}
        {ticket.imagesSkipped > 0 && (
          <small className="support-request__demo-note">
            {tr(t, "supportRequest.sent.imagesSkipped", "Some screenshots could not be uploaded. The request was sent without them.")}
          </small>
        )}
        <div className="support-request__actions">
          <button type="button" className="support-request__secondary" onClick={startNewRequest}>
            {t("supportRequest.actions.newRequest")}
          </button>
          <button type="button" className="support-request__primary" onClick={onClose}>
            {t("supportRequest.actions.close")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <form className="support-request" onSubmit={submit}>
      <div className="support-request__heading">
        <span><FaLifeRing /></span>
        <div>
          <h2>{t("supportRequest.title")}</h2>
          <p>{t("supportRequest.description")}</p>
        </div>
      </div>

      <fieldset className="support-request__section">
        <legend>{t("supportRequest.sections.contact")}</legend>
        <div className="support-request__methods" role="radiogroup">
          {CONTACT_METHODS.map((item) => (
            <label key={item.value} className={form.contactMethod === item.value ? "is-selected" : ""}>
              <input
                type="radio"
                name="contactMethod"
                value={item.value}
                checked={form.contactMethod === item.value}
                onChange={updateField}
              />
              {item.icon}
              <span>{t(`supportRequest.methods.${item.value}`)}</span>
            </label>
          ))}
        </div>
        <label className="support-request__field">
          <span>{t(`supportRequest.contactLabels.${form.contactMethod}`)}</span>
          <input
            name="contactValue"
            type={method.inputType}
            value={form.contactValue}
            onChange={updateField}
            placeholder={t(`supportRequest.contactPlaceholders.${method.inputType}`)}
            required
          />
        </label>
      </fieldset>

      <fieldset className="support-request__section">
        <legend>{t("supportRequest.sections.availability")}</legend>
        <div className="support-request__row">
          <label className="support-request__field">
            <span>{t("supportRequest.fields.preferredDate")}</span>
            <input name="preferredDate" type="date" min={todayInputValue()} value={form.preferredDate} onChange={updateField} />
          </label>
          <div className="support-request__field">
            <span>{t("supportRequest.fields.timeSlots")}</span>
            <div className="support-request__slots">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={form.timeSlots.includes(slot) ? "is-selected" : ""}
                  onClick={() => toggleTimeSlot(slot)}
                  aria-pressed={form.timeSlots.includes(slot)}
                >
                  {t(`supportRequest.timeSlots.${slot}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="support-request__section">
        <legend>{t("supportRequest.sections.issue")}</legend>
        <div className="support-request__row">
          <label className="support-request__field">
            <span>{t("supportRequest.fields.category")}</span>
            <select name="category" value={form.category} onChange={updateField}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{t(`supportRequest.categories.${category}`)}</option>
              ))}
            </select>
          </label>
          <label className="support-request__field">
            <span>{t("supportRequest.fields.priority")}</span>
            <select name="priority" value={form.priority} onChange={updateField}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{t(`supportRequest.priorities.${priority}`)}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="support-request__field">
          <span>{t("supportRequest.fields.subject")}</span>
          <input
            name="subject"
            value={form.subject}
            onChange={updateField}
            placeholder={t("supportRequest.placeholders.subject")}
            maxLength={120}
            required
          />
        </label>
        <label className="support-request__field">
          <span>{t("supportRequest.fields.description")}</span>
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            placeholder={t("supportRequest.placeholders.description")}
            rows={4}
            maxLength={2000}
            required
          />
        </label>

        <div className="support-request__field">
          <span>{t("supportRequest.fields.images", { max: MAX_IMAGES })}</span>
          <div className="support-request__images">
            {images.map((image) => (
              <figure key={image.id}>
                <img src={image.url} alt={image.file.name} />
                <button type="button" onClick={() => removeImage(image.id)} aria-label={t("supportRequest.actions.removeImage")}>
                  <FaTimes />
                </button>
              </figure>
            ))}
            {images.length < MAX_IMAGES && (
              <label className="support-request__add-image">
                <FaImage />
                <span>{t("supportRequest.actions.addImage")}</span>
                <input type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} multiple onChange={addImages} />
              </label>
            )}
          </div>
          <small>{t("supportRequest.help.images")}</small>
          {imageError && <small className="support-request__error">{imageError}</small>}
        </div>
      </fieldset>

      <CaptchaWidget captcha={captcha} language={captchaLanguage} />
      {sendError && <p className="support-request__error" role="alert">{sendError}</p>}

      <div className="support-request__actions">
        <button type="button" className="support-request__secondary" onClick={onClose} disabled={sending}>
          {t("supportRequest.actions.cancel")}
        </button>
        <button type="submit" className="support-request__primary" disabled={sending}>
          <FaPaperPlane /> {t(sending ? "supportRequest.actions.sending" : "supportRequest.actions.send")}
        </button>
      </div>
    </form>
  );
}
