export const DEFAULT_DISCOUNT_NAME = "Off season pricing";

const clampMoney = (value) => Math.max(0, Number(value || 0));
const clampPercent = (value) => Math.max(0, Math.min(100, Number(value || 0)));

export const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));

export const normalizeDiscountConfig = (source = {}) => {
  const type = source.discountType === "percent" ? "percent" : "amount";
  const rawValue = Number(source.discountValue || 0);
  const value = type === "percent" ? clampPercent(rawValue) : clampMoney(rawValue);
  const name = String(source.discountName || DEFAULT_DISCOUNT_NAME).trim();

  return {
    enabled: Boolean(source.discountEnabled),
    name: name || DEFAULT_DISCOUNT_NAME,
    type,
    value,
  };
};

export const buildDiscountFields = (source = {}) => {
  const config = normalizeDiscountConfig(source);
  return {
    discountEnabled: config.enabled,
    discountName: config.name,
    discountType: config.type,
    discountValue: config.value,
  };
};

export const getItemPricing = (item = {}) => {
  const explicitUnitPrice = clampMoney(item.price);
  const configuredOriginalUnitPrice = clampMoney(
    item.originalPrice ?? item.basePrice ?? explicitUnitPrice
  );
  const capturedDiscount = Math.max(
    0,
    configuredOriginalUnitPrice - explicitUnitPrice
  );
  const config = normalizeDiscountConfig(item);
  const configuredDiscount =
    config.enabled && config.value > 0
      ? config.type === "percent"
        ? configuredOriginalUnitPrice * (config.value / 100)
        : config.value
      : 0;
  const unitDiscount = Math.min(
    configuredOriginalUnitPrice,
    capturedDiscount > 0 ? capturedDiscount : configuredDiscount
  );
  const hasDiscount = unitDiscount > 0;
  const originalUnitPrice = hasDiscount
    ? configuredOriginalUnitPrice
    : explicitUnitPrice;
  const unitPrice = hasDiscount
    ? Math.max(0, configuredOriginalUnitPrice - unitDiscount)
    : explicitUnitPrice;

  return {
    originalUnitPrice,
    unitPrice,
    discountedUnitPrice: unitPrice,
    unitDiscount,
    hasDiscount,
    discountName: hasDiscount
      ? String(item.discountName || config.name || DEFAULT_DISCOUNT_NAME).trim() ||
        DEFAULT_DISCOUNT_NAME
      : "",
    discountType: item.discountType === "percent" ? "percent" : "amount",
    discountValue:
      item.discountType === "percent"
        ? clampPercent(item.discountValue)
        : clampMoney(item.discountValue),
  };
};

export const captureItemPricing = (item = {}) => {
  const pricing = getItemPricing(item);
  return {
    price: pricing.unitPrice,
    originalPrice: pricing.originalUnitPrice,
    discountEnabled: pricing.hasDiscount,
    discountName: pricing.discountName,
    discountType: pricing.discountType,
    discountValue: pricing.discountValue,
    discountAmount: pricing.unitDiscount,
  };
};

export const getLineTotal = (item = {}, quantityOverride) => {
  const quantity = Math.max(
    0,
    Number(quantityOverride ?? item.quantity ?? 0)
  );
  return getItemPricing(item).unitPrice * quantity;
};

export const getOriginalLineTotal = (item = {}, quantityOverride) => {
  const quantity = Math.max(
    0,
    Number(quantityOverride ?? item.quantity ?? 0)
  );
  return getItemPricing(item).originalUnitPrice * quantity;
};

export const getItemDiscountTotal = (item = {}, quantityOverride) => {
  const quantity = Math.max(
    0,
    Number(quantityOverride ?? item.quantity ?? 0)
  );
  return getItemPricing(item).unitDiscount * quantity;
};

const getManualDiscount = (inquiry = {}, baseAmount = 0) => {
  const type =
    inquiry.discountType === "percent" || inquiry.discountType === "amount"
      ? inquiry.discountType
      : "amount";
  const raw =
    inquiry.discountType === "percent"
      ? Number(inquiry.discountValue || 0)
      : inquiry.discount != null
      ? Number(inquiry.discount || 0)
      : Number(inquiry.discountValue || 0) || 0;
  const amount =
    type === "percent"
      ? clampPercent(raw) * 0.01 * Math.max(0, baseAmount)
      : clampMoney(raw);

  return {
    type,
    raw,
    amount: Math.min(Math.max(0, baseAmount), amount),
    name: String(inquiry.discountName || "Manual discount").trim() ||
      "Manual discount",
  };
};

export const calcInquiryTotals = (inquiry = {}) => {
  const items = Array.isArray(inquiry.items) ? inquiry.items : [];
  const discountGroups = new Map();
  let subtotal = 0;
  let itemDiscountApplied = 0;

  items.forEach((item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const pricing = getItemPricing(item);
    subtotal += pricing.originalUnitPrice * quantity;
    const itemDiscount = pricing.unitDiscount * quantity;
    itemDiscountApplied += itemDiscount;

    if (itemDiscount > 0) {
      const name = pricing.discountName || DEFAULT_DISCOUNT_NAME;
      discountGroups.set(name, (discountGroups.get(name) || 0) + itemDiscount);
    }
  });

  const itemSubtotal = Math.max(0, subtotal - itemDiscountApplied);
  const manualDiscount = getManualDiscount(inquiry, itemSubtotal);
  const manualDiscountApplied = manualDiscount.amount;
  const discountApplied = itemDiscountApplied + manualDiscountApplied;
  const baseAfterDiscount = Math.max(0, itemSubtotal - manualDiscountApplied);

  const feeType =
    inquiry.feeType === "percent" || inquiry.feeType === "amount"
      ? inquiry.feeType
      : "amount";
  const feeRaw = Number(inquiry.feeValue || 0);
  const feeApplied =
    feeType === "percent"
      ? clampPercent(feeRaw) * 0.01 * baseAfterDiscount
      : clampMoney(feeRaw);
  const travel = clampMoney(inquiry.travelAmount);
  const taxPercent = clampPercent(inquiry.taxPercent);
  const taxApplied = taxPercent * 0.01 * baseAfterDiscount;
  const total = Math.max(
    0,
    baseAfterDiscount + feeApplied + travel + taxApplied
  );

  const discountBreakdown = Array.from(discountGroups.entries()).map(
    ([name, amount]) => ({
      name,
      amount,
      type: "item",
    })
  );

  if (manualDiscountApplied > 0) {
    discountBreakdown.push({
      name: manualDiscount.name,
      amount: manualDiscountApplied,
      type: "manual",
    });
  }

  return {
    subtotal,
    itemSubtotal,
    itemDiscountApplied,
    manualDiscountApplied,
    discountApplied,
    discountBreakdown,
    baseAfterDiscount,
    feeApplied,
    travel,
    taxApplied,
    total,
    dType: manualDiscount.type,
    dRaw: manualDiscount.raw,
    fType: feeType,
    fRaw: feeRaw,
    taxPercent,
  };
};
