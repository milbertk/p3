import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  FaBoxOpen,
  FaSearch,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
  FaImage,
  FaDollarSign,
  FaGlobe,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFacebookMessenger,
  FaLayerGroup,
  FaEdit,
} from "react-icons/fa";

import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Col,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner,
} from "react-bootstrap";

import "./ProductMaintenanceForm.scss";

import SaveProductService from "../services/SaveProductService";
import planLimitMessage from "../../../../Shared/Utils/planLimitMessage";
import SelectPageConfigurationService from "../../pageConfiguration/services/SelectPageConfigurationService";
import {
  DEFAULT_CURRENCY_SYMBOL,
  isPreloadedCurrencySymbol,
} from "../../../../Shared/Utils/currencies";
import SearchProductsService from "../services/SearchProductsService";
import SelectProductService from "../services/SelectProductService";
import SearchCategoriesService from "../../productCategories/services/SearchCategoriesService";
import ProductImageUploadService from "../services/ProductImageUploadService";
import SearchStepTemplatesService from "../../tracking/services/SearchStepTemplatesService";
import TrackingMaintenance from "../../tracking/components/TrackingMaintenance";
import CategoryMaintenanceForm from "../../productCategories/components/CategoryMaintenanceForm";

const SELECTED_COMPANY_STORAGE_KEY = "selectedCompany";

const saveProductService = new SaveProductService();
const searchProductsService = new SearchProductsService();
const selectProductService = new SelectProductService();
const searchCategoriesService = new SearchCategoriesService();
const productImageUploadService = new ProductImageUploadService();
const searchStepTemplatesService = new SearchStepTemplatesService();

function readSelectedCompanyId() {
  try {
    const raw = localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY);

    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);

    return String(parsed?.companyId || parsed?.id || "").trim();
  } catch {
    return "";
  }
}

// One currency per company (2026-10-22): the price uses the store currency
// set in "Company page"; products no longer choose their own.
const emptyProduct = {
  productInternalId: "",
  productType: "SERVICE",
  name: "",
  code: "",
  description: "",
  hasPrice: true,
  basePrice: "",
  currencySymbol: DEFAULT_CURRENCY_SYMBOL,
  // UI only: true when the symbol is typed by hand ("Other…").
  currencyOther: false,
  taxFree: false,
  showTaxes: false,
  taxPercentage: "",
  showOnWeb: true,
  availableForWebSales: false,
  webBehavior: "MESSENGER_APP",
  stepTemplateId: "",
  webContactPhone: "",
  webMessengerLink: "",
  status: "ACTIVE",
  category: "",
  comments: "",
  imageFile: null,
  imagePreviewUrl: "",
  imageUrl: "",
  imagePath: "",
};

const productTypeOptions = [
  { value: "SERVICE", label: "Service" },
  { value: "ORDER_PRODUCT", label: "Order product" },
  // Hidden for the MVP (no stock tracking yet). Products that already use it
  // still show it, so they can be edited. Set hidden: false to bring it back.
  { value: "INVENTORY_PRODUCT", label: "Inventory product", hidden: true },
];

// Web behavior (2026-10-31): only "is it an appointment?". BOOKING = the
// store shows "Book"; anything else is saved as MESSENGER_APP and the store
// shows "Add to cart" when "Available for web sales" is on. Contact buttons
// (WhatsApp / social network) come from Company page for every product.
const WEB_BEHAVIOR_APPOINTMENT = "BOOKING";
const WEB_BEHAVIOR_DEFAULT = "MESSENGER_APP";

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "DRAFT", label: "Draft" },
];

function normalizeText(value) {
  return String(value || "").trim();
}

function getStatusLabel(status) {
  const option = statusOptions.find((item) => item.value === status);
  return option?.label || status;
}

function getProductTypeLabel(productType) {
  const option = productTypeOptions.find((item) => item.value === productType);
  return option?.label || productType;
}

function getValue(record, camelCaseKey, snakeCaseKey) {
  return record?.[camelCaseKey] ?? record?.[snakeCaseKey] ?? "";
}

function getProductInternalId(product) {
  return (
    product?.productInternalId ??
    product?.product_internal_id ??
    product?.id ??
    null
  );
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

function normalizeBool(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value === 1;
  }
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "") {
    return fallback;
  }
  return ["true", "1", "yes", "active"].includes(normalized);
}

function productToFormState(product) {
  const internalId = getProductInternalId(product);
  const basePrice = getValue(product, "basePrice", "base_price");
  const imageUrl = String(getValue(product, "imageUrl", "image_url"));

  return {
    productInternalId: String(internalId || ""),
    productType:
      String(getValue(product, "productType", "product_type")) || "SERVICE",
    name: String(getValue(product, "name", "name")),
    code: String(getValue(product, "productCode", "product_code")),
    description: String(getValue(product, "description", "description")),
    hasPrice: normalizeBool(getValue(product, "hasPrice", "has_price"), true),
    basePrice:
      basePrice === "" || basePrice === null || basePrice === undefined
        ? ""
        : String(basePrice),
    ...(() => {
      const symbol =
        String(getValue(product, "currencySymbol", "currency_symbol") || "").trim() ||
        DEFAULT_CURRENCY_SYMBOL;
      return {
        currencySymbol: symbol,
        currencyOther: !isPreloadedCurrencySymbol(symbol),
      };
    })(),
    taxFree: normalizeBool(getValue(product, "taxFree", "tax_free"), false),
    showTaxes: normalizeBool(getValue(product, "showTaxes", "show_taxes"), false),
    taxPercentage: (() => {
      const value = getValue(product, "taxPercentage", "tax_percentage");
      return value === "" || value === null || value === undefined
        ? ""
        : String(value);
    })(),
    showOnWeb: normalizeBool(getValue(product, "showOnWeb", "show_on_web"), true),
    availableForWebSales: normalizeBool(
      getValue(product, "availableForWebSales", "available_for_web_sales"),
      false
    ),
    stepTemplateId: String(getValue(product, "stepTemplateId", "step_template_id") || ""),
    webBehavior: (() => {
      const raw = String(getValue(product, "webBehavior", "web_behavior")) || "MESSENGER_APP";
      // Only "appointment" or not (2026-10-31).
      return raw === WEB_BEHAVIOR_APPOINTMENT ? WEB_BEHAVIOR_APPOINTMENT : WEB_BEHAVIOR_DEFAULT;
    })(),
    webContactPhone: String(
      getValue(product, "webContactPhone", "web_contact_phone") || "",
    ),
    webMessengerLink: String(
      getValue(product, "webMessengerLink", "web_messenger_link") || "",
    ),
    status: String(getValue(product, "status", "status")) || "ACTIVE",
    category: String(getValue(product, "categoryId", "category_id")),
    comments: String(getValue(product, "comments", "comments")),
    imageFile: null,
    imagePreviewUrl: imageUrl,
    imageUrl,
    imagePath: String(getValue(product, "imagePath", "image_path")),
  };
}

function productToListItem(product) {
  return {
    productInternalId: getProductInternalId(product),
    name: String(getValue(product, "name", "name")),
    code: String(getValue(product, "productCode", "product_code")),
    productType: String(getValue(product, "productType", "product_type")),
    status: String(getValue(product, "status", "status")) || "ACTIVE",
    description: String(getValue(product, "description", "description")),
  };
}

function buildProductSearchText(product) {
  return [
    product.name,
    product.code,
    product.productType,
    product.status,
    product.description,
  ]
    .join(" ")
    .toLowerCase();
}

export default function ProductMaintenanceForm({ t, onCancel = () => {} }) {
  const fileInputRef = useRef(null);

  const [mode, setMode] = useState("CREATE");
  const [formData, setFormData] = useState(emptyProduct);
  // Store currency of the selected company (Company page); "$" by default.
  const [storeCurrency, setStoreCurrency] = useState(DEFAULT_CURRENCY_SYMBOL);

  useEffect(() => {
    const companyId = readSelectedCompanyId();
    if (!companyId) return undefined;
    const controller = new AbortController();
    new SelectPageConfigurationService()
      .selectPageConfiguration({ companyId, signal: controller.signal })
      .then((result) => {
        const symbol = String(result?.currencySymbol || "").trim();
        setStoreCurrency(symbol || DEFAULT_CURRENCY_SYMBOL);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("[ProductMaintenanceForm] Store currency not loaded:", error);
        }
      });
    return () => controller.abort();
  }, []);
  const [selectedProductId, setSelectedProductId] = useState("");

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [stepTemplates, setStepTemplates] = useState([]);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  // "+" next to Category (2026-10-29): create a category without leaving.
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Load the step templates (processes) for the dropdown.
  const loadStepTemplates = async () => {
    const companyId = readSelectedCompanyId();
    if (!companyId) return;
    try {
      const rows = await searchStepTemplatesService.getTemplates({ companyId });
      setStepTemplates(
        (Array.isArray(rows) ? rows : []).map((row) => ({
          id: String(row.stepTemplateId || row.step_template_id || ""),
          name: String(row.name || ""),
          code: String(row.internalCode || row.internal_code || ""),
        })).filter((o) => o.id),
      );
    } catch (error) {
      console.error("Error loading step templates:", error);
    }
  };

  useEffect(() => {
    loadStepTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [categoryOptions, setCategoryOptions] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const tr = useMemo(() => {
    return (key, fallback) => {
      try {
        if (typeof t !== "function") {
          return fallback;
        }
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

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) {
      return searchResults;
    }
    return searchResults.filter((product) =>
      buildProductSearchText(product).includes(normalizedSearch)
    );
  }, [searchResults, search]);


    const selectedStatusLabel = useMemo(
    () => getStatusLabel(formData.status),
    [formData.status]
  );

  const selectedTypeLabel = useMemo(
    () => getProductTypeLabel(formData.productType),
    [formData.productType]
  );

  const isMaintenanceMode = mode === "MAINTENANCE";

  const clearMessages = () => {
    setGeneralError("");
    setSuccessMessage("");
  };

  // force (2026-10-29): reload after a category was created in the pop-up.
  const handleLoadCategories = async ({ force = false } = {}) => {
    if (!force && (categoriesLoaded || loadingCategories)) {
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      return;
    }

    setLoadingCategories(true);

    try {
      const results = await searchCategoriesService.getCategories({
        companyId,
        filters: {},
      });

      const options = (Array.isArray(results) ? results : [])
        .map((category) => ({
          id: String(getCategoryInternalId(category) || ""),
          name: String(getValue(category, "categoryName", "category_name")),
        }))
        .filter((option) => option.id);

      setCategoryOptions(options);
      setCategoriesLoaded(true);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // A process / category created in the pop-up is selected and the pop-up
  // closes; the product being filled keeps all its data (2026-10-29).
  const handleStepTemplateSaved = async (savedId) => {
    await loadStepTemplates();
    if (savedId) {
      setFormData((current) => ({ ...current, stepTemplateId: savedId }));
      setErrors((current) => ({ ...current, stepTemplateId: "" }));
    }
    setShowTrackingModal(false);
  };

  const handleCategorySaved = async (savedId) => {
    await handleLoadCategories({ force: true });
    if (savedId) {
      setFormData((current) => ({ ...current, category: savedId }));
      setErrors((current) => ({ ...current, category: "" }));
    }
    setShowCategoryModal(false);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    clearMessages();

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handleProductTypeChange = (productType) => {
    clearMessages();

    setFormData((previous) => ({
      ...previous,
      productType,
    }));

    setErrors((previous) => ({
      ...previous,
      productType: "",
    }));
  };

  const handleCreateMode = () => {
    setMode("CREATE");
    setSelectedProductId("");
    setFormData(emptyProduct);
    setErrors({});
    clearMessages();
  };

  const handleOpenSearchModal = async () => {
    setSearch("");
    setSearchError("");
    setSearchResults([]);
    setShowSearchModal(true);

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setSearchError(
        tr(
          "products.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSearching(true);

    try {
      const results = await searchProductsService.getProducts({
        companyId,
        filters: {},
      });

      setSearchResults(
        (Array.isArray(results) ? results : []).map(productToListItem)
      );
    } catch (error) {
      console.error("Error searching products:", error);
      setSearchResults([]);
      setSearchError(
        error?.message ||
          tr(
            "products.form.error.search",
            "Products could not be searched. Please try again."
          )
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = async (product) => {
    const productInternalId = getProductInternalId(product);

    if (!productInternalId) {
      setSearchError(
        tr(
          "products.form.error.missingInternalId",
          "This product does not have an internal ID and cannot be edited."
        )
      );
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setSearchError(
        tr(
          "products.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSearchError("");
    setSearching(true);

    try {
      await handleLoadCategories();

      const response = await selectProductService.selectProductByInternalId({
        companyId,
        productInternalId,
      });

      const fullProduct = response?.result || product;

      setMode("MAINTENANCE");
      setSelectedProductId(getProductInternalId(fullProduct) || productInternalId);
      setFormData(productToFormState(fullProduct));
      setErrors({});
      clearMessages();
      setShowSearchModal(false);
    } catch (error) {
      console.error("Error selecting product:", error);
      setSearchError(
        error?.message ||
          tr(
            "products.form.error.select",
            "The product information could not be loaded. Please try again."
          )
      );
    } finally {
      setSearching(false);
    }
  };

  const handleImageButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setGeneralError(
        tr(
          "products.form.validation.invalidImage",
          "Please select a valid image file."
        )
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setFormData((previous) => ({
      ...previous,
      imageFile: file,
      imagePreviewUrl: previewUrl,
    }));

    clearMessages();
  };

  const handleRemoveImage = () => {
    setFormData((previous) => ({
      ...previous,
      imageFile: null,
      imagePreviewUrl: "",
      imageUrl: "",
      imagePath: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    clearMessages();
  };

  const validateForm = () => {
    const validationErrors = {};

    const name = normalizeText(formData.name);
    const code = normalizeText(formData.code);
    const basePrice = normalizeText(formData.basePrice);
    const category = normalizeText(formData.category);

    if (!name) {
      validationErrors.name = tr(
        "products.form.validation.nameRequired",
        "Product name is required."
      );
    }

    if (!code) {
      validationErrors.code = tr(
        "products.form.validation.codeRequired",
        "Product code is required."
      );
    }

    if (!category) {
      validationErrors.category = tr(
        "products.form.validation.categoryRequired",
        "Category is required."
      );
    }

    // Process/tracking is mandatory, except for BOOKING (coming soon).
    if (formData.webBehavior !== "BOOKING" && !normalizeText(formData.stepTemplateId)) {
      validationErrors.stepTemplateId = tr(
        "products.form.validation.stepTemplateRequired",
        "Please select a process (tracking) for this product."
      );
    }

    if (formData.hasPrice) {
      if (!basePrice) {
        validationErrors.basePrice = tr(
          "products.form.validation.priceRequired",
          "Base price is required."
        );
      } else {
        const numericPrice = Number(basePrice);
        if (Number.isNaN(numericPrice) || numericPrice < 0) {
          validationErrors.basePrice = tr(
            "products.form.validation.priceInvalid",
            "Enter a valid base price."
          );
        }
      }
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = (imageUrl, imagePath) => {
    const basePriceText = normalizeText(formData.basePrice);
    const basePriceNumber =
      formData.hasPrice && basePriceText !== "" ? Number(basePriceText) : null;

    return {
      productInternalId: selectedProductId || "",
      productCode: normalizeText(formData.code),
      categoryId: normalizeText(formData.category),
      name: normalizeText(formData.name),
      description: normalizeText(formData.description),
      productType: normalizeText(formData.productType),
      hasPrice: Boolean(formData.hasPrice),
      basePrice: basePriceNumber,
      // Always the store currency (Company page); "$" when not set.
      currencySymbol: storeCurrency || DEFAULT_CURRENCY_SYMBOL,
      taxFree: Boolean(formData.taxFree),
      showTaxes: !formData.taxFree && Boolean(formData.showTaxes),
      taxPercentage:
        !formData.taxFree &&
        formData.showTaxes &&
        normalizeText(formData.taxPercentage) !== ""
          ? Number(formData.taxPercentage)
          : null,
      showOnWeb: Boolean(formData.showOnWeb),
      availableForWebSales: Boolean(formData.availableForWebSales),
      webBehavior: normalizeText(formData.webBehavior),
      stepTemplateId:
        formData.webBehavior === "BOOKING"
          ? ""
          : normalizeText(formData.stepTemplateId),
      // Contact channels are kept for every web behavior: the showcase shows
      // "Contact us" whenever a WhatsApp number or Messenger link exists.
      webContactPhone: normalizeText(formData.webContactPhone),
      webMessengerLink: normalizeText(formData.webMessengerLink),
      status: normalizeText(formData.status),
      comments: normalizeText(formData.comments),
      imageUrl: normalizeText(imageUrl),
      imagePath: normalizeText(imagePath),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    clearMessages();

    if (!validateForm()) {
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setGeneralError(
        tr(
          "products.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSaving(true);

    const previousImagePath = formData.imagePath || "";

    try {
      let imageUrl = formData.imageUrl || "";
      let imagePath = formData.imagePath || "";

      if (formData.imageFile) {
        setUploadingImage(true);
        try {
          const uploaded = await productImageUploadService.uploadProductImage({
            companyId,
            productInternalId: selectedProductId,
            file: formData.imageFile,
          });
          imageUrl = uploaded.url;
          imagePath = uploaded.path;
        } finally {
          setUploadingImage(false);
        }
      }

      const response = await saveProductService.saveProduct({
        companyId,
        product: buildPayload(imageUrl, imagePath),
      });

      if (previousImagePath && previousImagePath !== imagePath) {
        productImageUploadService
          .deleteProductImage(previousImagePath)
          .catch(() => {});
      }

      setSuccessMessage(
        isMaintenanceMode
          ? tr("products.form.success.updated", "Product updated successfully.")
          : tr("products.form.success.created", "Product created successfully.")
      );

      const savedId = getProductInternalId(response?.result);
      if (savedId) {
        setMode("MAINTENANCE");
        setSelectedProductId(savedId);
        setFormData(productToFormState(response.result));
      } else if (!isMaintenanceMode) {
        setFormData(emptyProduct);
        setSelectedProductId("");
      }

      setErrors({});
    } catch (error) {
      console.error("Error saving product:", error);
      setGeneralError(
        // Plan limit of products (e.g. FREE = 10 products).
        planLimitMessage(error, t) ||
        error?.message ||
          tr(
            "products.form.error.save",
            "The product could not be saved. Please try again."
          )
      );
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProductId) {
      return;
    }

    clearMessages();

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      setGeneralError(
        tr(
          "products.form.error.missingCompany",
          "No company is selected. Please select a company first."
        )
      );
      return;
    }

    setSaving(true);

    try {
      await saveProductService.saveProduct({
        companyId,
        product: {
          ...buildPayload(formData.imageUrl, formData.imagePath),
          status: "INACTIVE",
        },
      });

      setMode("CREATE");
      setSelectedProductId("");
      setFormData(emptyProduct);

      setSuccessMessage(
        tr("products.form.success.deactivated", "Product deactivated successfully.")
      );
    } catch (error) {
      console.error("Error deactivating product:", error);
      setGeneralError(
        error?.message ||
          tr(
            "products.form.error.delete",
            "The product could not be deactivated. Please try again."
          )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (mode === "CREATE") {
      setFormData(emptyProduct);
      setSelectedProductId("");
      setErrors({});
      clearMessages();
      return;
    }

    if (!selectedProductId) {
      setFormData(emptyProduct);
      setErrors({});
      clearMessages();
      return;
    }

    const companyId = readSelectedCompanyId();
    if (!companyId) {
      return;
    }

    clearMessages();

    try {
      const response = await selectProductService.selectProductByInternalId({
        companyId,
        productInternalId: selectedProductId,
      });

      if (response?.result) {
        setFormData(productToFormState(response.result));
      }
      setErrors({});
    } catch (error) {
      console.error("Error reloading product:", error);
    }
  };

  return (
    <section className="product-maintenance">
      <main className="product-maintenance__main product-maintenance__main--single">
        <div className="product-maintenance__header">
          <div>
            <span className="product-maintenance__eyebrow">
              {tr("products.form.eyebrow", "Product management")}
            </span>

            <h2 className="product-maintenance__title">
              {isMaintenanceMode ? <FaEdit /> : <FaPlus />}
              {isMaintenanceMode
                ? tr("products.form.titleEdit", "Maintain product")
                : tr("products.form.titleCreate", "Create product")}
            </h2>

            <p className="product-maintenance__description">
              {tr(
                "products.form.description",
                "Register or update a service, order product, or inventory product."
              )}
            </p>
          </div>

          <div className="product-maintenance__header-actions">
            <Button type="button" variant="outline-primary" onClick={handleOpenSearchModal}>
              <FaSearch />
              {tr("products.form.actions.search", "Search product")}
            </Button>

            <Button type="button" variant="primary" onClick={handleCreateMode}>
              <FaPlus />
              {tr("products.form.actions.new", "New")}
            </Button>
          </div>
        </div>

        <div className="product-maintenance__badges product-maintenance__badges--top">
          <Badge bg="light" text="dark">
            {selectedTypeLabel}
          </Badge>

          <Badge bg={formData.status === "ACTIVE" ? "success" : "secondary"}>
            {selectedStatusLabel}
          </Badge>

          {isMaintenanceMode && selectedProductId && (
            <Badge bg="info">
              {tr("products.form.modeMaintenance", "Editing")} {formData.code}
            </Badge>
          )}
        </div>

        {successMessage && (
          <Alert variant="success" className="product-maintenance__alert">
            <FaCheckCircle />
            <span>{successMessage}</span>
          </Alert>
        )}

        {generalError && (
          <Alert variant="danger" className="product-maintenance__alert">
            <FaExclamationTriangle />
            <span>{generalError}</span>
          </Alert>
        )}

        <Form className="product-maintenance__form" onSubmit={handleSubmit}>
          <div className="product-maintenance__section">
            <div className="product-maintenance__section-title">
              <FaInfoCircle />
              <span>{tr("products.form.sections.basic", "Basic information")}</span>
            </div>

            <Row>
              <Col xs={12} lg={5}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.productType", "Product type")}
                  </Form.Label>

                  <ButtonGroup className="product-maintenance__type-group">
                    {productTypeOptions
                      .filter((option) => !option.hidden || formData.productType === option.value)
                      .map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={
                          formData.productType === option.value
                            ? "primary"
                            : "outline-primary"
                        }
                        onClick={() => handleProductTypeChange(option.value)}
                      >
                        {tr(`products.form.productTypes.${option.value}`, option.label)}
                      </Button>
                    ))}
                  </ButtonGroup>
                </Form.Group>
              </Col>

              <Col xs={12} lg={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.name", "Product name")}
                    <span className="product-maintenance__required">*</span>
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={tr(
                      "products.form.placeholders.name",
                      "Example: Premium Bicycle Repair"
                    )}
                    isInvalid={Boolean(errors.name)}
                  />

                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col xs={12} lg={3}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.code", "Product code")}
                    <span className="product-maintenance__required">*</span>
                  </Form.Label>

                  <Form.Control
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder={tr(
                      "products.form.placeholders.code",
                      "Example: SRV-001"
                    )}
                    isInvalid={Boolean(errors.code)}
                  />

                  <Form.Control.Feedback type="invalid">
                    {errors.code}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} lg={8}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.description", "Description")}
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder={tr(
                      "products.form.placeholders.description",
                      "Write a short description of this product or service."
                    )}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} lg={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.image", "Product image")}
                  </Form.Label>

                  <div className="product-maintenance__image-box">
                    {formData.imagePreviewUrl ? (
                      <img
                        src={formData.imagePreviewUrl}
                        alt={formData.name || "Product preview"}
                      />
                    ) : (
                      <div className="product-maintenance__image-empty">
                        <FaImage />
                        <span>
                          {tr("products.form.imagePlaceholder", "No image selected")}
                        </span>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    hidden
                  />

                  <div className="product-maintenance__image-actions">
                    <Button
                      type="button"
                      variant="outline-primary"
                      onClick={handleImageButtonClick}
                      disabled={saving}
                    >
                      <FaImage />
                      {tr("products.form.actions.loadImage", "Load image")}
                    </Button>

                    {formData.imagePreviewUrl && (
                      <Button
                        type="button"
                        variant="outline-danger"
                        onClick={handleRemoveImage}
                        disabled={saving}
                      >
                        <FaTimes />
                        {tr("products.form.actions.removeImage", "Remove")}
                      </Button>
                    )}
                  </div>

                  {uploadingImage && (
                    <small className="product-maintenance__help">
                      <Spinner animation="border" size="sm" />{" "}
                      {tr("products.form.uploadingImage", "Uploading image...")}
                    </small>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="product-maintenance__section">
            <div className="product-maintenance__section-title">
              <FaDollarSign />
              <span>{tr("products.form.sections.pricing", "Pricing")}</span>
            </div>

            <Row className="align-items-end">
              <Col xs={12} md={3}>
                <Form.Group className="product-maintenance__field">
                  <Form.Check
                    type="switch"
                    id="has-price-switch"
                    name="hasPrice"
                    checked={formData.hasPrice}
                    onChange={handleChange}
                    label={tr("products.form.fields.hasPrice", "Product has price")}
                  />
                </Form.Group>
              </Col>

              <Col xs={12} md={3}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label htmlFor="product-store-currency">
                    {tr("products.form.fields.currency", "Currency")}
                  </Form.Label>
                  {/* One currency per company: chosen in "Company page". */}
                  <Form.Control
                    id="product-store-currency"
                    type="text"
                    value={storeCurrency || DEFAULT_CURRENCY_SYMBOL}
                    readOnly
                    plaintext={false}
                    className="product-maintenance__store-currency"
                    title={tr("products.form.storeCurrencyHelp", "The store currency is set in Company page")}
                  />
                  <Form.Text muted>
                    {tr("products.form.storeCurrencyHelp", "The store currency is set in Company page")}
                  </Form.Text>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.basePrice", "Base price")}
                    {formData.hasPrice && (
                      <span className="product-maintenance__required">*</span>
                    )}
                  </Form.Label>

                  <InputGroup>
                    {/* Symbol of the chosen currency. With "Other…" it can
                        be typed (max 5 characters; blank is saved as "$"). */}
                    <InputGroup.Text className="product-maintenance__currency-text">
                      {storeCurrency || DEFAULT_CURRENCY_SYMBOL}
                    </InputGroup.Text>

                    <Form.Control
                      type="number"
                      name="basePrice"
                      value={formData.basePrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={!formData.hasPrice}
                      isInvalid={Boolean(errors.basePrice)}
                    />

                    <Form.Control.Feedback type="invalid">
                      {errors.basePrice}
                    </Form.Control.Feedback>
                  </InputGroup>
                </Form.Group>
              </Col>

              <Col xs={12} md={2}>
                <Form.Group className="product-maintenance__field">
                  <Form.Check
                    type="checkbox"
                    id="tax-free-checkbox"
                    name="taxFree"
                    checked={formData.taxFree}
                    onChange={handleChange}
                    label={tr("products.form.fields.taxFree", "Tax free")}
                  />

                  <small className="product-maintenance__help">
                    {tr(
                      "products.form.taxFreeHelp",
                      "Check if this product has no taxes."
                    )}
                  </small>
                </Form.Group>
              </Col>

              {!formData.taxFree && (
                <Col xs={12} md={3}>
                  <Form.Group className="product-maintenance__field">
                    <Form.Check
                      type="switch"
                      id="show-taxes-switch"
                      name="showTaxes"
                      checked={formData.showTaxes}
                      onChange={handleChange}
                      label={tr(
                        "products.form.fields.showTaxes",
                        "Show price with taxes"
                      )}
                    />

                    <small className="product-maintenance__help">
                      {tr(
                        "products.form.showTaxesHelp",
                        "If on, the shown price includes taxes."
                      )}
                    </small>
                  </Form.Group>
                </Col>
              )}

              {!formData.taxFree && formData.showTaxes && (
                <Col xs={12} md={2}>
                  <Form.Group className="product-maintenance__field">
                    <Form.Label>
                      {tr("products.form.fields.taxPercentage", "Tax %")}
                    </Form.Label>

                    <InputGroup>
                      <Form.Control
                        type="number"
                        name="taxPercentage"
                        value={formData.taxPercentage}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        max="100"
                        step="0.01"
                        isInvalid={Boolean(errors.taxPercentage)}
                      />
                      <InputGroup.Text>%</InputGroup.Text>

                      <Form.Control.Feedback type="invalid">
                        {errors.taxPercentage}
                      </Form.Control.Feedback>
                    </InputGroup>
                  </Form.Group>
                </Col>
              )}
            </Row>

            {/* Reference only (renders nothing): real per-product tax handling
                — a "Modify taxes" toggle and an "Add taxes" button — will be
                added here in the future when invoicing is implemented. For now
                we only use tax_percentage to show the price with taxes included
                (e.g. Costa Rica); other markets (e.g. US) show it without taxes. */}
          </div>

          <div className="product-maintenance__section">
            <div className="product-maintenance__section-title">
              <FaGlobe />
              <span>
                {tr(
                  "products.form.sections.visibility",
                  "Visibility and sales behavior"
                )}
              </span>
            </div>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Check
                    type="switch"
                    id="show-on-web-switch"
                    name="showOnWeb"
                    checked={formData.showOnWeb}
                    onChange={handleChange}
                    label={tr("products.form.fields.showOnWeb", "Show on web")}
                  />

                  <small className="product-maintenance__help">
                    {tr(
                      "products.form.showOnWebHelp",
                      "The product will be visible in the web catalog."
                    )}
                  </small>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Check
                    type="switch"
                    id="available-for-web-sales-switch"
                    name="availableForWebSales"
                    checked={formData.availableForWebSales}
                    onChange={handleChange}
                    label={tr(
                      "products.form.fields.availableForWebSales",
                      "Available for web sales"
                    )}
                    disabled={!formData.showOnWeb}
                  />

                  <small className="product-maintenance__help">
                    {tr(
                      "products.form.availableForWebSalesHelp",
                      "Customers can add it to the cart and order it online."
                    )}
                  </small>
                </Form.Group>
              </Col>

              <Col xs={12} md={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Check
                    type="switch"
                    id="is-appointment-switch"
                    name="isAppointment"
                    checked={formData.webBehavior === WEB_BEHAVIOR_APPOINTMENT}
                    onChange={(event) => {
                      const { checked } = event.target;
                      clearMessages();
                      setFormData((previous) => ({
                        ...previous,
                        webBehavior: checked ? WEB_BEHAVIOR_APPOINTMENT : WEB_BEHAVIOR_DEFAULT,
                      }));
                    }}
                    label={tr("products.form.fields.isAppointment", "This is an appointment (booking)")}
                  />

                  <small className="product-maintenance__help">
                    {tr(
                      "products.form.isAppointmentHelp",
                      "Customers book a date and time in the store instead of adding it to the cart.",
                    )}
                  </small>
                </Form.Group>
              </Col>

              {/* Process / tracking assignment (mandatory, except booking). */}
              <Col xs={12} md={6}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.stepTemplate", "Process (tracking)")}
                    {formData.webBehavior !== "BOOKING" && (
                      <span className="product-maintenance__required"> *</span>
                    )}
                  </Form.Label>

                  {formData.webBehavior === "BOOKING" ? (
                    <div className="product-maintenance__coming-soon">
                      {tr(
                        "products.form.stepTemplateBookingSoon",
                        "Process assignment is not available for booking products yet. Coming soon.",
                      )}
                    </div>
                  ) : (
                    <div className="product-maintenance__inline">
                      <Form.Select
                        name="stepTemplateId"
                        value={formData.stepTemplateId}
                        onChange={handleChange}
                        isInvalid={Boolean(errors.stepTemplateId)}
                      >
                        <option value="">
                          {tr("products.form.stepTemplatePlaceholder", "Select a process")}
                        </option>
                        {stepTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}{tpl.code ? ` (${tpl.code})` : ""}
                          </option>
                        ))}
                        {/* The list has only ACTIVE processes (2026-10-30): a
                            product that already uses a disabled one keeps it. */}
                        {formData.stepTemplateId &&
                          !stepTemplates.some((tpl) => tpl.id === formData.stepTemplateId) && (
                            <option value={formData.stepTemplateId}>
                              {tr("products.form.stepTemplateDisabled", "Current process (disabled)")}
                            </option>
                          )}
                      </Form.Select>

                      <Button
                        type="button"
                        variant="outline-primary"
                        className="product-maintenance__inline-add"
                        onClick={() => setShowTrackingModal(true)}
                        title={tr("products.form.addStepTemplate", "Create a new process")}
                      >
                        <FaPlus />
                      </Button>
                    </div>
                  )}

                  {/* d-block: the select is inside the inline row, so Bootstrap's
                      sibling rule does not show this message by itself. */}
                  <Form.Control.Feedback type="invalid" className={errors.stepTemplateId ? "d-block" : undefined}>
                    {errors.stepTemplateId}
                  </Form.Control.Feedback>

                  <small className="product-maintenance__help">
                    {tr(
                      "products.form.stepTemplateHelp",
                      "Assign the process (steps) this product will follow.",
                    )}
                  </small>
                </Form.Group>
              </Col>

              {/* Contact (2026-10-31): the store's "Contact us" uses the company
                  WhatsApp and social network link (Company page) for every
                  product. The old per-product phone / Messenger link are no
                  longer edited here; their saved values are kept unchanged. */}
              <Col xs={12}>
                <small className="product-maintenance__help">
                  {tr(
                    "products.form.contactFromCompany",
                    "Contact buttons (WhatsApp and social network) are set once for all products in Company page.",
                  )}
                </small>
              </Col>
            </Row>
          </div>

          <div className="product-maintenance__section">
            <div className="product-maintenance__section-title">
              <FaLayerGroup />
              <span>
                {tr("products.form.sections.additional", "Additional options")}
              </span>
            </div>

            <Row>
              <Col xs={12} md={3}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.status", "Status")}
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

              <Col xs={12} md={4}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.category", "Category")}
                    <span className="product-maintenance__required">*</span>
                  </Form.Label>

                  <div className="product-maintenance__inline">
                    <Form.Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      onFocus={() => handleLoadCategories()}
                      onClick={() => handleLoadCategories()}
                      isInvalid={Boolean(errors.category)}
                    >
                      <option value="">
                        {loadingCategories
                          ? tr("products.form.loadingCategories", "Loading categories...")
                          : tr("products.form.placeholders.category", "Select category")}
                      </option>

                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </Form.Select>

                    <Button
                      type="button"
                      variant="outline-primary"
                      className="product-maintenance__inline-add"
                      onClick={() => setShowCategoryModal(true)}
                      title={tr("products.form.addCategory", "Create a new category")}
                      aria-label={tr("products.form.addCategory", "Create a new category")}
                    >
                      <FaPlus />
                    </Button>
                  </div>

                  {/* d-block: the select is inside the inline row, so Bootstrap's
                      sibling rule does not show this message by itself. */}
                  <Form.Control.Feedback type="invalid" className={errors.category ? "d-block" : undefined}>
                    {errors.category}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>

              <Col xs={12} md={5}>
                <Form.Group className="product-maintenance__field">
                  <Form.Label>
                    {tr("products.form.fields.comments", "Comments")}
                  </Form.Label>

                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="comments"
                    value={formData.comments}
                    onChange={handleChange}
                    placeholder={tr(
                      "products.form.placeholders.comments",
                      "Internal comments about this product."
                    )}
                  />
                </Form.Group>
              </Col>
            </Row>
          </div>

          <div className="product-maintenance__actions">
            <div>
              {isMaintenanceMode && selectedProductId && (
                <Button
                  type="button"
                  variant="outline-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  <FaTrash />
                  {tr("products.form.actions.delete", "Deactivate")}
                </Button>
              )}
            </div>

            <div className="product-maintenance__actions-right">
              <Button
                type="button"
                variant="outline-secondary"
                onClick={handleClear}
                disabled={saving}
              >
                <FaTrash />
                {tr("products.form.actions.clear", "Clear")}
              </Button>

              <Button
                type="button"
                variant="outline-dark"
                onClick={onCancel}
                disabled={saving}
              >
                <FaTimes />
                {tr("products.form.actions.cancel", "Cancel")}
              </Button>

              <Button type="submit" variant="primary" disabled={saving}>
                <FaSave />
                {saving
                  ? tr("products.form.actions.saving", "Saving...")
                  : isMaintenanceMode
                  ? tr("products.form.actions.update", "Update product")
                  : tr("products.form.actions.save", "Save product")}
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
        className="product-search-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaSearch />
            {tr("products.form.searchTitle", "Search products")}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <InputGroup className="product-maintenance__search">
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>

            <Form.Control
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tr(
                "products.form.searchPlaceholder",
                "Search by name, code or category"
              )}
              autoFocus
            />
          </InputGroup>

          {searchError && (
            <Alert variant="danger" className="mt-3 mb-0">
              <FaExclamationTriangle /> {searchError}
            </Alert>
          )}

          <div className="product-maintenance__modal-list">
            {searching ? (
              <div className="product-maintenance__empty-list">
                <Spinner animation="border" size="sm" />
                <strong>{tr("products.form.searching", "Searching...")}</strong>
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const isSelected =
                  selectedProductId === product.productInternalId;

                return (
                  <button
                    key={product.productInternalId}
                    type="button"
                    className={[
                      "product-maintenance__product-item",
                      isSelected
                        ? "product-maintenance__product-item--selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => handleSelectProduct(product)}
                  >
                    <span className="product-maintenance__product-icon">
                      <FaBoxOpen />
                    </span>

                    <span className="product-maintenance__product-info">
                      <strong>{product.name}</strong>
                      <small>
                        {product.code} · {getProductTypeLabel(product.productType)}
                      </small>
                    </span>

                    <Badge
                      bg={product.status === "ACTIVE" ? "success" : "secondary"}
                      pill
                    >
                      {getStatusLabel(product.status)}
                    </Badge>
                  </button>
                );
              })
            ) : (
              <div className="product-maintenance__empty-list">
                <FaBoxOpen />
                <strong>
                  {tr("products.form.noProducts", "No products found")}
                </strong>
                <span>
                  {tr(
                    "products.form.noProductsHelp",
                    "Try another search or create a new product."
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
            {tr("products.form.actions.cancel", "Cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setShowSearchModal(false);
              handleCreateMode();
            }}
          >
            <FaPlus />
            {tr("products.form.actions.new", "New")}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Popup to create a new process without leaving the form. */}
      <Modal
        show={showTrackingModal}
        onHide={() => {
          setShowTrackingModal(false);
          loadStepTemplates(); // refresh the dropdown after creating
        }}
        size="lg"
        centered
        scrollable
        // A click outside does not close it (2026-10-29): only the X does.
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {tr("products.form.addStepTemplateTitle", "Create a process")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <TrackingMaintenance t={t} onSaved={handleStepTemplateSaved} />
        </Modal.Body>
      </Modal>

      {/* Popup to create a new category without leaving the form (2026-10-29). */}
      <Modal
        show={showCategoryModal}
        onHide={() => {
          setShowCategoryModal(false);
          handleLoadCategories({ force: true }); // refresh the dropdown
        }}
        size="lg"
        centered
        scrollable
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {tr("products.form.addCategoryTitle", "Create a category")}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CategoryMaintenanceForm
            t={t}
            onCancel={() => setShowCategoryModal(false)}
            onSaved={handleCategorySaved}
          />
        </Modal.Body>
      </Modal>

    </section>
  );
}