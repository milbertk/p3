import React, { useMemo, useState } from "react";
import {
  FaUserPlus,
  FaIdCard,
  FaUser,
  FaAt,
  FaPhoneAlt,
  FaGlobe,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaCommentDots,
  FaSave,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShareAlt,
  FaAddressBook,
  FaSearch,
  FaEdit,
  FaPlus,
} from "react-icons/fa";

import {
  Alert,
  Badge,
  Button,
  Col,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";


import "./CustomerCreateForm.scss";
import BasicModal from "../../../../Shared/Components/BasicModal/BasicModal";
import SearchCustomersService from "../services/SearchCustomersService";
import SelectCustomerService from "../services/SelectCustomerService";
import SaveCustomerService from "../services/SaveCustomerService";

// Selected company is persisted by the header/menu. Read it from localStorage.
const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const searchCustomersService = new SearchCustomersService();
const selectCustomerService = new SelectCustomerService();
const saveCustomerService = new SaveCustomerService();

function readSelectedCompanyId() {
  try {
    const raw = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);
    if (!raw) return "";

    const parsed = JSON.parse(raw);
    return String(parsed?.companyId || parsed?.id || "").trim();
  } catch {
    return "";
  }
}

// Fields that always carry a default value; they must NOT count as
// "user-filled" when checking that at least one field has content.
const DEFAULT_VALUE_FIELDS = [
  "socialNetwork",
  "status",
  "category",
  "preferredContactMethod",
];

const initialFormState = {
  customerId: "",
  name: "",
  alias: "",
  cellphone: "",
  socialNetwork: "WHATSAPP",
  socialNetworkLink: "",
  birthday: "",
  email: "",
  address: "",
  website: "",
  status: "ACTIVE",
  category: "A",
  preferredContactMethod: "WHATSAPP",
  comments: "",
};

const socialNetworkOptions = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "TIKTOK", label: "TikTok" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "X", label: "X / Twitter" },
  { value: "YOUTUBE", label: "YouTube" },
  { value: "OTHER", label: "Other" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PROSPECT", label: "Prospect" },
  { value: "BLOCKED", label: "Blocked" },
];

const categoryOptions = [
  { value: "A", label: "A - High value" },
  { value: "B", label: "B - Frequent customer" },
  { value: "C", label: "C - Occasional customer" },
  { value: "D", label: "D - Low activity" },
];

const preferredContactOptions = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "PHONE", label: "Phone call" },
  { value: "EMAIL", label: "Email" },
  { value: "SOCIAL_NETWORK", label: "Social network" },
  { value: "NONE", label: "No preference" },
];


function isValidEmail(value) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function getCustomerValue(customer, camelCaseKey, snakeCaseKey) {
  return customer?.[camelCaseKey] ?? customer?.[snakeCaseKey] ?? "";
}

function customerToFormState(customer) {
  const birthday = getCustomerValue(customer, "birthday", "birthday");

  return {
    customerId: String(getCustomerValue(customer, "customerId", "customer_id")),
    name: String(getCustomerValue(customer, "name", "name")),
    alias: String(getCustomerValue(customer, "alias", "alias")),
    cellphone: String(getCustomerValue(customer, "cellphone", "cellphone")),
    socialNetwork:
      getCustomerValue(customer, "socialNetwork", "social_network") ||
      "WHATSAPP",
    socialNetworkLink: String(
      getCustomerValue(customer, "socialNetworkLink", "social_network_link"),
    ),
    birthday: birthday ? String(birthday).slice(0, 10) : "",
    email: String(getCustomerValue(customer, "email", "email")),
    address: String(getCustomerValue(customer, "address", "address")),
    website: String(getCustomerValue(customer, "website", "website")),
    status: getCustomerValue(customer, "status", "status") || "ACTIVE",
    category: getCustomerValue(customer, "category", "category") || "A",
    preferredContactMethod:
      getCustomerValue(
        customer,
        "preferredContactMethod",
        "preferred_contact_method",
      ) || "WHATSAPP",
    comments: String(getCustomerValue(customer, "comments", "comments")),
  };
}

function getCustomerInternalId(customer) {
  return (
    customer?.customerInternalId ??
    customer?.customer_internal_id ??
    customer?.id ??
    null
  );
}

export default function CustomerCreateForm({
  t,
  onSubmit = async () => {},
  onUpdate = async () => {},
  onSearchCustomers,
  onCancel = () => {},
  // Optional (2026-10-30): values to start a NEW customer with (e.g. the name
  // typed in the order screen) and a callback with the saved customer, used
  // when this form is opened as a pop-up from another screen.
  initialValues = null,
  onSaved = () => {},
}) {
  const [formData, setFormData] = useState(() => ({
    ...initialFormState,
    ...(initialValues || {}),
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const isEditing = Boolean(editingCustomerId);

  const tr = useMemo(() => {
    return (key, fallback) => {
      try {
        if (typeof t !== "function") return fallback;

        const translatedValue = t(key);

        if (!translatedValue || translatedValue === key) {
          return fallback;
        }

        return translatedValue;
      } catch {
        return fallback;
      }
    };
  }, [t]);

  const selectedStatus = useMemo(() => {
    return statusOptions.find((item) => item.value === formData.status);
  }, [formData.status]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setGeneralError("");
    setSuccessMessage("");
  };

  const validateForm = () => {
    const validationErrors = {};

    const customerId = normalizeText(formData.customerId);
    const name = normalizeText(formData.name);
    const cellphone = normalizeText(formData.cellphone);
    const email = normalizeText(formData.email);
    const website = normalizeText(formData.website);
    const socialNetworkLink = normalizeText(formData.socialNetworkLink);

    if (!customerId) {
      validationErrors.customerId = tr(
        "customers.create.validation.customerIdRequired",
        "Customer ID is required.",
      );
    }

    if (!name) {
      validationErrors.name = tr(
        "customers.create.validation.nameRequired",
        "Customer name is required.",
      );
    }

    if (cellphone && cellphone.replace(/\D/g, "").length < 8) {
      validationErrors.cellphone = tr(
        "customers.create.validation.cellphoneInvalid",
        "Enter a valid cellphone number.",
      );
    }

    if (email && !isValidEmail(email)) {
      validationErrors.email = tr(
        "customers.create.validation.emailInvalid",
        "Enter a valid email address.",
      );
    }

    if (website && !isValidUrl(website)) {
      validationErrors.website = tr(
        "customers.create.validation.websiteInvalid",
        "Enter a valid website URL. Example: https://example.com",
      );
    }

    if (socialNetworkLink && !isValidUrl(socialNetworkLink)) {
      validationErrors.socialNetworkLink = tr(
        "customers.create.validation.socialNetworkLinkInvalid",
        "Enter a valid social network link. Example: https://...",
      );
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = () => {
    return {
      customerId: normalizeText(formData.customerId),
      name: normalizeText(formData.name),
      alias: normalizeText(formData.alias),
      cellphone: normalizeText(formData.cellphone),
      socialNetwork: normalizeText(formData.socialNetwork),
      socialNetworkLink: normalizeText(formData.socialNetworkLink),
      birthday: normalizeText(formData.birthday),
      email: normalizeText(formData.email).toLowerCase(),
      address: normalizeText(formData.address),
      website: normalizeText(formData.website),
      status: normalizeText(formData.status),
      category: normalizeText(formData.category),
      preferredContactMethod: normalizeText(formData.preferredContactMethod),
      comments: normalizeText(formData.comments),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setGeneralError("");
    setSuccessMessage("");

    if (!validateForm()) return;

    const payload = buildPayload();

    // At least one USER-filled field must have content. Fields that always
    // carry a default value (WHATSAPP / ACTIVE / A) do not count.
    const hasUserContent = Object.entries(payload).some(
      ([key, value]) =>
        !DEFAULT_VALUE_FIELDS.includes(key) &&
        String(value ?? "").trim() !== "",
    );

    if (!hasUserContent) {
      setGeneralError(
        tr(
          "customers.save.empty",
          "Fill in at least one field before saving.",
        ),
      );
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setGeneralError(
        tr(
          "customers.save.missingCompany",
          "No company is selected. Please select a company first.",
        ),
      );
      return;
    }

    setSaving(true);

    try {
      // Create vs update is decided by the BACKEND from customerInternalId:
      // empty -> create, present -> update. The frontend only sends the data.
      const customer = {
        ...payload,
        customerInternalId: editingCustomerId || "",
      };

      const saveResponse = await saveCustomerService.saveCustomer({ companyId, customer });

      setSuccessMessage(
        isEditing
          ? tr("customers.update.success", "Customer updated successfully.")
          : tr("customers.create.success", "Customer created successfully."),
      );

      setFormData(initialFormState);
      setErrors({});
      setEditingCustomerId(null);

      // Tell the screen that opened this form (pop-up mode) which customer was saved.
      onSaved(saveResponse?.result || { ...customer });
    } catch (error) {
      console.error(
        isEditing ? "Error updating customer:" : "Error creating customer:",
        error,
      );

      setGeneralError(
        error?.message ||
          (isEditing
            ? tr(
                "customers.update.error",
                "The customer could not be updated. Please try again.",
              )
            : tr(
                "customers.create.error",
                "The customer could not be created. Please try again.",
              )),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setErrors({});
    setGeneralError("");
    setSuccessMessage("");
    setEditingCustomerId(null);
  };

  const handleOpenSearch = () => {
    setSearchTerm("");
    setSearchError("");
    setSearchResults([]);
    setShowSearchModal(true);
  };

  const handleSearchCustomers = async (event) => {
    event.preventDefault();

    const term = String(searchTerm || "").trim();
    setSearchError("");
    setSearching(true);

    try {
      const companyId = readSelectedCompanyId();
      if (!companyId) {
        setSearchResults([]);
        setSearchError(
          tr(
            "customers.search.missingCompany",
            "No company is selected. Please select a company first.",
          ),
        );
        return;
      }

      // Real search via the customers search service.
      const results = await searchCustomersService.getCustomers({
        companyId,
        filters: { term },
      });

      setSearchResults(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error("Error searching customers:", error);
      setSearchResults([]);
      setSearchError(
        error?.message ||
          tr(
            "customers.search.error",
            "Customers could not be searched. Please try again.",
          ),
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCustomer = async (customer) => {
    const customerInternalId = getCustomerInternalId(customer);

    if (!customerInternalId) {
      setSearchError(
        tr(
          "customers.search.missingInternalId",
          "This customer does not have an internal ID and cannot be edited.",
        ),
      );
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setSearchError(
        tr(
          "customers.search.missingCompany",
          "No company is selected. Please select a company first.",
        ),
      );
      return;
    }

    setSearchError("");
    setSearching(true);

    try {
      // Fetch the full record by internal id and fill the main form with it.
      const response =
        await selectCustomerService.selectCustomerByInternalId({
          companyId,
          customerInternalId,
        });

      const fullCustomer = response?.result || customer;

      setFormData(customerToFormState(fullCustomer));
      setEditingCustomerId(
        getCustomerInternalId(fullCustomer) || customerInternalId,
      );
      setErrors({});
      setGeneralError("");
      setSuccessMessage("");
      setShowSearchModal(false);
    } catch (error) {
      console.error("Error selecting customer:", error);
      setSearchError(
        error?.message ||
          tr(
            "customers.search.selectError",
            "The customer information could not be loaded. Please try again.",
          ),
      );
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <section className="customer-create">
        <div className="customer-create__header">
          <div>
            <span className="customer-create__eyebrow">
              {tr("customers.create.eyebrow", "Customer management")}
            </span>

            <h2 className="customer-create__title">
              {isEditing ? <FaEdit /> : <FaUserPlus />}
              {isEditing
                ? tr("customers.update.title", "Edit customer")
                : tr("customers.create.title", "Create customer")}
            </h2>

            <p className="customer-create__description">
              {tr(
                "customers.create.description",
                isEditing
                  ? "Modify the selected customer's information and save the changes."
                  : "Register a new customer with contact information, social profile, category and status.",
              )}
            </p>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {isEditing && (
              <Button
                type="button"
                variant="outline-primary"
                size="sm"
                onClick={handleReset}
              >
                <FaPlus />
                {tr("customers.create.actions.new", "New customer")}
              </Button>
            )}

            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              onClick={handleOpenSearch}
            >
              <FaSearch />
              {tr("customers.search.actions.open", "Search customer")}
            </Button>

            <Badge
              bg="light"
              text="dark"
              className="customer-create__status-badge"
            >
              {selectedStatus?.label || formData.status}
            </Badge>
          </div>
        </div>

        {successMessage && (
          <Alert variant="success" className="customer-create__alert">
            <FaCheckCircle />
            <span>{successMessage}</span>
          </Alert>
        )}

        {generalError && (
          <Alert variant="danger" className="customer-create__alert">
            <FaExclamationTriangle />
            <span>{generalError}</span>
          </Alert>
        )}

        <Form className="customer-create__form" onSubmit={handleSubmit}>
          <div className="customer-create__section">
            <div className="customer-create__section-title">
              <FaAddressBook />
              <span>
                {tr("customers.create.sections.basic", "Basic information")}
              </span>
            </div>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.customerId", "Customer ID")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaIdCard />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.customerId",
                        "Example: CUST-0001",
                      )}
                      isInvalid={Boolean(errors.customerId)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.customerId}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.name", "Name")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaUser />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.name",
                        "Customer full name",
                      )}
                      isInvalid={Boolean(errors.name)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.name}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.alias", "Alias")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaAt />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="alias"
                      value={formData.alias}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.alias",
                        "Nickname or commercial name",
                      )}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="customer-create__section">
            <div className="customer-create__section-title">
              <FaPhoneAlt />
              <span>
                {tr("customers.create.sections.contact", "Contact information")}
              </span>
            </div>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.cellphone", "Cellphone")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaPhoneAlt />
                    </InputGroup.Text>

                    <Form.Control
                      type="tel"
                      name="cellphone"
                      value={formData.cellphone}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.cellphone",
                        "+506 8888 8888",
                      )}
                      isInvalid={Boolean(errors.cellphone)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.cellphone}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.email", "Email")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaEnvelope />
                    </InputGroup.Text>

                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.email",
                        "customer@example.com",
                      )}
                      isInvalid={Boolean(errors.email)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr(
                      "customers.create.fields.preferredContactMethod",
                      "Preferred contact method",
                    )}
                  </Form.Label>

                  <Form.Select
                    name="preferredContactMethod"
                    value={formData.preferredContactMethod}
                    onChange={handleChange}
                  >
                    {preferredContactOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr(
                      "customers.create.fields.socialNetwork",
                      "Social network",
                    )}
                  </Form.Label>

                  <Form.Select
                    name="socialNetwork"
                    value={formData.socialNetwork}
                    onChange={handleChange}
                  >
                    {socialNetworkOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={8}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr(
                      "customers.create.fields.socialNetworkLink",
                      "Social network link",
                    )}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaShareAlt />
                    </InputGroup.Text>

                    <Form.Control
                      type="url"
                      name="socialNetworkLink"
                      value={formData.socialNetworkLink}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.socialNetworkLink",
                        "Paste the profile or contact link",
                      )}
                      isInvalid={Boolean(errors.socialNetworkLink)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.socialNetworkLink}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="customer-create__section">
            <div className="customer-create__section-title">
              <FaGlobe />
              <span>
                {tr("customers.create.sections.extra", "Additional details")}
              </span>
            </div>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.birthday", "Birthday")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaBirthdayCake />
                    </InputGroup.Text>

                    <Form.Control
                      type="date"
                      name="birthday"
                      value={formData.birthday}
                      onChange={handleChange}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.website", "Website")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaGlobe />
                    </InputGroup.Text>

                    <Form.Control
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.website",
                        "https://example.com",
                      )}
                      isInvalid={Boolean(errors.website)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.website}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} md={8}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.address", "Address")}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaMapMarkerAlt />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder={tr(
                        "customers.create.placeholders.address",
                        "Customer address",
                      )}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={2}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.status", "Status")}
                  </Form.Label>

                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col xs={12} md={2}>
                <Form.Group className="customer-create__field">
                  <Form.Label>
                    {tr("customers.create.fields.category", "Category")}
                  </Form.Label>

                  <Form.Select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="customer-create__section">
            <div className="customer-create__section-title">
              <FaCommentDots />
              <span>
                {tr("customers.create.sections.comments", "Comments")}
              </span>
            </div>

            <Form.Group className="customer-create__field">
              <Form.Label>
                {tr("customers.create.fields.comments", "Comments")}
              </Form.Label>

              <Form.Control
                as="textarea"
                rows={4}
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                placeholder={tr(
                  "customers.create.placeholders.comments",
                  "Write relevant notes about this customer.",
                )}
              />
            </Form.Group>
          </div>

          <div className="customer-create__actions">
            <Button
              type="button"
              variant="outline-secondary"
              onClick={handleReset}
              disabled={saving}
            >
              <FaTimes />
              {tr("customers.create.actions.clear", "Clear")}
            </Button>

            <Button
              type="button"
              variant="outline-dark"
              onClick={onCancel}
              disabled={saving}
            >
              {tr("customers.create.actions.cancel", "Cancel")}
            </Button>

            <Button type="submit" variant="primary" disabled={saving}>
              {isEditing ? <FaEdit /> : <FaSave />}
              {saving
                ? tr("customers.create.actions.saving", "Saving...")
                : isEditing
                  ? tr("customers.update.actions.save", "Update customer")
                  : tr("customers.create.actions.save", "Save customer")}
            </Button>
          </div>
        </Form>
      </section>

      <BasicModal
        show={showSearchModal}
        setShow={setShowSearchModal}
        name={tr("customers.search.title", "Search existing customer")}
      >
        <Form onSubmit={handleSearchCustomers}>
          <Row className="g-2 align-items-end">
            <Col xs={12} md={9}>
              <Form.Group>
                <Form.Label>
                  {tr(
                    "customers.search.fields.term",
                    "ID, name, alias, phone or email",
                  )}
                </Form.Label>

                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>

                  <Form.Control
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={tr(
                      "customers.search.placeholder",
                      "Enter customer information",
                    )}
                    autoFocus
                  />
                </InputGroup>
              </Form.Group>
            </Col>

            <Col xs={12} md={3}>
              <Button
                type="submit"
                variant="primary"
                className="w-100"
                disabled={searching}
              >
                {searching ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <FaSearch />
                )}
                {searching
                  ? tr("customers.search.actions.searching", "Searching...")
                  : tr("customers.search.actions.search", "Search")}
              </Button>
            </Col>
          </Row>
        </Form>

        {searchError && (
          <Alert variant="danger" className="mt-3 mb-0">
            <FaExclamationTriangle /> {searchError}
          </Alert>
        )}

        <Table responsive hover className="align-middle mt-3 mb-0">
          <thead>
            <tr>
              <th>{tr("customers.search.columns.id", "ID")}</th>
              <th>{tr("customers.search.columns.name", "Name")}</th>
              <th>{tr("customers.search.columns.phone", "Phone")}</th>
              <th>{tr("customers.search.columns.email", "Email")}</th>
              <th>{tr("customers.search.columns.status", "Status")}</th>
              <th className="text-end">
                {tr("customers.search.columns.action", "Action")}
              </th>
            </tr>
          </thead>

          <tbody>
            {searchResults.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted py-4">
                  {tr(
                    "customers.search.empty",
                    "No customers have been found.",
                  )}
                </td>
              </tr>
            ) : (
              searchResults.map((customer) => {
                const internalId = getCustomerInternalId(customer);
                const customerId = getCustomerValue(
                  customer,
                  "customerId",
                  "customer_id",
                );
                const customerName = getCustomerValue(customer, "name", "name");
                const customerPhone = getCustomerValue(
                  customer,
                  "cellphone",
                  "cellphone",
                );
                const customerEmail = getCustomerValue(
                  customer,
                  "email",
                  "email",
                );
                const customerStatus = getCustomerValue(
                  customer,
                  "status",
                  "status",
                );

                return (
                  <tr key={internalId || customerId}>
                    <td>{customerId || "-"}</td>
                    <td>{customerName || "-"}</td>
                    <td>{customerPhone || "-"}</td>
                    <td>{customerEmail || "-"}</td>
                    <td>
                      <Badge
                        bg={
                          customerStatus === "ACTIVE" ? "success" : "secondary"
                        }
                      >
                        {customerStatus || "-"}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleSelectCustomer(customer)}
                      >
                        <FaEdit />
                        {tr("customers.search.actions.edit", "Edit")}
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </BasicModal>
    </>
  );
}