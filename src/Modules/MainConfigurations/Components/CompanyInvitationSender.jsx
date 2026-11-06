import React, { useMemo, useState } from "react";
import {
  FaEnvelope,
  FaPaperPlane,
  FaCommentDots,
} from "react-icons/fa";
import { toast } from "react-toastify";


import "./CompanyInvitationSender.scss";
import SendInvitationService from "../../userComponents/services/sendInvitation";

export default function CompanyInvitationSender({ t, setRefreshCheckLogin }) {
  const invitationService = useMemo(() => new SendInvitationService(), []);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    t("companyInvitation.defaultMessage")
  );
  const [sending, setSending] = useState(false);

  const validateEmail = (value) => {
    return /\S+@\S+\.\S+/.test(value);
  };

  const handleSendInvitation = async () => {
    const targetEmail = email.trim();
    const finalMessage =
      message.trim() || t("companyInvitation.defaultMessage");

    if (!targetEmail) {
      toast.error(t("companyInvitation.emailRequired"));
      return;
    }

    if (!validateEmail(targetEmail)) {
      toast.error(t("companyInvitation.invalidEmail"));
      return;
    }

    try {
      setSending(true);

      await invitationService.sendInvitation(targetEmail, finalMessage);

      toast.success(t("companyInvitation.sentSuccess"));

      setEmail("");
      setMessage(t("companyInvitation.defaultMessage"));

      if (typeof setRefreshCheckLogin === "function") {
        setRefreshCheckLogin((prev) => !prev);
      }
    } catch (error) {
      console.error("Send invitation error:", error);
      toast.error(error.message || t("companyInvitation.sentError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="company-invitation-page">
      <div className="company-invitation-card">
        <div className="company-invitation-card__header">
          <div>
            <span className="company-invitation-card__icon">
              <FaEnvelope />
            </span>

            <h2>{t("companyInvitation.title")}</h2>
            <p>{t("companyInvitation.subtitle")}</p>
          </div>

          <span className="company-invitation-card__badge">
            {t("companyInvitation.invitation")}
          </span>
        </div>

        <div className="company-invitation-form">
          <label>
            <FaEnvelope />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("companyInvitation.emailPlaceholder")}
              disabled={sending}
            />
          </label>

          <label className="message-box">
            <FaCommentDots />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("companyInvitation.messagePlaceholder")}
              rows={5}
              disabled={sending}
            />
          </label>

          <div className="invitation-preview">
            <strong>{t("companyInvitation.previewTitle")}</strong>
            <p>{message}</p>
            <small>{t("companyInvitation.linkNotice")}</small>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={handleSendInvitation}
            disabled={sending}
          >
            <FaPaperPlane />

            {sending
              ? t("companyInvitation.sending")
              : t("companyInvitation.send")}
          </button>
        </div>
      </div>
    </section>
  );
}