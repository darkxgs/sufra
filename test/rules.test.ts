import { describe, expect, it } from "vitest";
import { amount, bill, money, parseAmount } from "@/lib/money";
import { defaultSelection, problems, toggleOption, unitCalories, unitPrice } from "@/lib/selection";
import { ageTone, clock, nextStatus, prevStatus, tableState } from "@/lib/tickets";
import type { MenuItem } from "@/lib/types";

const grill: MenuItem = {
  id: "itm_grill",
  categoryId: "cat",
  stationKey: "grill",
  nameAr: "مشاوي",
  nameEn: "Mixed grill",
  descAr: null,
  descEn: null,
  price: 16500,
  calories: 1650,
  tags: [],
  photo: null,
  available: true,
  groups: [
    {
      id: "g_sides",
      nameAr: "طبقان",
      nameEn: "Two sides",
      min: 2,
      max: 2,
      options: [
        { id: "rice", nameAr: "أرز", nameEn: "Rice", priceDelta: 0, caloriesDelta: 210, isDefault: false },
        { id: "fries", nameAr: "بطاطا", nameEn: "Fries", priceDelta: 0, caloriesDelta: 310, isDefault: false },
        { id: "veg", nameAr: "خضار", nameEn: "Vegetables", priceDelta: 600, caloriesDelta: 90, isDefault: false },
      ],
    },
    {
      id: "g_done",
      nameAr: "الاستواء",
      nameEn: "Doneness",
      min: 1,
      max: 1,
      options: [
        { id: "med", nameAr: "متوسطة", nameEn: "Medium", priceDelta: 0, caloriesDelta: 0, isDefault: false },
        { id: "well", nameAr: "مستوية", nameEn: "Well done", priceDelta: 0, caloriesDelta: 0, isDefault: true },
      ],
    },
  ],
};

describe("money", () => {
  it("prints whole amounts without decimals and keeps real fractions", () => {
    expect(amount(4200, "SAR")).toBe("42");
    expect(amount(4250, "SAR")).toBe("42.50");
    expect(amount(125000, "EGP")).toBe("1,250");
    expect(amount(1250, "KWD")).toBe("1.250");
    expect(money(4200, "SAR", "ar")).toBe("42 ر.س");
    expect(money(4200, "SAR", "en")).toBe("SAR 42");
  });

  it("reads prices typed by staff, in either digit set", () => {
    expect(parseAmount("42", "SAR")).toBe(4200);
    expect(parseAmount("42.5", "SAR")).toBe(4250);
    expect(parseAmount("1,250.00", "EGP")).toBe(125000);
    expect(parseAmount("٤٢٫٥", "SAR")).toBe(4250);
    expect(parseAmount("42.555", "SAR")).toBeNull();
    expect(parseAmount("abc", "SAR")).toBeNull();
  });

  it("shows the VAT inside Saudi prices instead of adding it", () => {
    const b = bill(11500, { vatBps: 1500, serviceBps: 0, pricesIncludeVat: true });
    expect(b).toEqual({ subtotal: 11500, service: 0, vat: 1500, total: 11500, vatIncluded: true });
  });

  it("adds service, then VAT on both, for Egyptian-style bills", () => {
    const b = bill(10000, { vatBps: 1400, serviceBps: 1200, pricesIncludeVat: false });
    expect(b.service).toBe(1200);
    expect(b.vat).toBe(1568); // 14% of 112.00
    expect(b.total).toBe(12768);
  });
});

describe("choosing options", () => {
  it("starts from the defaults and enforces each group's rules", () => {
    const start = defaultSelection(grill);
    expect(start).toEqual(["well"]);
    expect(problems(grill, start)).toEqual([{ groupId: "g_sides", kind: "too_few" }]);
    let sel = toggleOption(grill, start, "rice");
    sel = toggleOption(grill, sel, "veg");
    expect(problems(grill, sel)).toEqual([]);
    // A third side is refused rather than silently swapped.
    expect(toggleOption(grill, sel, "fries")).toEqual(sel);
    // A required single choice swaps, and can't be emptied.
    expect(toggleOption(grill, sel, "med")).toContain("med");
    expect(toggleOption(grill, sel, "med")).not.toContain("well");
    expect(toggleOption(grill, sel, "well")).toContain("well");
  });

  it("prices and counts calories with the chosen extras", () => {
    expect(unitPrice(grill, ["rice", "veg", "well"])).toBe(17100);
    expect(unitCalories(grill, ["rice", "veg", "well"])).toBe(1650 + 210 + 90);
  });
});

describe("tickets", () => {
  it("moves one step at a time, both ways", () => {
    expect(nextStatus("new")).toBe("preparing");
    expect(nextStatus("ready")).toBe("served");
    expect(nextStatus("served")).toBeNull();
    expect(prevStatus("ready")).toBe("preparing");
    expect(prevStatus("new")).toBeNull();
  });

  it("colours a ticket by how long it has waited", () => {
    expect(ageTone(4 * 60_000, 10, 20)).toBe("ok");
    expect(ageTone(12 * 60_000, 10, 20)).toBe("warn");
    expect(ageTone(25 * 60_000, 10, 20)).toBe("late");
    expect(clock(365_000)).toBe("6:05");
    expect(clock(3_725_000)).toBe("1:02:05");
    expect(clock(-5)).toBe("0:00");
  });

  it("reports the most urgent thing about a table", () => {
    expect(tableState(null)).toBe("free");
    expect(tableState({ orders: [{ status: "served" }], requests: [] })).toBe("seated");
    expect(tableState({ orders: [{ status: "preparing" }], requests: [] })).toBe("waiting");
    expect(tableState({ orders: [{ status: "preparing" }, { status: "ready" }], requests: [] })).toBe("ready");
    expect(tableState({ orders: [{ status: "ready" }], requests: [{ kind: "waiter" }] })).toBe("attention");
    expect(tableState({ orders: [], requests: [{ kind: "waiter" }, { kind: "bill" }] })).toBe("bill");
  });
});

describe("words for time", () => {
  it("says how long something waited, with Arabic number agreement", async () => {
    const { waited } = await import("@/lib/format");
    const min = 60_000;
    expect(waited(20_000, "en")).toBe("just now");
    expect(waited(5 * min, "en")).toBe("5 min");
    expect(waited(65 * min, "en")).toBe("1 h 5 min");
    expect(waited(20_000, "ar")).toBe("الآن");
    expect(waited(1 * min, "ar")).toBe("منذ دقيقة");
    expect(waited(2 * min, "ar")).toBe("منذ دقيقتين");
    expect(waited(7 * min, "ar")).toBe("منذ 7 دقائق");
    expect(waited(25 * min, "ar")).toBe("منذ 25 دقيقة");
    expect(waited(122 * min, "ar")).toBe("منذ ساعتين ودقيقتين");
  });
});
