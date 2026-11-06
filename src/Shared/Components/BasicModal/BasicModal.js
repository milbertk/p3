import React from "react";
import { Modal } from "react-bootstrap";
import { VscClose } from "react-icons/vsc";
import { useTranslation } from "react-i18next";
import "./BasicModal.scss";

export default function BasicModal({ show, setShow, name, children }) {
  const { t } = useTranslation();
  const handleClose = () => {
    setShow(false);
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      centered
      size="lg"
      backdrop="static"
      dialogClassName="basic-modal-dialog"
      contentClassName="basic-modal-content"
    >
      <Modal.Header className="basic-modal-header">
        <Modal.Title className="basic-modal-title">
          {name}
        </Modal.Title>

        <button
          type="button"
          className="basic-modal-close"
          onClick={handleClose}
          aria-label={t("common.closeModal")}
        >
          <VscClose aria-hidden="true" />
        </button>
      </Modal.Header>

      <Modal.Body className="basic-modal-body">
        {children}
      </Modal.Body>
    </Modal>
  );
}
