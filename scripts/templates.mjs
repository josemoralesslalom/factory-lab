// Plantillas del generador. Cada función devuelve el contenido de un archivo.
// Prettier formatea el resultado al escribirlo, así que aquí importa el contenido, no el formato.

import { constant, pascal, title } from "./names.mjs";

export const ROUTES_MARKER = "// @gen:routes";

export function featureRoutes(feature) {
  return `import type { Routes } from "@angular/router";

export const ${constant(feature)}_ROUTES: Routes = [
  ${ROUTES_MARKER}
];
`;
}

export function featureRouteEntry(feature) {
  return `{
    path: "${feature}",
    loadChildren: () => import("./features/${feature}/${feature}.routes").then((m) => m.${constant(feature)}_ROUTES),
  },`;
}

export function pageRouteEntry(page, path) {
  return `{
    path: "${path}",
    loadComponent: () => import("./pages/${page}/${page}").then((m) => m.${pascal(page)}),
  },`;
}

export function model(name) {
  return `export interface ${pascal(name)} {
  readonly id: string;
}
`;
}

export function service(name, modelName) {
  return `import { Service } from "@angular/core";
import { of, type Observable } from "rxjs";
import type { ${pascal(modelName)} } from "../models/${modelName}";

@Service()
export class ${pascal(name)} {
  getAll(): Observable<readonly ${pascal(modelName)}[]> {
    return of([]);
  }
}
`;
}

export function serviceSpec(name) {
  return `import { TestBed } from "@angular/core/testing";
import { firstValueFrom } from "rxjs";
import { ${pascal(name)} } from "./${name}";

describe("${pascal(name)}", () => {
  it("getAll devuelve una lista", async () => {
    const items = await firstValueFrom(TestBed.inject(${pascal(name)}).getAll());
    expect(items).toEqual([]);
  });
});
`;
}

export function page(name, serviceName) {
  return `import { AsyncPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { BehaviorSubject, switchMap } from "rxjs";
import { toViewState } from "../../../../shared/state/view-state";
import { ${pascal(serviceName)} } from "../../services/${serviceName}";

@Component({
  imports: [AsyncPipe],
  selector: "app-${name}",
  templateUrl: "./${name}.html",
})
export class ${pascal(name)} {
  private readonly api = inject(${pascal(serviceName)});
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  protected readonly state$ = this.reload$.pipe(switchMap(() => this.api.getAll().pipe(toViewState())));

  protected reload(): void {
    this.reload$.next();
  }
}
`;
}

export function pageHtml(name) {
  return `<h1>${title(name)}</h1>

@if (state$ | async; as state) {
  @switch (state.status) {
    @case ("loading") {
      <p>Cargando…</p>
    }
    @case ("error") {
      <p role="alert">No se pudo cargar la información.</p>
      <button type="button" (click)="reload()">Reintentar</button>
    }
    @case ("ready") {
      <ul>
        @for (item of state.data; track item.id) {
          <li>{{ item.id }}</li>
        } @empty {
          <li>No hay elementos.</li>
        }
      </ul>
    }
  }
}
`;
}

export function pageSpec(name, serviceName) {
  const Page = pascal(name);
  const Api = pascal(serviceName);
  return `import { TestBed, type ComponentFixture } from "@angular/core/testing";
import { NEVER, of, throwError } from "rxjs";
import { ${Api} } from "../../services/${serviceName}";
import { ${Page} } from "./${name}";

type GetAll = ${Api}["getAll"];

async function render(getAll: GetAll): Promise<ComponentFixture<${Page}>> {
  TestBed.configureTestingModule({
    imports: [${Page}],
    providers: [{ provide: ${Api}, useValue: { getAll } }],
  });
  const fixture = TestBed.createComponent(${Page});
  await fixture.whenStable();
  return fixture;
}

function element(fixture: ComponentFixture<${Page}>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

async function click(fixture: ComponentFixture<${Page}>, label: string): Promise<void> {
  const button = Array.from(element(fixture).querySelectorAll("button")).find(
    (b) => b.textContent.trim() === label,
  );
  button?.click();
  await fixture.whenStable();
}

describe("${Page}", () => {
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
      return calls === 1 ? throwError(() => new Error("boom")) : of([{ id: "1" }]);
    });
    expect(element(fixture).querySelector('[role="alert"]')).not.toBeNull();

    await click(fixture, "Reintentar");
    expect(element(fixture).querySelector('[role="alert"]')).toBeNull();
    expect(element(fixture).querySelectorAll("li")).toHaveLength(1);
  });
});
`;
}

export function component(name) {
  return `import { Component, input } from "@angular/core";

@Component({
  selector: "app-${name}",
  templateUrl: "./${name}.html",
})
export class ${pascal(name)} {
  readonly label = input.required<string>();
}
`;
}

export function componentHtml() {
  return `<span>{{ label() }}</span>
`;
}

export function componentSpec(name) {
  const C = pascal(name);
  return `import { TestBed } from "@angular/core/testing";
import { ${C} } from "./${name}";

describe("${C}", () => {
  it("muestra el label que recibe", async () => {
    const fixture = TestBed.createComponent(${C});
    fixture.componentRef.setInput("label", "Hola");
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Hola");
  });
});
`;
}
