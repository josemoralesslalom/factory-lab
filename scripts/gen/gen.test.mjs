// Golden tests del generador: genera una feature completa en una carpeta temporal
// y compara cada archivo contra scripts/gen/golden/. Para aceptar un cambio intencional
// en las plantillas: UPDATE_GOLDEN=1 node --test scripts/gen/
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { run } from "./gen.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GOLDEN = join(HERE, "golden");
const APP = "apps/web/src/app";

function emptyApp() {
  const root = mkdtempSync(join(tmpdir(), "gen-"));
  mkdirSync(join(root, APP), { recursive: true });
  writeFileSync(
    join(root, APP, "app.routes.ts"),
    'import type { Routes } from "@angular/router";\n\nexport const routes: Routes = [\n  // @gen:routes\n];\n',
  );
  return root;
}

function files(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => relative(dir, join(d.parentPath, d.name)))
    .sort();
}

test("genera una feature completa idéntica a los archivos golden", async () => {
  const root = emptyApp();
  try {
    await run(["feature", "orders"], root);
    await run(["model", "orders", "order"], root);
    await run(["service", "orders", "orders-api", "--model", "order"], root);
    await run(
      [
        "page",
        "orders",
        "orders-list",
        "--service",
        "orders-api",
        "--path",
        "",
      ],
      root,
    );
    await run(
      ["page", "orders", "order-detail", "--service", "orders-api"],
      root,
    );
    await run(["component", "orders", "order-row"], root);

    const generated = join(root, APP);
    if (process.env.UPDATE_GOLDEN) {
      rmSync(GOLDEN, { recursive: true, force: true });
      cpSync(generated, GOLDEN, { recursive: true });
    }
    assert.deepEqual(
      files(generated),
      files(GOLDEN),
      "la lista de archivos generados cambió",
    );
    for (const file of files(GOLDEN)) {
      assert.equal(
        readFileSync(join(generated, file), "utf8"),
        readFileSync(join(GOLDEN, file), "utf8"),
        `el contenido de ${file} cambió`,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rechaza nombres que no están en kebab-case", async () => {
  const root = emptyApp();
  try {
    await assert.rejects(run(["feature", "Orders"], root), /kebab-case/);
    await assert.rejects(run(["feature", "order_list"], root), /kebab-case/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("nunca sobrescribe y no deja cambios a medias", async () => {
  const root = emptyApp();
  try {
    await run(["feature", "orders"], root);
    await run(["model", "orders", "order"], root);
    await run(["service", "orders", "orders-api", "--model", "order"], root);
    await run(
      ["page", "orders", "orders-list", "--service", "orders-api"],
      root,
    );
    const before = readFileSync(
      join(root, APP, "features/orders/orders.routes.ts"),
      "utf8",
    );

    await assert.rejects(run(["feature", "orders"], root), /Ya existe/);
    await assert.rejects(
      run(["page", "orders", "orders-list", "--service", "orders-api"], root),
      /Ya existe/,
    );

    // Ruta registrada pero carpeta borrada: falla antes de escribir, no deja archivos sueltos.
    const pageDir = join(root, APP, "features/orders/pages/orders-list");
    rmSync(pageDir, { recursive: true });
    await assert.rejects(
      run(["page", "orders", "orders-list", "--service", "orders-api"], root),
      /ya está registrada/,
    );
    assert.equal(existsSync(pageDir), false);
    assert.equal(
      readFileSync(join(root, APP, "features/orders/orders.routes.ts"), "utf8"),
      before,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("exige lo que cada pieza necesita", async () => {
  const root = emptyApp();
  try {
    await assert.rejects(
      run(["model", "orders", "order"], root),
      /pnpm gen feature orders/,
    );
    await run(["feature", "orders"], root);
    await assert.rejects(
      run(["service", "orders", "orders-api", "--model", "order"], root),
      /pnpm gen model orders order/,
    );
    await assert.rejects(
      run(["page", "orders", "orders-list", "--service", "orders-api"], root),
      /pnpm gen service/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
