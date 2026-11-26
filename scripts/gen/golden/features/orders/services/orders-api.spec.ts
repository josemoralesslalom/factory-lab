import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import { OrdersApi } from "./orders-api";

describe("OrdersApi", () => {
  it("getAll devuelve una lista", async () => {
    const items = await firstValueFrom(TestBed.inject(OrdersApi).getAll());
    expect(items).toEqual([]);
  });
});
