import React, { useMemo, useState } from "react";
import {
  FaLayerGroup,
  FaSearch,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
  FaEdit,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCode,
  FaTag,
  FaInfoCircle,
} from "react-icons/fa";

import {
  Alert,
  Badge,
  Button,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";

import "./CategoryMaintenanceForm.scss";

import SaveCategoryService from "../services/SaveCategoryService";
import SearchCategoriesService from "../services/SearchCategoriesService";
import SelectCategoryService from "../services/SelectCategoryService";

// Selected company is persisted by the header/menu. Read it from localStorage.
const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const saveCategoryService = new SaveCategoryService();
const searchCategoriesService = new SearchCategoriesService();
const selectCategoryService = new SelectCategoryService();

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

const emptyCategory = {
  internalCode: "",
  publishedCode: "",
  categoryName: "",
  status: "ACTIVE",
  description: "",
};

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");
}

function getStatusLabel(status) {
  const option = statusOptions.find((item) => item.value === status);
  return option?.label || status;
}

// Read a value from the backend record using camelCase or snake_case keys.
function getValue(record, camelCaseKey, snakeCaseKey) {
  return record?.[camelCaseKey] ?? record?.[snakeCaseKey] ?? "";
}

function getCategoryInternalId(category) {
  return (
    category?.categoryInternalId ??
    category?.category_internal_id ??
    category?.categoryId ??
    category?.category_id ??
    category?.id ??
    null
  );
}

function isActive(category) {
  const value =
    category?.active ?? category?.Active ?? category?.status ?? true;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "active", "yes", "s"].includes(normalized);
}

// Backend category -> the shape the list/search UI expects.
function normalizeCategoryForList(category) {
  const internalId = getCategoryInternalId(category);
  const status = isActive(category) ? "ACTIVE" : "INACTIVE";

  return {
    categoryInternalId: internalId,
    // No separate internal_code column: use the internal id as the display code.
    internalCode: String(internalId || ""),
    publishedCode: String(getValue(category, "publishedCode", "published_code")),
    categoryName: String(getValue(category, "categoryName", "category_name")),
    description: String(getValue(category, "description", "description")),
    status,
  };
}

// Backend category -> the main form state.
function categoryToFormState(category) {
  const internalId = getCategoryInternalId(category);

  return {
    internalCode: String(internalId || ""),
    publishedCode: String(getValue(category, "publishedCode", "published_code")),
    categoryName: String(getValue(category, "categoryName", "category_name")),
    status: isActive(category) ? "ACTIVE" : "INACTIVE",
    description: String(getValue(category, "description", "description")),
  };
}

function buildSearchText(category) {
  return [
    category.internalCode,
    category.publishedCode,
    category.categoryName,
    category.status,
    category.description,
  ]
    .join(" ")
    .toLowerCase();
}

// onSaved(categoryId) (2026-10-29): optional, called after a successful save
// (used by the product form to select the new category and close the window).
export default function CategoryMaintenanceForm({ t, onCancel = () => {}, onSaved = null }) {
  const [mode, setMode] = useState("CREATE");
  const [formData, setFormData] = useState(emptyCategory);
  // Holds the categoryInternalId (UUID) of the category being edited.
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [generalError, setGeneralError] = useState("");

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

  const isMaintenanceMode = mode === "MAINTENANCE";

  // The backend already returns categories for the selected company; here we
  // only apply an instant client-side filter over the loaded results.
  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return searchResults;
    }

    return searchResults.filter((category) =>
      buildSearchText(category).includes(normalizedSearch)
    );
  }, [searchResults, search]);

  const clearMessages = () => {
    setSuccessMessage("");
    setGeneralError("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    clearMessages();

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handleStatusChange = (event) => {
    const { checked } = event.target;

    clearMessages();

    setFormData((previous) => ({
      ...previous,
      status: checked ? "ACTIVE" : "INACTIVE",
    }));
  };

  const handleNew = () => {
    setMode("CREATE");
    setSelectedCategoryId("");
    setFormData(emptyCategory);
    setErrors({});
    clearMessages();
  };

  const handleOpenSearch = async () => {
    setSearch("");
    setSearchError("");
    setSearchResults([]);
    setShowSearchModal(true);

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setSearchError(
        tr(
          "categories.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSearching(true);

    try {
      const results = await searchCategoriesService.getCategories({
        companyId,
        filters: {},
      });

      setSearchResults(
        (Array.isArray(results) ? results : []).map(normalizeCategoryForList)
      );
    } catch (error) {
      console.error("Error searching categories:", error);
      setSearchResults([]);
      setSearchError(
        error?.message ||
          tr(
            "categories.form.error.search",
            "Categories could not be searched. Please try again."
          )
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCategory = async (category) => {
    const categoryInternalId = getCategoryInternalId(category);

    if (!categoryInternalId) {
      setSearchError(
        tr(
          "categories.form.error.missingInternalId",
          "This category does not have an internal ID and cannot be edited."
        )
      );
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setSearchError(
        tr(
          "categories.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSearchError("");
    setSearching(true);

    try {
      // Fetch the full record by internal id and load it into the form.
      const response = await selectCategoryService.selectCategoryByInternalId({
        companyId,
        categoryInternalId,
      });

      const fullCategory = response?.result || category;

      setMode("MAINTENANCE");
      setSelectedCategoryId(getCategoryInternalId(fullCategory) || categoryInternalId);
      setFormData(categoryToFormState(fullCategory));
      setErrors({});
      clearMessages();
      setShowSearchModal(false);
    } catch (error) {
      console.error("Error selecting category:", error);
      setSearchError(
        error?.message ||
          tr(
            "categories.form.error.select",
            "The category information could not be loaded. Please try again."
          )
      );
    } finally {
      setSearching(false);
    }
  };

  const validateForm = () => {
    const validationErrors = {};

    const publishedCode = normalizeText(formData.publishedCode);
    const categoryName = normalizeText(formData.categoryName);

    if (!publishedCode) {
      validationErrors.publishedCode = tr(
        "categories.form.validation.publishedCodeRequired",
        "Published code is required."
      );
    }

    if (!categoryName) {
      validationErrors.categoryName = tr(
        "categories.form.validation.nameRequired",
        "Category name is required."
      );
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  // Build the backend payload. The backend decides create vs update from
  // categoryInternalId (empty -> create, present -> update).
  const buildPayload = (overrides = {}) => {
    return {
      categoryInternalId: selectedCategoryId || "",
      publishedCode: normalizeCode(formData.publishedCode),
      categoryName: normalizeText(formData.categoryName),
      description: normalizeText(formData.description),
      active: formData.status === "ACTIVE",
      ...overrides,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    clearMessages();

    if (!validateForm()) return;

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setGeneralError(
        tr(
          "categories.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSaving(true);

    try {
      const response = await saveCategoryService.saveCategory({
        companyId,
        category: buildPayload(),
      });

      setSuccessMessage(
        isMaintenanceMode
          ? tr("categories.form.success.updated", "Category updated successfully.")
          : tr("categories.form.success.created", "Category created successfully.")
      );

      // Keep editing the saved record: adopt the id the backend returned.
      const savedId = getCategoryInternalId(response?.result);
      if (typeof onSaved === "function") {
        onSaved(savedId ? String(savedId) : "");
      }
      if (savedId) {
        setMode("MAINTENANCE");
        setSelectedCategoryId(savedId);
        setFormData(categoryToFormState(response.result));
      } else if (!isMaintenanceMode) {
        setFormData(emptyCategory);
        setSelectedCategoryId("");
      }

      setErrors({});
    } catch (error) {
      console.error("Error saving category:", error);

      setGeneralError(
        error?.message ||
          tr(
            "categories.form.error.save",
            "The category could not be saved. Please try again."
          )
      );
    } finally {
      setSaving(false);
    }
  };

  // There is no delete endpoint: "delete" performs a soft delete by saving the
  // category as inactive (active = false).
  const handleDelete = async () => {
    if (!selectedCategoryId) return;

    clearMessages();

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setGeneralError(
        tr(
          "categories.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSaving(true);

    try {
      await saveCategoryService.saveCategory({
        companyId,
        category: buildPayload({ active: false }),
      });

      setMode("CREATE");
      setSelectedCategoryId("");
      setFormData(emptyCategory);

      setSuccessMessage(
        tr(
          "categories.form.success.deactivated",
          "Category deactivated successfully."
        )
      );
    } catch (error) {
      console.error("Error deactivating category:", error);

      setGeneralError(
        error?.message ||
          tr(
            "categories.form.error.delete",
            "The category could not be deactivated. Please try again."
          )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (mode === "CREATE") {
      setFormData(emptyCategory);
      setSelectedCategoryId("");
      setErrors({});
      clearMessages();
      return;
    }

    // Maintenance: reload the current record from the backend.
    if (!selectedCategoryId) {
      setFormData(emptyCategory);
      setErrors({});
      clearMessages();
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) return;

    clearMessages();

    try {
      const response = await selectCategoryService.selectCategoryByInternalId({
        companyId,
        categoryInternalId: selectedCategoryId,
      });

      if (response?.result) {
        setFormData(categoryToFormState(response.result));
      }
      setErrors({});
    } catch (error) {
      console.error("Error reloading category:", error);
    }
  };

  return (
    <section className="category-maintenance">
      <main className="category-maintenance__main">
        <div className="category-maintenance__header">
          <div>
            <span className="category-maintenance__eyebrow">
              {tr("categories.form.eyebrow", "Category management")}
            </span>

            <h2 className="category-maintenance__title">
              {isMaintenanceMode ? <FaEdit /> : <FaPlus />}
              {isMaintenanceMode
                ? tr("categories.form.titleEdit", "Maintain category")
                : tr("categories.form.titleCreate", "Create category")}
            </h2>

            <p className="category-maintenance__description">
              {tr(
                "categories.form.description",
                "Create and maintain simple categories that can be used later for products, services, orders, and tracking steps."
              )}
            </p>
          </div>

          <div className="category-maintenance__header-actions">
            <Button
              type="button"
              variant="outline-primary"
              onClick={handleOpenSearch}
            >
              <FaSearch />
              {tr("categories.form.actions.search", "Search category")}
            </Button>

            <Button type="button" variant="primary" onClick={handleNew}>
              <FaPlus />
              {tr("categories.form.actions.new", "New")}
            </Button>
          </div>
        </div>

        <div className="category-maintenance__badges">
          <Badge bg="light" text="dark">
            {formData.internalCode ||
              tr("categories.form.pendingInternalCode", "Internal code pending")}
          </Badge>

          <Badge bg={formData.status === "ACTIVE" ? "success" : "secondary"}>
            {getStatusLabel(formData.status)}
          </Badge>

          {isMaintenanceMode && selectedCategoryId && (
            <Badge bg="info">
              {tr("categories.form.modeMaintenance", "Editing")}{" "}
              {formData.publishedCode}
            </Badge>
          )}
        </div>

        {successMessage && (
          <Alert variant="success" className="category-maintenance__alert">
            <FaCheckCircle />
            <span>{successMessage}</span>
          </Alert>
        )}

        {generalError && (
          <Alert variant="danger" className="category-maintenance__alert">
            <FaExclamationTriangle />
            <span>{generalError}</span>
          </Alert>
        )}

        <Form className="category-maintenance__form" onSubmit={handleSubmit}>
          <div className="category-maintenance__section">
            <div className="category-maintenance__section-title">
              <FaInfoCircle />
              <span>
                {tr("categories.form.sections.basic", "Basic information")}
              </span>
            </div>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="category-maintenance__field">
                  <Form.Label>
                    {tr(
                      "categories.form.fields.internalCode",
                      "Internal category code"
                    )}
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaCode />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="internalCode"
                      value={
                        formData.internalCode ||
                        tr(
                          "categories.form.autoGenerated",
                          "Auto generated by system"
                        )
                      }
                      readOnly
                      className="category-maintenance__readonly"
                    />
                  </InputGroup>

                  <small className="category-maintenance__help">
                    {tr(
                      "categories.form.internalCodeHelp",
                      "This code is for internal use and can be generated by the database or backend."
                    )}
                  </small>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="category-maintenance__field">
                  <Form.Label>
                    {tr(
                      "categories.form.fields.publishedCode",
                      "Published code"
                    )}
                    <span className="category-maintenance__required">*</span>
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaCode />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="publishedCode"
                      value={formData.publishedCode}
                      onChange={handleChange}
                      onBlur={() =>
                        setFormData((previous) => ({
                          ...previous,
                          publishedCode: normalizeCode(previous.publishedCode),
                        }))
                      }
                      placeholder={tr(
                        "categories.form.placeholders.publishedCode",
                        "Example: DELIVERY"
                      )}
                      isInvalid={Boolean(errors.publishedCode)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.publishedCode}
                    </Form.Control.Feedback>
                  </InputGroup>

                  <small className="category-maintenance__help">
                    {tr(
                      "categories.form.publishedCodeHelp",
                      "This is the code visible or recognizable by users."
                    )}
                  </small>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="category-maintenance__field">
                  <Form.Label>
                    {tr("categories.form.fields.categoryName", "Category name")}
                    <span className="category-maintenance__required">*</span>
                  </Form.Label>

                  <InputGroup>
                    <InputGroup.Text>
                      <FaTag />
                    </InputGroup.Text>

                    <Form.Control
                      type="text"
                      name="categoryName"
                      value={formData.categoryName}
                      onChange={handleChange}
                      placeholder={tr(
                        "categories.form.placeholders.categoryName",
                        "Example: Delivery products"
                      )}
                      isInvalid={Boolean(errors.categoryName)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.categoryName}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} md={9}>
                <Form.Group className="category-maintenance__field">
                  <Form.Label>
                    {tr("categories.form.fields.description", "Description")}
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={tr(
                      "categories.form.placeholders.description",
                      "Describe what this category is used for."
                    )}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={3}>
                <Form.Group className="category-maintenance__field category-maintenance__status-box">
                  <Form.Check
                    type="switch"
                    id="category-status-switch"
                    checked={formData.status === "ACTIVE"}
                    onChange={handleStatusChange}
                    label={
                      formData.status === "ACTIVE"
                        ? tr("categories.form.status.active", "Active")
                        : tr("categories.form.status.inactive", "Inactive")
                    }
                  />

                  <small>
                    {tr(
                      "categories.form.statusHelp",
                      "Inactive categories will not be available for new records."
                    )}
                  </small>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="category-maintenance__actions">
            <div>
              {isMaintenanceMode && selectedCategoryId && (
                <Button
                  type="button"
                  variant="outline-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <FaTrash />
                  {tr("categories.form.actions.delete2", "Deactivate")}
                </Button>
              )}
            </div>

            <div className="category-maintenance__actions-right">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={handleClear}
                disabled={saving}
              >
                <FaTrash />
                {tr("categories.form.actions.clear", "Clear")}
              </Button>

              <Button
                type="button"
                variant="outline-dark"
                onClick={onCancel}
                disabled={saving}
              >
                <FaTimes />
                {tr("categories.form.actions.cancel", "Cancel")}
              </Button>

              <Button type="submit" variant="primary" disabled={saving}>
                <FaSave />
                {saving
                  ? tr("categories.form.actions.saving", "Saving...")
                  : isMaintenanceMode
                  ? tr("categories.form.actions.update", "Update category")
                  : tr("categories.form.actions.save", "Save category")}
              </Button>
            </div>
          </div>
        </Form>
      </main>

      <Modal
        show={showSearchModal}
        onHide={() => setShowSearchModal(false)}
        centered
        size="lg"
        className="category-search-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaSearch />
            {tr("categories.form.searchTitle", "Search categories")}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <InputGroup className="category-maintenance__search">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>

            <Form.Control
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tr(
                "categories.form.searchPlaceholder",
                "Search by code, name or status"
              )}
              autoFocus
            />
          </InputGroup>

          {searchError && (
            <Alert variant="danger" className="mt-3 mb-0">
              <FaExclamationTriangle /> {searchError}
            </Alert>
          )}

          <div className="category-maintenance__modal-list">
            {searching ? (
              <div className="category-maintenance__empty-list">
                <Spinner animation="border" size="sm" />
                <strong>
                  {tr("categories.form.searching", "Searching...")}
                </strong>
              </div>
            ) : filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const isSelected =
                  selectedCategoryId === category.categoryInternalId;

                return (
                  <button
                    key={category.categoryInternalId}
                    type="button"
                    className={[
                      "category-maintenance__category-item",
                      isSelected
                        ? "category-maintenance__category-item--selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelectCategory(category)}
                  >
                    <span className="category-maintenance__category-icon">
                      <FaLayerGroup />
                    </span>

                    <span className="category-maintenance__category-info">
                      <strong>{category.categoryName}</strong>
                      <small>
                        {category.internalCode} · {category.publishedCode}
                      </small>
                    </span>

                    <Badge
                      bg={category.status === "ACTIVE" ? "success" : "secondary"}
                      pill
                    >
                      {getStatusLabel(category.status)}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="category-maintenance__empty-list">
                <FaLayerGroup />
                <strong>
                  {tr("categories.form.noCategories", "No categories found")}
                </strong>
                <span>
                  {tr(
                    "categories.form.noCategoriesHelp",
                    "Try another search or create a new category."
                  )}
                </span>
              </div>
            )}
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            type="button"
            variant="outline-secondary"
            onClick={() => setShowSearchModal(false)}
          >
            {tr("categories.form.actions.cancel", "Cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setShowSearchModal(false);
              handleNew();
            }}
          >
            <FaPlus />
            {tr("categories.form.actions.new", "New")}
          </Button>
        </Modal.Footer>
      </Modal>
    </section>
  );
}