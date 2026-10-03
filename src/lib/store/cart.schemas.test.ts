import { describe, expect, it } from "vitest";

import {
  CommerceCartCurrencyTotalSchema,
  CommerceCartItemSchema,
  CommerceCartSchema,
} from "./cart.schemas";

describe("store/cart.schemas", () => {
  describe("CommerceCartItemSchema", () => {
    it("validates a standard bulk line item with pricing", () => {
      const validItemPayload = {
        productId: "prod_123",
        variantId: "var_456",
        variantName: "High Voltage / 480V",
        quantity: 10,
        isSample: false,
        title: "Industrial Step-Down Transformer",
        currency: "USD",
        unitPriceInCents: 15000,
        lineTotalInCents: 150000,
        isMadeToOrder: false,
        minimumOrderQuantity: 5,
        maximumSampleQuantity: null,
        stockState: "in_stock",
      };

      const parsedItem = CommerceCartItemSchema.parse(validItemPayload);
      expect(parsedItem.productId).toBe("prod_123");
      expect(parsedItem.unitPriceInCents).toBe(15000);
      expect(parsedItem.lineTotalInCents).toBe(150000);
    });

    it("validates an unpriced line item with pricingError and nullable money fields", () => {
      const unpricedItemPayload = {
        productId: "prod_retired",
        variantId: null,
        variantName: null,
        quantity: 1,
        isSample: true,
        title: "Discontinued Prototype Board",
        currency: null,
        unitPriceInCents: null,
        lineTotalInCents: null,
        isMadeToOrder: null,
        minimumOrderQuantity: null,
        maximumSampleQuantity: null,
        pricingError: { type: "PRODUCT_NOT_PURCHASABLE" },
      };

      const parsedItem = CommerceCartItemSchema.parse(unpricedItemPayload);
      expect(parsedItem.currency).toBeNull();
      expect(parsedItem.unitPriceInCents).toBeNull();
      expect(parsedItem.pricingError?.type).toBe("PRODUCT_NOT_PURCHASABLE");
    });

    it("rejects non-integer quantities or cents", () => {
      const invalidPayload = {
        productId: "prod_123",
        variantId: null,
        variantName: null,
        quantity: 2.5, // Not an integer
        isSample: false,
        title: "Test item",
        currency: "USD",
        unitPriceInCents: 1000,
        lineTotalInCents: 2500,
        isMadeToOrder: false,
        minimumOrderQuantity: 1,
        maximumSampleQuantity: null,
      };

      expect(() => CommerceCartItemSchema.parse(invalidPayload)).toThrow(/expected int/i);
    });

    it("strips unknown backend fields silently to maintain forward compatibility", () => {
      const payloadWithFutureFields = {
        productId: "prod_123",
        variantId: null,
        variantName: null,
        quantity: 1,
        isSample: false,
        title: "Forward compatible item",
        currency: "USD",
        unitPriceInCents: 1000,
        lineTotalInCents: 1000,
        isMadeToOrder: false,
        minimumOrderQuantity: 1,
        maximumSampleQuantity: null,
        backendInternalHash: "xyz-future-tag",
      };

      const parsedItem = CommerceCartItemSchema.parse(payloadWithFutureFields);
      expect(parsedItem).not.toHaveProperty("backendInternalHash");
    });
  });

  describe("CommerceCartCurrencyTotalSchema", () => {
    it("validates currency total projection", () => {
      const validTotal = {
        currency: "USD",
        subtotalInCents: 50000,
        totalInCents: 50000,
      };

      const parsedTotal = CommerceCartCurrencyTotalSchema.parse(validTotal);
      expect(parsedTotal.currency).toBe("USD");
      expect(parsedTotal.subtotalInCents).toBe(50000);
      expect(parsedTotal.totalInCents).toBe(50000);
    });
  });

  describe("CommerceCartSchema", () => {
    it("validates full cart payload with multiple line items and currency totals", () => {
      const cartPayload = {
        id: "cart_abc",
        buyerOrganizationId: "org_procurement_1",
        items: [
          {
            productId: "prod_1",
            variantId: null,
            variantName: null,
            quantity: 5,
            isSample: false,
            title: "Capacitor 100uF",
            currency: "USD",
            unitPriceInCents: 200,
            lineTotalInCents: 1000,
            isMadeToOrder: false,
            minimumOrderQuantity: 5,
            maximumSampleQuantity: null,
          },
        ],
        currencyTotals: [
          {
            currency: "USD",
            subtotalInCents: 1000,
            totalInCents: 1000,
          },
        ],
        updatedAt: "2026-10-03T09:00:00.000Z",
      };

      const parsedCart = CommerceCartSchema.parse(cartPayload);
      expect(parsedCart.id).toBe("cart_abc");
      expect(parsedCart.items).toHaveLength(1);
      expect(parsedCart.currencyTotals[0]?.currency).toBe("USD");
    });
  });
});
