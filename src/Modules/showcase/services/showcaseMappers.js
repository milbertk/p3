// =====================================================================
//  Showcase mapper — convert a backend public-showcase item into the shape
//  the CompanyShowcase component already expects.
//
//  Backend item (PublicShowcaseItem):
//    { productInternalId, productCode, categoryId, name, description,
//      productType, hasPrice, basePrice, webBehavior, imageUrl, kind }
//
//  Component product shape:
//    { id, companyId, code, name, category, description, price, image,
//      allowsOnlineOrder, allowsBooking }
//
//  Behavior mapping (from "kind" / webBehavior):
//    - kind === "BOOKING"  -> allowsBooking = true
//    - kind === "PRODUCT"  -> allowsOnlineOrder = true
//    - kind === "SERVICE"  -> contact only (neither order nor booking), unless
//                             its webBehavior is BOOKING (already caught above)
// =====================================================================

const PLACEHOLDER_IMAGE = "";

export function showcaseItemToProduct(item, companyId) {
  const kind = String(item.kind || "").toUpperCase();
  const webBehavior = String(item.webBehavior || "").toUpperCase();

  const allowsBooking = kind === "BOOKING" || webBehavior === "BOOKING";
  // A plain product allows online order; a service (non-booking) is contact-only.
  const allowsOnlineOrder = kind === "PRODUCT";

  const basePrice =
    item.basePrice === null || item.basePrice === undefined
      ? null
      : Number(item.basePrice);

  return {
    id: String(item.productInternalId || item.product_internal_id || ""),
    companyId: String(companyId || ""),
    code: String(item.productCode || item.product_code || ""),
    name: String(item.name || ""),
    category: String(item.categoryId || item.category_id || ""),
    description: String(item.description || ""),
    price: item.hasPrice ? basePrice : null,
    image: String(item.imageUrl || item.image_url || PLACEHOLDER_IMAGE),
    allowsOnlineOrder,
    allowsBooking,
    // Keep the raw kind/behavior in case the UI wants them.
    kind,
    webBehavior,
  };
}

export function mapShowcaseItems(items, companyId) {
  return (Array.isArray(items) ? items : [])
    .map((item) => showcaseItemToProduct(item, companyId))
    .filter((product) => product.id);
}
