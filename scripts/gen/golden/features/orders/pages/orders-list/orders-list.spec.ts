import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { NEVER, of, throwError } from "rxjs";
import { OrdersApi } from "../../services/orders-api";
import { OrdersList } from "./orders-list";

type GetAll = OrdersApi["getAll"];

async function render(getAll: GetAll): Promise<ComponentFixture<OrdersList>> {
  TestBed.configureTestingModule({
    imports: [OrdersList],
    providers: [{ provide: OrdersApi, useValue: { getAll } }],
  });
  const fixture = TestBed.createComponent(OrdersList);
  await fixture.whenStable();
  return fixture;
}

function element(fixture: ComponentFixture<OrdersList>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function click(
  fixture: ComponentFixture<OrdersList>,
  label: string,
): Promise<void> {
  const button = Array.from(element(fixture).querySelectorAll("button")).find(
    (b) => b.textContent.trim() === label,
  );
  button?.click();
  await fixture.whenStable();
}

describe("OrdersList", () => {
  it("muestra un elemento por registro", async () => {
    const fixture = await render(() => of([{ id: "1" }, { id: "2" }]));
    expect(element(fixture).querySelectorAll("li")).toHaveLength(2);
  });

  it("muestra un mensaje cuando no hay registros", async () => {
    const fixture = await render(() => of([]));
    expect(element(fixture).textContent).toContain("No hay elementos.");
  });

  it("muestra el estado de carga", async () => {
    const fixture = await render(() => NEVER);
    expect(element(fixture).textContent).toContain("Cargando");
  });

  it("muestra el error y permite reintentar", async () => {
    let calls = 0;
    const fixture = await render(() => {
      calls++;
      return calls === 1
        ? throwError(() => new Error("boom"))
        : of([{ id: "1" }]);
    });
    expect(element(fixture).querySelector('[role="alert"]')).not.toBeNull();

    await click(fixture, "Reintentar");
    expect(element(fixture).querySelector('[role="alert"]')).toBeNull();
    expect(element(fixture).querySelectorAll("li")).toHaveLength(1);
  });
});
