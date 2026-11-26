import { TestBed } from "@angular/core/testing";
import { OrderRow } from "./order-row";

describe("OrderRow", () => {
  it("muestra el label que recibe", async () => {
    const fixture = TestBed.createComponent(OrderRow);
    fixture.componentRef.setInput("label", "Hola");
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Hola",
    );
  });
});
