import SelectedCompanyStorage from "./SELECTED_COMPANY_STORAGE_KEY";

export default class CompanySelectionValidator {
  static validate() {
    try {
      const company =
        SelectedCompanyStorage.getCompany();

      const companyId =
        company?.companyId ||
        company?.id ||
        "";

      const companyName =
        company?.companyName ||
        company?.name ||
        "";

      const isValid = Boolean(
        String(companyId).trim() &&
        String(companyName).trim()
      );

      if (!isValid) {
        return {
          isValid: false,
          hasCompany: false,
          code: "COMPANY_NOT_SELECTED",
          companyId: "",
          companyName: "",
          messageKey:
            "companyValidation.companyRequired",
          defaultMessage:
            "You must select a company before using this option.",
        };
      }

      return {
        isValid: true,
        hasCompany: true,
        code: "COMPANY_SELECTED",
        companyId: String(companyId),
        companyName: String(companyName),
        messageKey: "",
        defaultMessage: "",
      };
    } catch (error) {
      console.error(
        "Error validating selected company:",
        error
      );

      return {
        isValid: false,
        hasCompany: false,
        code: "COMPANY_VALIDATION_ERROR",
        companyId: "",
        companyName: "",
        messageKey:
          "companyValidation.validationError",
        defaultMessage:
          "We could not validate the selected company. Please select a company and try again.",
      };
    }
  }

  static hasSelectedCompany() {
    return this.validate().isValid;
  }

  static getCompanyId() {
    const validation = this.validate();

    return validation.isValid
      ? validation.companyId
      : null;
  }

  static getCompanyName() {
    const validation = this.validate();

    return validation.isValid
      ? validation.companyName
      : null;
  }

  static requireCompany() {
    const validation = this.validate();

    if (!validation.isValid) {
      const error = new Error(
        validation.defaultMessage
      );

      error.code = validation.code;
      error.messageKey =
        validation.messageKey;

      throw error;
    }

    return validation;
  }
}