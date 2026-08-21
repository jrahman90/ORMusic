import {
  calcInquiryTotals,
  captureItemPricing,
  getItemPricing,
} from "./pricing";

test("computes active catalog discounts from original price", () => {
  const pricing = getItemPricing({
    price: 1000,
    discountEnabled: true,
    discountName: "Off season pricing",
    discountType: "percent",
    discountValue: 15,
  });

  expect(pricing.originalUnitPrice).toBe(1000);
  expect(pricing.unitPrice).toBe(850);
  expect(pricing.unitDiscount).toBe(150);
  expect(pricing.discountName).toBe("Off season pricing");
});

test("captures discounted cart item pricing for inquiry copies", () => {
  const captured = captureItemPricing({
    price: 400,
    discountEnabled: true,
    discountType: "amount",
    discountValue: 75,
  });

  expect(captured.originalPrice).toBe(400);
  expect(captured.price).toBe(325);
  expect(captured.discountEnabled).toBe(true);
  expect(captured.discountAmount).toBe(75);
});

test("shows item discounts in inquiry discount totals", () => {
  const totals = calcInquiryTotals({
    items: [
      {
        name: "Wedding Package",
        originalPrice: 1000,
        price: 850,
        quantity: 2,
        discountName: "Off season pricing",
      },
    ],
    discountType: "amount",
    discountValue: 50,
  });

  expect(totals.subtotal).toBe(2000);
  expect(totals.itemDiscountApplied).toBe(300);
  expect(totals.manualDiscountApplied).toBe(50);
  expect(totals.discountApplied).toBe(350);
  expect(totals.total).toBe(1650);
  expect(totals.discountBreakdown).toEqual([
    { name: "Off season pricing", amount: 300, type: "item" },
    { name: "Manual discount", amount: 50, type: "manual" },
  ]);
});
