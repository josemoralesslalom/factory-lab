#!/bin/bash
# Prueba que cada gate de la app falle cuando debe.
# Rompe una cosa a la vez, comprueba el error esperado y restaura.
# Requiere el árbol de trabajo limpio: todo lo que hace se deshace con git.

if [ -n "$(git status --porcelain)" ]; then
  echo "test-gates: el árbol de trabajo tiene cambios. Haz commit antes de correr esta prueba." >&2
  exit 1
fi

W=apps/web/src/app
LOG=$(mktemp)
OK=0
FALLAS=0

restaurar() {
  git checkout -q -- apps/ scripts/gen/ 2>/dev/null
  git clean -fdq apps/web/src 2>/dev/null
}
trap restaurar EXIT

# caso <nombre> <comando> <patrón esperado en la salida>
caso() {
  local nombre="$1" cmd="$2" patron="$3"
  if bash -c "$cmd" > "$LOG" 2>&1; then
    echo "FALLA  $nombre: el gate pasó y debía fallar"
    FALLAS=$((FALLAS + 1))
  elif grep -qE "$patron" "$LOG"; then
    echo "OK     $nombre"
    OK=$((OK + 1))
  else
    echo "FALLA  $nombre: falló, pero sin el error esperado ($patron)"
    FALLAS=$((FALLAS + 1))
  fi
  restaurar
}

printf 'export const x   =   1\n' > $W/zz-tmp.ts
caso "formato en la app" "pnpm format:check" "Code style issues"

printf 'export const n: number = "texto";\n' > $W/zz-tmp.ts
caso "tipos en la app" "pnpm typecheck" "TS2322"

printf 'const a: string[] = [];\nexport const s: string = a[0];\n' > $W/zz-tmp.ts
caso "estrictez heredada de tsconfig.base" "pnpm typecheck" "string \\| undefined"

echo '<p>{{ noExiste }}</p>' >> $W/app.html
caso "tipos en plantillas" "pnpm typecheck" "TS2339"

printf 'export async function f(): Promise<void> {\n  Promise.resolve();\n}\n' > $W/zz-tmp.ts
caso "lint TypeScript en la app" "pnpm lint" "no-floating-promises"

echo '<img src="logo.png" />' >> $W/app.html
caso "accesibilidad en plantillas" "pnpm lint" "alt-text"

printf 'export class Vacia {}\n' > $W/zz-tmp.ts
caso "clase vacía sin decorador" "pnpm lint" "no-extraneous-class"

printf 'it("falla intencionalmente", () => {\n  expect(1).toBe(2);\n});\n' > $W/zz-tmp.spec.ts
caso "tests de la app" "pnpm --filter web test:ci" "failed"

mkdir -p $W/features/zz/services
printf 'import { Injectable } from "@angular/core";\n\n@Injectable({ providedIn: "root" })\nexport class ZzService {\n  probado(): number {\n    return 1;\n  }\n  sinProbar(): number {\n    return 2;\n  }\n}\n' > $W/features/zz/services/zz.service.ts
printf 'import { TestBed } from "@angular/core/testing";\nimport { ZzService } from "./zz.service";\n\ndescribe("ZzService", () => {\n  it("probado", () => {\n    expect(TestBed.inject(ZzService).probado()).toBe(1);\n  });\n});\n' > $W/features/zz/services/zz.service.spec.ts
caso "cobertura de servicio incompleta" "pnpm --filter web test:ci" "services/\\*\\*\" threshold \\(100%\\)"

mkdir -p $W/features/zz/services
printf 'import { Injectable } from "@angular/core";\n\n@Injectable({ providedIn: "root" })\nexport class ZzService {\n  valor(): number {\n    return 1;\n  }\n}\n' > $W/features/zz/services/zz.service.ts
caso "servicio sin ningún test" "pnpm --filter web test:ci" "services/\\*\\*\" threshold \\(100%\\)"

mkdir -p $W/features/zz/pages/zz-list
printf 'import { Component } from "@angular/core";\n\n@Component({\n  selector: "app-zz-list",\n  template: "<p>zz</p>",\n})\nexport class ZzListComponent {\n  valor(): number {\n    return 1;\n  }\n}\n' > $W/features/zz/pages/zz-list/zz-list.component.ts
caso "page sin ningún test" "pnpm --filter web test:ci" "components\\}/\\*\\*\" threshold \\(80%\\)"

node -e 'let s="";for(let i=0;i<160;i++)s+=`.c-${i} {\n  color: red;\n  margin: ${i}px;\n}\n`;require("fs").writeFileSync("apps/web/src/app/app.scss",s)'
caso "budget de estilos por componente" "pnpm build" "Budget 4.00 kB was not met"

# --- Estándar del frontend (paso 2.3) ---
F=$W/features/zz-a

# permitido <nombre> <comando>: el código válido debe pasar el gate
permitido() {
  local nombre="$1" cmd="$2"
  if bash -c "$cmd" > "$LOG" 2>&1; then
    echo "OK     $nombre"
    OK=$((OK + 1))
  else
    echo "FALLA  $nombre: el gate rechazó código válido"
    FALLAS=$((FALLAS + 1))
  fi
  restaurar
}

mkdir -p $F/pages/p
printf 'import { signal } from "@angular/core";\n\nexport const contador = signal(0);\n' > $F/pages/p/estado.ts
caso "estado con signals" "pnpm exec eslint --max-warnings 0 $F/pages/p/estado.ts" "'signal' import"

mkdir -p $F/services
printf 'import { Injectable } from "@angular/core";\n\n@Injectable({ providedIn: "root" })\nexport class ConInjectable {}\n' > $F/services/con-injectable.ts
caso "@Injectable en lugar de @Service" "pnpm exec eslint --max-warnings 0 $F/services/con-injectable.ts" "'Injectable' import"

mkdir -p $F/pages/p
printf 'import { of } from "rxjs";\n\nexport function cargar(): void {\n  of(1).subscribe();\n}\n' > $F/pages/p/con-subscribe.ts
caso ".subscribe() en una page" "pnpm exec eslint --max-warnings 0 $F/pages/p/con-subscribe.ts" "No uses .subscribe"

mkdir -p $F/pages/p
printf 'import { HttpClient } from "@angular/common/http";\n\nexport const cliente = HttpClient;\n' > $F/pages/p/con-http.ts
caso "HttpClient fuera de services" "pnpm exec eslint --max-warnings 0 $F/pages/p/con-http.ts" "'HttpClient' import"

mkdir -p $F/pages/p $W/features/zz-b/services
printf 'export const pago = 1;\n' > $W/features/zz-b/services/pago.ts
printf 'import { pago } from "../../../zz-b/services/pago";\n\nexport const total = pago;\n' > $F/pages/p/entre-features.ts
caso "importación entre features" "pnpm exec eslint --max-warnings 0 $F/pages/p/entre-features.ts" "boundaries/dependencies"

mkdir -p $W/shared/zz
mkdir -p $F/models
printf 'export const modelo = 1;\n' > $F/models/modelo.ts
printf 'import { modelo } from "../../features/zz-a/models/modelo";\n\nexport const y = modelo;\n' > $W/shared/zz/desde-shared.ts
caso "shared importa de una feature" "pnpm exec eslint --max-warnings 0 $W/shared/zz/desde-shared.ts" "boundaries/dependencies"

mkdir -p $F/pages/p
printf 'import { Component } from "@angular/core";\n\n@Component({ selector: "app-inline", template: "<p>x</p>" })\nexport class Inline {}\n' > $F/pages/p/inline.ts
caso "plantilla inline" "pnpm exec eslint --max-warnings 0 $F/pages/p/inline.ts" "component-max-inline-declarations"

mkdir -p $F/pages/p
printf '<p *ngIf="true">x</p>\n' > $F/pages/p/viejo.html
caso "directiva estructural vieja" "pnpm exec eslint --max-warnings 0 $F/pages/p/viejo.html" "prefer-control-flow"

mkdir -p $W/shared/zz
printf '// eslint-disable-next-line @typescript-eslint/no-explicit-any\nexport const valor: any = 1;\n' > $W/shared/zz/desactivada.ts
caso "comentario eslint-disable" "pnpm exec eslint --max-warnings 0 $W/shared/zz/desactivada.ts" "noInlineConfig"

mkdir -p $F/services
printf 'import { HttpClient } from "@angular/common/http";\nimport { Service, inject } from "@angular/core";\n\n@Service()\nexport class ConHttp {\n  protected readonly http = inject(HttpClient);\n}\n' > $F/services/con-http.ts
permitido "HttpClient en un servicio" "pnpm exec eslint --max-warnings 0 $F/services/con-http.ts"

mkdir -p $F/pages/p $W/shared/zz
printf 'export const util = 1;\n' > $W/shared/zz/util.ts
printf 'import { util } from "../../../../shared/zz/util";\n\nexport const z = util;\n' > $F/pages/p/usa-shared.ts
permitido "una feature importa de shared" "pnpm exec eslint --max-warnings 0 $F/pages/p/usa-shared.ts"

mkdir -p $F/components/c
printf 'import { AsyncPipe } from "@angular/common";\nimport { Component, input, output } from "@angular/core";\nimport { toObservable } from "@angular/core/rxjs-interop";\nimport { map } from "rxjs";\n\n@Component({ imports: [AsyncPipe], selector: "app-c", templateUrl: "./c.html" })\nexport class C {\n  readonly id = input.required<string>();\n  readonly closed = output();\n  protected readonly label$ = toObservable(this.id).pipe(map((id) => `#${id}`));\n}\n' > $F/components/c/c.ts
printf '<p>{{ label$ | async }}</p>\n' > $F/components/c/c.html
permitido "input(), output() y toObservable() en un componente" "pnpm exec eslint --max-warnings 0 $F/components/c/c.ts $F/components/c/c.html"

sed -i.bak 's/No hay elementos/No hay registros/' scripts/gen/templates.mjs && rm -f scripts/gen/templates.mjs.bak
caso "plantilla del generador cambia sin actualizar golden" "pnpm test:gen" "el contenido de .* cambió"

permitido "una feature generada pasa verify" "pnpm -s gen feature zz-gen && pnpm -s gen model zz-gen item && pnpm -s gen service zz-gen items-api --model item && pnpm -s gen page zz-gen items-list --service items-api && pnpm -s gen component zz-gen item-row && pnpm verify"

rm -f "$LOG"
echo
echo "$OK correctos, $FALLAS con problemas"
[ "$FALLAS" -eq 0 ]
