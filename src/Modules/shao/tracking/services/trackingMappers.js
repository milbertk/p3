// =====================================================================
//  Tracking mappers — translate between the component shape and the
//  backend TrackingBundle shape.
//
//  Component shape:
//    tracking = {
//      id, name, internalCode, trackingNumber,
//      targetMode ("category"|"product"), categoryId, productId,
//      steps: [ { stepId, name, order, dependsOnStepId } ]
//    }
//
//  Backend bundle:
//    {
//      config: { trackingConfigId, trackingNumber, internalCode, name,
//                categoryId, productId, targetType, active },
//      steps:  [ { trackingStepId, stepName, stepOrder, dependsOnStepId, active } ]
//    }
//
//  NOTE on step dependency: because saving deletes and re-inserts every step,
//  the real step IDs change. So we DO NOT send dependsOnStepId by real id on
//  save (it would point to a deleted id). It is left null for now; the final
//  dependency behavior is still to be defined.
// =====================================================================

function toNullableString(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

// ---------------------------------------------------------------------
// COMPONENT -> BACKEND (for saving)
// ---------------------------------------------------------------------
export function trackingToBundle(tracking) {
  // targetMode can be "category" | "product" | "general".
  let targetType = "CATEGORY";
  if (tracking.targetMode === "product") targetType = "PRODUCT";
  else if (tracking.targetMode === "general") targetType = "GENERAL";

  const config = {
    trackingConfigId: tracking.id || "",
    trackingNumber: toNullableString(tracking.trackingNumber),
    internalCode: String(tracking.internalCode || "").trim(),
    name: String(tracking.name || "").trim(),
    categoryId:
      targetType === "CATEGORY"
        ? toNullableString(tracking.categoryId)
        : null,
    productId:
      targetType === "PRODUCT"
        ? toNullableString(tracking.productId)
        : null,
    targetType,
    active: tracking.active !== false,
    isDefault: Boolean(tracking.isDefault),
  };

  const steps = (tracking.steps || []).map((step, index) => ({
    stepName: String(step.name || "").trim(),
    stepOrder: Number(step.order) || index + 1,
    // Not sent by real id (steps are recreated on save). Kept null for now.
    dependsOnStepId: null,
    active: true,
  }));

  return { config, steps };
}

// ---------------------------------------------------------------------
// BACKEND -> COMPONENT (for loading after search/select)
// ---------------------------------------------------------------------
export function bundleToTracking(bundle) {
  const config = bundle?.config || {};
  const backendSteps = Array.isArray(bundle?.steps) ? bundle.steps : [];

  const categoryId = config.categoryId || config.category_id || "";
  const productId = config.productId || config.product_id || "";
  const targetType = String(config.targetType || config.target_type || "")
    .toUpperCase();

  const steps = backendSteps.map((step) => ({
    stepId:
      step.trackingStepId ||
      step.tracking_step_id ||
      `step-${Math.random().toString(16).slice(2)}`,
    name: String(step.stepName || step.step_name || ""),
    order: Number(step.stepOrder || step.step_order) || 0,
    dependsOnStepId:
      step.dependsOnStepId || step.depends_on_step_id || "",
    requiresPrevious: Boolean(
      step.dependsOnStepId || step.depends_on_step_id,
    ),
  }));

  return {
    id: config.trackingConfigId || config.tracking_config_id || null,
    name: String(config.name || ""),
    internalCode: String(config.internalCode || config.internal_code || ""),
    trackingNumber: String(config.trackingNumber || config.tracking_number || ""),
    targetMode:
      targetType === "PRODUCT"
        ? "product"
        : targetType === "GENERAL"
        ? "general"
        : "category",
    categoryId: String(categoryId || ""),
    productId: String(productId || ""),
    isDefault: Boolean(config.isDefault ?? config.is_default),
    steps,
  };
}