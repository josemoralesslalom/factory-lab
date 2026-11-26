---
name: frontend-architecture
description: Usar antes de crear, mover, renombrar o modificar cualquier archivo en apps/web/src/app (features, pages, componentes, servicios, modelos, rutas, core, shared) y cuando se pregunte por la estructura del frontend, el manejo de estado o las convenciones de Angular del proyecto.
---

# Arquitectura del frontend

La app vive en `apps/web` (Angular 22, standalone, sin zone.js). Todo el código de la app está en `apps/web/src/app/`.

## Crear piezas: siempre con `pnpm gen`

Las features, pages, componentes, servicios y modelos nuevos se crean con el generador, nunca a mano. El generador crea los archivos con el patrón del proyecto, sus tests y su ruta. Después editas el contenido.

```bash
pnpm gen feature <feature>                                          # <feature>.routes.ts + entrada en app.routes.ts
pnpm gen model <feature> <modelo>                                   # models/<modelo>.ts
pnpm gen service <feature> <servicio> --model <modelo>              # services/<servicio>.ts + spec, con getAll()
pnpm gen page <feature> <page> --service <servicio> [--path <ruta>] # pages/<page>/ (.ts, .html, .spec.ts) + ruta
pnpm gen component <feature> <componente>                           # components/<componente>/ (.ts, .html, .spec.ts)
```

- Orden: feature, model, service, page, component. Si falta una pieza previa, el error dice el comando exacto.
- Nombres en kebab-case. El generador deriva clases, selectores y constantes.
- `--path` vale por defecto el nombre de la page. Para la ruta raíz de la feature usa `--path ""`.
- Nunca sobrescribe. Si responde "Ya existe", edita el archivo existente.
- No borres `// @gen:routes` de los archivos de rutas: ahí inserta las rutas nuevas.
- Lo que el generador no cubre (una función pura, un guard) se crea a mano siguiendo esta skill y se menciona en el resumen final.

## Estructura

```
apps/web/src/app/
├── app.ts, app.html            # Shell: solo el router-outlet
├── app.config.ts               # Registra lo de core/ (interceptores, manejadores globales)
├── app.routes.ts               # Solo loadChildren, una entrada por feature
├── core/                       # Infraestructura global: http, errores, loading, telemetría
├── shared/
│   ├── components/<nombre>/    # Componentes genéricos, sin lógica de negocio
│   └── state/                  # Utilidades de estado reutilizables (view-state)
└── features/<feature>/
    ├── <feature>.routes.ts     # loadComponent, una entrada por page
    ├── pages/<page>/           # Una carpeta por ruta
    ├── components/<nombre>/    # Componentes propios de la feature
    ├── services/               # Datos, HTTP, lógica de negocio
    └── models/                 # Interfaces y tipos de la feature
```

Reglas:

- Una feature **no importa nada de otra feature**. Si dos features necesitan lo mismo, va en `shared/`.
- `shared/` y `core/` **no importan nada de `features/`**.
- `core/` lo registra `app.config.ts`. Las features no configuran infraestructura global.
- Las pages orquestan componentes y leen servicios. No contienen lógica de negocio.
- Los componentes solo muestran datos y emiten eventos. No llaman servicios de datos.
- Toda lógica de negocio (cálculos, reglas, traducciones de estados) va en un servicio o en una función pura de `models/`, con su test.

## Nombres

Sin sufijos de tipo. La carpeta indica el rol y el nombre indica qué hace.

| Pieza               | Archivo                                         | Clase           |
| ------------------- | ----------------------------------------------- | --------------- |
| Page                | `pages/orders-list/orders-list.ts` (+ `.html`)  | `OrdersList`    |
| Componente          | `components/order-row/order-row.ts` (+ `.html`) | `OrderRow`      |
| Servicio            | `services/orders-api.ts`                        | `OrdersApi`     |
| Modelo              | `models/order.ts`                               | `Order`         |
| Rutas de la feature | `orders.routes.ts`                              | `ORDERS_ROUTES` |

Los selectores llevan el prefijo `app-` en kebab-case: `app-orders-list`.

## Rutas

`app.routes.ts` solo carga features:

```ts
import type { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "orders",
    loadChildren: () =>
      import("./features/orders/orders.routes").then((m) => m.ORDERS_ROUTES),
  },
];
```

Cada feature registra sus pages con carga diferida:

```ts
import type { Routes } from "@angular/router";

export const ORDERS_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/orders-list/orders-list").then((m) => m.OrdersList),
  },
];
```

// @gen:routes

`pnpm gen page` registra la ruta. No la escribas a mano.

## Piezas nuevas

Los archivos nuevos en `apps/web/src/app/features/` se crean con `pnpm gen` (skill `frontend-architecture`). Después del generador se edita el contenido; esos archivos no se crean a mano.

## Estado y datos: RxJS

Todo el estado de la app y los datos se manejan con RxJS y se muestran con el `async` pipe. Los signals solo se usan donde el framework los entrega en la frontera del componente: `input()`, `model()` y las queries (`viewChild()`, `contentChild()`). No se usan `signal`, `computed`, `effect`, `linkedSignal`, `resource`, `toSignal`, `rxResource` ni `httpResource`.

- **Los servicios exponen Observables** para todo lo asíncrono, aunque hoy los datos sean fijos (`of(...)`). Así el componente no cambia cuando lleguen de una API.
- **Los componentes exponen streams** (con sufijo `$`) y la plantilla los lee con `async`.
- **Nunca `.subscribe()` en un componente.** El `async` pipe se suscribe y se desuscribe.
- **El estado de la UI** (dropdowns, tabs, filtros abiertos) es un `BehaviorSubject` privado o protegido del componente, que cambia con métodos.
- **Toda carga de datos pasa por `toViewState()`** (`shared/state/view-state.ts`), que convierte el Observable en un estado con `loading`, `ready` y `error`. Así todas las pantallas manejan la carga y el error de la misma forma.
- **Recargar** es un `BehaviorSubject<void>` con `switchMap` hacia la petición.

```ts
import { AsyncPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { BehaviorSubject, switchMap } from "rxjs";
import { toViewState } from "../../../../shared/state/view-state";
import { OrdersApi } from "../../services/orders-api";

@Component({
  imports: [AsyncPipe],
  selector: "app-orders-list",
  templateUrl: "./orders-list.html",
})
export class OrdersList {
  private readonly api = inject(OrdersApi);
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  protected readonly state$ = this.reload$.pipe(
    switchMap(() => this.api.getAll().pipe(toViewState())),
  );
  protected readonly filtersOpen$ = new BehaviorSubject(false);

  protected reload(): void {
    this.reload$.next();
  }

  protected toggleFilters(): void {
    this.filtersOpen$.next(!this.filtersOpen$.value);
  }
}
```

```html
<h1>Pedidos</h1>

<button type="button" (click)="toggleFilters()">Filtros</button>
@if (filtersOpen$ | async) {
<section aria-label="Filtros">Filtros</section>
} @if (state$ | async; as state) { @switch (state.status) { @case ("loading") {
<p>Cargando pedidos…</p>
} @case ("error") {
<p role="alert">No se pudieron cargar los pedidos.</p>
<button type="button" (click)="reload()">Reintentar</button>
} @case ("ready") {
<ul>
  @for (order of state.data; track order.id) {
  <li>{{ order.customer }}</li>
  } @empty {
  <li>No hay pedidos.</li>
  }
</ul>
} } }
```

Toda page que carga datos muestra los cuatro estados: cargando, error con opción de reintentar, vacío y con datos.

## Servicios

```ts
import { Service } from "@angular/core";
import { of, type Observable } from "rxjs";
import type { Order } from "../models/order";

@Service()
export class OrdersApi {
  getAll(): Observable<readonly Order[]> {
    return of([]);
  }
}
```

- Usar `@Service()`. No usar `@Injectable`.
- Para un servicio que no debe ser global: `@Service({ autoProvided: false })` y declararlo en los `providers` donde se use.
- Solo los servicios importan `HttpClient`.
- Los errores HTTP no se atrapan en el servicio para ocultarlos: se propagan para que `toViewState()` los convierta en estado de error. El registro y la normalización de errores HTTP los hace `core/`.

## Componentes y pages

- La plantilla siempre va en un archivo `.html` separado. El `.scss` solo se crea si el componente tiene estilos.
- Dependencias con `inject()`, nunca por constructor.
- Entradas con `input()` / `input.required()`, salidas con `output()`, enlace bidireccional con `model()`. No usar `@Input()` ni `@Output()`.
- Cuando un input alimenta un stream, se pasa a RxJS con `toObservable()`:

```ts
readonly orderId = input.required<string>();
readonly closed = output();

protected readonly customer$ = toObservable(this.orderId).pipe(
  switchMap((id) => this.api.getCustomer(id)),
);
```

- Control flow nativo: `@if`, `@for` (siempre con `track`), `@switch`. Nada de `*ngIf` ni `*ngFor`.
- No importar `CommonModule`. Importar solo lo que use la plantilla (`AsyncPipe`, `CurrencyPipe`, etc.).
- Elementos HTML semánticos (`main`, `nav`, `header`, `footer`, `section`, `button`, `table`). Los mensajes de error llevan `role="alert"`.

## Tests

Cada servicio, page, componente y utilidad tiene su `.spec.ts` al lado. Umbrales: 100% en `services/`, 80% en `pages/` y `components/`.

```ts
import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { NEVER, of, throwError, type Observable } from "rxjs";
import type { Order } from "../../models/order";
import { OrdersApi } from "../../services/orders-api";
import { OrdersList } from "./orders-list";

async function render(
  getAll: () => Observable<readonly Order[]>,
): Promise<ComponentFixture<OrdersList>> {
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
  it("muestra un elemento por pedido", async () => {
    const fixture = await render(() => of([{ id: "1", customer: "Ana" }]));
    expect(element(fixture).querySelectorAll("li")).toHaveLength(1);
  });

  it("muestra un mensaje cuando no hay pedidos", async () => {
    const fixture = await render(() => of([]));
    expect(element(fixture).textContent).toContain("No hay pedidos.");
  });

  it("muestra el estado de carga", async () => {
    const fixture = await render(() => NEVER);
    expect(element(fixture).textContent).toContain("Cargando pedidos");
  });

  it("muestra el error y permite reintentar", async () => {
    let calls = 0;
    const fixture = await render(() => {
      calls++;
      return calls === 1
        ? throwError(() => new Error("boom"))
        : of([{ id: "1", customer: "Ana" }]);
    });
    expect(element(fixture).querySelector('[role="alert"]')).not.toBeNull();

    await click(fixture, "Reintentar");
    expect(element(fixture).textContent).toContain("Ana");
  });
});
```

- Un helper `render()` por archivo de test, que configura `TestBed` con los dobles de servicios que necesite.
- Esperar el render con `await fixture.whenStable()`, también después de cada interacción.
- En las pages, reemplazar los servicios con dobles vía `providers`. Los servicios se prueban por separado.
- Las pages que cargan datos prueban los cuatro estados: datos, vacío, cargando (`NEVER`) y error con reintento.
- Interactuar como un usuario: buscar botones por su texto, no por posición.
- Los inputs se fijan en los tests con `fixture.componentRef.setInput("nombre", valor)`.

## Lo que verifica el lint

Estas reglas las aplica `pnpm verify`. Si el lint falla por una de ellas, se corrige el código; nunca se desactiva la regla (los comentarios `eslint-disable` no tienen efecto en este repo).

- Signals de estado, `@Injectable`, `toSignal`, `rxResource`, `httpResource` y `CommonModule`: imports prohibidos.
- `HttpClient`: solo en `services/` y `core/`.
- `.subscribe()`: prohibido en `pages/`, `components/` y el shell.
- Plantillas y estilos inline: prohibidos.
- Fronteras: una feature no importa de otra; `shared/` y `core/` no importan de `features/`.
