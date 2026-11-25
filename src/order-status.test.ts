import { describe, expect, it } from "vitest";
import { label } from "./order-status";

describe("label", () => {
  it("traduce draft", () => {
    expect(label("draft")).toBe("Borrador");
  });
  it("traduce paid", () => {
    expect(label("paid")).toBe("Pagado");
  });
  it("traduce shipped", () => {
    expect(label("shipped")).toBe("Enviado");
  });
});
