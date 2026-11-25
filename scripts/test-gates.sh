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
  git checkout -q -- apps/ 2>/dev/null
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

rm -f "$LOG"
echo
echo "$OK correctos, $FALLAS con problemas"
[ "$FALLAS" -eq 0 ]
