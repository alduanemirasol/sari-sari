// ============================================================
// DB HELPERS — schema query helpers (new_schema.txt)
// ============================================================

/** Get the current (latest) pricing for a product (base unit row: unit_id = null or matches product.unit_id) */
function getProductPricing(product_id) {
  const p = db.products.find((x) => x.id === product_id);
  const baseUnitId = p ? p.unit_id : null;
  const rows = db.product_pricing
    .filter(
      (pp) =>
        pp.product_id === product_id &&
        (pp.unit_id === null ||
          pp.unit_id === baseUnitId ||
          pp.unit_id === undefined),
    )
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  // Fallback: any row for this product
  if (rows.length === 0) {
    const all = db.product_pricing
      .filter((pp) => pp.product_id === product_id)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
    return all[0] || null;
  }
  return rows[0];
}

/** Get pricing active on a given ISO date for the base unit */
function getProductPricingAt(product_id, dateStr) {
  const p = db.products.find((x) => x.id === product_id);
  const baseUnitId = p ? p.unit_id : null;
  const rows = db.product_pricing
    .filter(
      (pp) =>
        pp.product_id === product_id &&
        (pp.unit_id === null ||
          pp.unit_id === baseUnitId ||
          pp.unit_id === undefined) &&
        pp.effective_date <= dateStr,
    )
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || getProductPricing(product_id);
}

/**
 * Get all additional (non-base) unit pricing rows for a product.
 * These are product_pricing rows where unit_id differs from the product's base unit_id.
 */
function getProductUnitOptions(product_id) {
  const p = db.products.find((x) => x.id === product_id);
  if (!p) return [];
  const baseUnitId = p.unit_id;
  // Get the latest pricing row per unit_id (non-base units only)
  const unitMap = {};
  db.product_pricing
    .filter(
      (pp) =>
        pp.product_id === product_id &&
        pp.unit_id != null &&
        pp.unit_id !== baseUnitId,
    )
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date))
    .forEach((pp) => {
      if (!unitMap[pp.unit_id]) unitMap[pp.unit_id] = pp;
    });
  return Object.values(unitMap);
}

/** Get a specific pricing row for a product+unit (latest effective row) */
function getProductUnitPricing(product_id, unit_id) {
  const rows = db.product_pricing
    .filter((pp) => pp.product_id === product_id && pp.unit_id === unit_id)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || null;
}

/** Get category name for a product */
function getProductCategory(product) {
  const cat = db.product_categories.find(
    (c) => c.id === product.product_category_id,
  );
  return cat ? cat.name : "Others";
}

/** Compute outstanding balance for a credit row */
function getCreditBalance(ct) {
  const paid = db.credit_payments
    .filter((p) => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  return Math.max(0, ct.amount_owed - paid);
}

/** Compute credit status */
function getCreditStatus(ct) {
  const paid = db.credit_payments
    .filter((p) => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  if (paid <= 0) return "unpaid";
  if (paid >= ct.amount_owed) return "paid";
  return "partial";
}

/** Total unpaid balance for a customer */
function getCustomerDebt(customer_id) {
  return db.credit
    .filter((ct) => ct.customer_id === customer_id)
    .reduce((sum, ct) => sum + getCreditBalance(ct), 0);
}

/** Get bundle_items rows for a bundle */
function getBundleItems(bundle_id) {
  return db.bundle_items.filter((bi) => bi.bundle_id === bundle_id);
}

/** Calculate retail total for a bundle */
function getBundleRetailTotal(bundle_id) {
  return getBundleItems(bundle_id).reduce((sum, bi) => {
    const p = db.products.find((x) => x.id === bi.product_id);
    const pricing = p ? getProductPricing(p.id) : null;
    return sum + (pricing ? pricing.retail_price * bi.quantity : 0);
  }, 0);
}

/** Get product-specific package conversion */
function getProductPackageConversion(product_id) {
  if (!db.product_package_conversions) return null;
  return (
    db.product_package_conversions.find((c) => c.product_id === product_id) ||
    null
  );
}

/** Get stock_log_reason_id by name */
function getStockLogReasonId(name) {
  const r = db.stock_log_reasons.find((x) => x.name === name);
  return r ? r.id : 5; // default: adjustment
}

/** Get stock_log_reason name by id */
function getStockLogReasonName(id) {
  const r = db.stock_log_reasons.find((x) => x.id === id);
  return r ? r.name : "adjustment";
}

/** Get sale_type name by id */
function getSaleTypeName(id) {
  const st = db.sale_types ? db.sale_types.find((x) => x.id === id) : null;
  return st ? st.name : id === 2 ? "wholesale" : "retail";
}

/** Get sale_type_id by name */
function getSaleTypeId(name) {
  if (!db.sale_types) return name === "wholesale" ? 2 : 1;
  const st = db.sale_types.find((x) => x.name === name);
  return st ? st.id : 1;
}

// ============================================================
// UNIT HELPERS
// ============================================================

function isContinuousUnit(unit_id) {
  return [2, 3, 4, 5].includes(unit_id);
}

function unitStep(unit_id) {
  if (unit_id === 4 || unit_id === 2) return 0.5;
  if (unit_id === 5 || unit_id === 3) return 100;
  return 1;
}

function fmtQty(qty, unit_id) {
  const u = db.units.find((x) => x.id === unit_id);
  const num = parseFloat(qty.toFixed(3));
  return u && u.id !== 1 && u.id !== 6
    ? `${num} ${u.abbreviation}`
    : String(num);
}

/**
 * Resolve the correct unit price for a cart item.
 * Checks product_pricing for the specific unit_id first, then falls back to base pricing.
 */
function resolveUnitPrice(product_id, unit_id, quantity, dateStr) {
  // 1. Explicit per-unit pricing row in product_pricing
  const puPricing = getProductUnitPricing(product_id, unit_id);
  if (puPricing && unit_id !== null) {
    const p = db.products.find((x) => x.id === product_id);
    // Only use if this is NOT the base unit row (which has its own wholesale logic below)
    if (p && unit_id !== p.unit_id) {
      const wsEnabled =
        puPricing.wholesale_price > 0 && puPricing.wholesale_min_qty > 0;
      const isWS = wsEnabled && quantity >= puPricing.wholesale_min_qty;
      return {
        unitPrice: isWS ? puPricing.wholesale_price : puPricing.retail_price,
        saleType: isWS ? "wholesale" : "retail",
      };
    }
  }

  // 2. Pack pricing via product_package_conversions
  const pkgConv = getProductPackageConversion(product_id);
  if (pkgConv && unit_id === pkgConv.pack_unit_id) {
    const basePricing = dateStr
      ? getProductPricingAt(product_id, dateStr)
      : getProductPricing(product_id);
    if (basePricing) {
      const packRetail = basePricing.retail_price * pkgConv.pieces_per_pack;
      const packWholesale =
        basePricing.wholesale_price > 0
          ? basePricing.wholesale_price * pkgConv.pieces_per_pack
          : 0;
      const wsEnabled =
        basePricing.wholesale_price > 0 && basePricing.wholesale_min_qty > 0;
      const wsMinPacks = wsEnabled
        ? Math.ceil(basePricing.wholesale_min_qty / pkgConv.pieces_per_pack)
        : 0;
      const isWS = wsEnabled && quantity >= wsMinPacks;
      return {
        unitPrice: isWS ? packWholesale : packRetail,
        saleType: isWS ? "wholesale" : "retail",
      };
    }
  }

  // 3. Base price fallback
  const pricing = dateStr
    ? getProductPricingAt(product_id, dateStr)
    : getProductPricing(product_id);
  if (!pricing) return { unitPrice: 0, saleType: "retail" };

  const wsEnabled =
    pricing.wholesale_price > 0 && pricing.wholesale_min_qty > 0;
  const isWS = wsEnabled && quantity >= pricing.wholesale_min_qty;
  return {
    unitPrice: isWS ? pricing.wholesale_price : pricing.retail_price,
    saleType: isWS ? "wholesale" : "retail",
  };
}

/**
 * Convert a quantity from sold_unit_id into the product's base unit_id.
 */
function convertToBaseUnits(quantity, sold_unit_id, base_unit_id, product_id) {
  if (sold_unit_id === base_unit_id) return quantity;

  // 1. Product-specific pack conversion
  if (product_id != null) {
    const pkgConv = getProductPackageConversion(product_id);
    if (pkgConv) {
      if (
        sold_unit_id === pkgConv.pack_unit_id &&
        base_unit_id === pkgConv.base_unit_id
      ) {
        return quantity * pkgConv.pieces_per_pack;
      }
      if (
        sold_unit_id === pkgConv.base_unit_id &&
        base_unit_id === pkgConv.pack_unit_id
      ) {
        return quantity / pkgConv.pieces_per_pack;
      }
    }
  }

  // 2. Product-specific unit_conversions
  if (product_id != null) {
    const direct = db.unit_conversions.find(
      (uc) =>
        uc.product_id === product_id &&
        uc.from_unit_id === sold_unit_id &&
        uc.to_unit_id === base_unit_id,
    );
    if (direct) return quantity * direct.factor;
    const inverse = db.unit_conversions.find(
      (uc) =>
        uc.product_id === product_id &&
        uc.from_unit_id === base_unit_id &&
        uc.to_unit_id === sold_unit_id,
    );
    if (inverse) return quantity / inverse.factor;
  }

  // 3. Global physical conversions
  const direct = db.unit_conversions.find(
    (uc) =>
      uc.product_id == null &&
      uc.from_unit_id === sold_unit_id &&
      uc.to_unit_id === base_unit_id,
  );
  if (direct) return quantity * direct.factor;

  const inverse = db.unit_conversions.find(
    (uc) =>
      uc.product_id == null &&
      uc.from_unit_id === base_unit_id &&
      uc.to_unit_id === sold_unit_id,
  );
  if (inverse) return quantity / inverse.factor;

  console.warn(
    `tindahan: no conversion from unit_id ${sold_unit_id} → ${base_unit_id} for product ${product_id}. Assuming 1:1.`,
  );
  return quantity;
}
