// ============================================================
// DB HELPERS — schema query helpers
// Depends on: db-store.js (db)
// ============================================================

/** Get all sellable unit options for a product (from product_units table) */
function getProductUnitOptions(product_id) {
  return db.product_units.filter((pu) => pu.product_id === product_id);
}

/** Get a specific product_unit row by product_id + unit_id */
function getProductUnitPricing(product_id, unit_id) {
  return (
    db.product_units.find(
      (pu) => pu.product_id === product_id && pu.unit_id === unit_id,
    ) || null
  );
}

/** Get the current (latest) pricing for a product */
function getProductPricing(product_id) {
  const rows = db.product_pricing
    .filter((p) => p.product_id === product_id)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || null;
}

/** Get the pricing that was active on a given ISO date string */
function getProductPricingAt(product_id, dateStr) {
  const rows = db.product_pricing
    .filter((p) => p.product_id === product_id && p.effective_date <= dateStr)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  return rows[0] || getProductPricing(product_id);
}

/** Get category name for a product */
function getProductCategory(product) {
  const cat = db.product_categories.find(
    (c) => c.id === product.product_category_id,
  );
  return cat ? cat.name : "Others";
}

/** Compute outstanding balance for a credit_transaction */
function getCreditBalance(ct) {
  const paid = db.credit_payments
    .filter((p) => p.credit_transaction_id === ct.id)
    .reduce((sum, p) => sum + p.amount_paid, 0);
  return Math.max(0, ct.amount_owed - paid);
}

/** Compute credit status for a credit_transaction */
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
  return db.credit_transactions
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

// ============================================================
// UNIT + PRICING HELPERS
// ============================================================

/**
 * Returns true for continuous/measurable units (kg, g, L, ml) where
 * fractional quantities are meaningful.  Discrete units (pc, pk) return false.
 */
function isContinuousUnit(unit_id) {
  // unit_ids: 1=pc, 2=L, 3=ml, 4=kg, 5=g, 6=pk
  return [2, 3, 4, 5].includes(unit_id);
}

/**
 * Natural step size for incrementing a continuous unit in the cart UI.
 *   kg / L  → 0.5
 *   g / ml  → 100
 */
function unitStep(unit_id) {
  if (unit_id === 4 || unit_id === 2) return 0.5; // kg, L
  if (unit_id === 5 || unit_id === 3) return 100; // g, ml
  return 1;
}

/**
 * Format a quantity with its unit abbreviation, trimming unnecessary decimals.
 *   fmtQty(1.5, 4)  → "1.5 kg"
 *   fmtQty(3,   1)  → "3"          (no label for piece)
 *   fmtQty(0.5, 2)  → "0.5 L"
 */
function fmtQty(qty, unit_id) {
  const u = db.units.find((x) => x.id === unit_id);
  const num = parseFloat(qty.toFixed(3)); // trim floating-point noise
  const numStr = Number.isInteger(num) ? String(num) : String(num);
  return u && u.id !== 1 && u.id !== 6 ? `${numStr} ${u.abbreviation}` : numStr;
}

/** Get the product-specific package conversion for a product, if it exists. */
function getProductPackageConversion(product_id) {
  if (!db.product_package_conversions) return null;
  return (
    db.product_package_conversions.find((c) => c.product_id === product_id) ||
    null
  );
}

/**
 * Resolve the correct unit price for a cart item.
 * Resolution order:
 *   1. product_units row for this product+unit  (explicit per-unit pricing)
 *   2. product_package_conversions              (pack sold at pieces_per_pack × base price)
 *   3. product_pricing                          (base/piece price — fallback)
 *
 * @returns {{ unitPrice: number, saleType: 'retail'|'wholesale' }}
 */
function resolveUnitPrice(product_id, unit_id, quantity, dateStr) {
  // 1. Explicit product_units pricing
  const puPricing = getProductUnitPricing(product_id, unit_id);
  if (puPricing) {
    const wsEnabled =
      puPricing.wholesale_price > 0 && puPricing.wholesale_min_qty > 0;
    const isWS = wsEnabled && quantity >= puPricing.wholesale_min_qty;
    return {
      unitPrice: isWS ? puPricing.wholesale_price : puPricing.retail_price,
      saleType: isWS ? "wholesale" : "retail",
    };
  }

  // 2. Pack pricing via product_package_conversions
  //    e.g. 1 pack = 30 pieces @ ₱1.5/pc → pack price = ₱45
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
      // Wholesale threshold for packs: convert min_qty (pieces) → packs
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

  // 3. Base / piece price fallback
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
 * Resolution order:
 *   1. Same unit → no-op
 *   2. product_package_conversions (product-specific pack↔piece)
 *   3. Global unit_conversions (L↔ml, kg↔g)
 *   4. No path found → 1:1 with warning
 */
function convertToBaseUnits(quantity, sold_unit_id, base_unit_id, product_id) {
  if (sold_unit_id === base_unit_id) return quantity;

  // 1. Product-specific pack conversion (e.g. 1 pack of Snow Bear = 30 pieces)
  if (product_id != null) {
    const pkgConv = getProductPackageConversion(product_id);
    if (pkgConv) {
      if (
        sold_unit_id === pkgConv.pack_unit_id &&
        base_unit_id === pkgConv.base_unit_id
      ) {
        return quantity * pkgConv.pieces_per_pack; // pack → pieces
      }
      if (
        sold_unit_id === pkgConv.base_unit_id &&
        base_unit_id === pkgConv.pack_unit_id
      ) {
        return quantity / pkgConv.pieces_per_pack; // pieces → pack
      }
    }
  }

  // 2. Global physical conversions (L↔ml, kg↔g)
  const direct = db.unit_conversions.find(
    (uc) => uc.from_unit_id === sold_unit_id && uc.to_unit_id === base_unit_id,
  );
  if (direct) return quantity * direct.factor;

  const inverse = db.unit_conversions.find(
    (uc) => uc.from_unit_id === base_unit_id && uc.to_unit_id === sold_unit_id,
  );
  if (inverse) return quantity / inverse.factor;

  console.warn(
    `tindahan: no conversion from unit_id ${sold_unit_id} → ${base_unit_id} for product ${product_id}. Assuming 1:1.`,
  );
  return quantity;
}
