const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

export default class SelectedCompanyStorage {
  static getCompanyId() {
    try {
      const rawValue = localStorage.getItem(
        SELECTED_COMPANY_STORAGE_KEY
      );

      if (!rawValue) {
        return null;
      }

      const storedCompany = JSON.parse(rawValue);

      return (
        storedCompany?.companyId ||
        storedCompany?.id ||
        null
      );
    } catch (error) {
      console.error(
        "Error reading selected company ID:",
        error
      );

      return null;
    }
  }

  static getCompanyName() {
    try {
      const rawValue = localStorage.getItem(
        SELECTED_COMPANY_STORAGE_KEY
      );

      if (!rawValue) {
        return null;
      }

      const storedCompany = JSON.parse(rawValue);

      return (
        storedCompany?.companyName ||
        storedCompany?.name ||
        null
      );
    } catch (error) {
      console.error(
        "Error reading selected company name:",
        error
      );

      return null;
    }
  }

  static getCompany() {
    try {
      const rawValue = localStorage.getItem(
        SELECTED_COMPANY_STORAGE_KEY
      );

      if (!rawValue) {
        return null;
      }

      const storedCompany = JSON.parse(rawValue);

      const companyId =
        storedCompany?.companyId ||
        storedCompany?.id ||
        null;

      const companyName =
        storedCompany?.companyName ||
        storedCompany?.name ||
        null;

      if (!companyId || !companyName) {
        return null;
      }

      return {
        companyId: String(companyId),
        companyName: String(companyName),
      };
    } catch (error) {
      console.error(
        "Error reading selected company:",
        error
      );

      return null;
    }
  }

  static saveCompany(company) {
    if (!company) {
      return false;
    }

    const companyId =
      company?.companyId ||
      company?.id;

    const companyName =
      company?.companyName ||
      company?.name;

    if (!companyId || !companyName) {
      return false;
    }

    const storageValue = {
      companyId: String(companyId),
      companyName: String(companyName),
    };

    localStorage.setItem(
      SELECTED_COMPANY_STORAGE_KEY,
      JSON.stringify(storageValue)
    );

    return true;
  }

  static removeCompany() {
    localStorage.removeItem(
      SELECTED_COMPANY_STORAGE_KEY
    );
  }

  static hasCompany() {
    return this.getCompanyId() !== null;
  }
}