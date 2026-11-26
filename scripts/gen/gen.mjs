#!/usr/bin/env node
// Generador de piezas del frontend según el estándar (skill frontend-architecture).
//
//   pnpm gen feature <feature>
//   pnpm gen model <feature> <model>
//   pnpm gen service <feature> <service> --model <model>
//   pnpm gen page <feature> <page> --service <service> [--path <ruta>]
//   pnpm gen component <feature> <component>
//
// Nunca sobrescribe y valida todo antes de escribir, para no dejar cambios a medias.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";
import { assertKebab } from "./names.mjs";
import * as t from "./templates.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const APP_REL = "apps/web/src/app";

function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      options[arg.slice(2)] = argv[i + 1] ?? "";
      i++;
    } else {
      positional.push(arg);
    }
  }
  return { positional, options };
}

// El formato se resuelve con la configuración de Prettier del repo, aunque se genere en otra carpeta.
async function format(root, absPath, content) {
  const config = await prettier.resolveConfig(
    join(REPO_ROOT, relative(root, absPath)),
  );
  return prettier.format(content, { ...config, filepath: absPath });
}

function createGenerator(root) {
  const app = join(root, APP_REL);
  const changes = [];
  const featureDir = (feature) => join(app, "features", feature);

  function fail(message) {
    throw new Error(message);
  }

  function requireFeature(feature) {
    if (!existsSync(featureDir(feature))) {
      fail(
        `La feature "${feature}" no existe. Créala con: pnpm gen feature ${feature}`,
      );
    }
  }

  function requireAbsent(absPath) {
    if (existsSync(absPath)) {
      fail(
        `Ya existe ${relative(root, absPath)}. El generador nunca sobrescribe.`,
      );
    }
  }

  function assertRoutable(routesFile, duplicateNeedle) {
    const source = readFileSync(routesFile, "utf8");
    if (!source.includes(t.ROUTES_MARKER)) {
      fail(
        `${relative(root, routesFile)} no tiene el marcador "${t.ROUTES_MARKER}" dentro del arreglo de rutas.`,
      );
    }
    if (source.includes(duplicateNeedle)) {
      fail(`La ruta ya está registrada en ${relative(root, routesFile)}.`);
    }
  }

  async function create(absPath, content) {
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, await format(root, absPath, content));
    changes.push(`creado     ${relative(root, absPath)}`);
  }

  async function addRoute(routesFile, entry) {
    const source = readFileSync(routesFile, "utf8");
    const updated = source.replace(
      t.ROUTES_MARKER,
      `${entry}\n  ${t.ROUTES_MARKER}`,
    );
    writeFileSync(routesFile, await format(root, routesFile, updated));
    changes.push(`modificado ${relative(root, routesFile)}`);
  }

  return {
    changes,

    async feature(feature) {
      assertKebab(feature, "El nombre de la feature");
      const appRoutes = join(app, "app.routes.ts");
      requireAbsent(featureDir(feature));
      assertRoutable(appRoutes, `./features/${feature}/`);

      await create(
        join(featureDir(feature), `${feature}.routes.ts`),
        t.featureRoutes(feature),
      );
      await addRoute(appRoutes, t.featureRouteEntry(feature));
    },

    async model(feature, name) {
      assertKebab(name, "El nombre del modelo");
      requireFeature(feature);
      const file = join(featureDir(feature), "models", `${name}.ts`);
      requireAbsent(file);

      await create(file, t.model(name));
    },

    async service(feature, name, modelName) {
      assertKebab(name, "El nombre del servicio");
      assertKebab(modelName, "El modelo (--model)");
      requireFeature(feature);
      if (!existsSync(join(featureDir(feature), "models", `${modelName}.ts`))) {
        fail(
          `El modelo "${modelName}" no existe. Créalo con: pnpm gen model ${feature} ${modelName}`,
        );
      }
      const dir = join(featureDir(feature), "services");
      requireAbsent(join(dir, `${name}.ts`));

      await create(join(dir, `${name}.ts`), t.service(name, modelName));
      await create(join(dir, `${name}.spec.ts`), t.serviceSpec(name));
    },

    async page(feature, name, serviceName, path) {
      assertKebab(name, "El nombre de la page");
      assertKebab(serviceName, "El servicio (--service)");
      requireFeature(feature);
      if (
        !existsSync(join(featureDir(feature), "services", `${serviceName}.ts`))
      ) {
        fail(
          `El servicio "${serviceName}" no existe. Créalo con: pnpm gen service ${feature} ${serviceName} --model <modelo>`,
        );
      }
      const dir = join(featureDir(feature), "pages", name);
      const routes = join(featureDir(feature), `${feature}.routes.ts`);
      requireAbsent(dir);
      assertRoutable(routes, `./pages/${name}/`);

      await create(join(dir, `${name}.ts`), t.page(name, serviceName));
      await create(join(dir, `${name}.html`), t.pageHtml(name));
      await create(join(dir, `${name}.spec.ts`), t.pageSpec(name, serviceName));
      await addRoute(routes, t.pageRouteEntry(name, path ?? name));
    },

    async component(feature, name) {
      assertKebab(name, "El nombre del componente");
      requireFeature(feature);
      const dir = join(featureDir(feature), "components", name);
      requireAbsent(dir);

      await create(join(dir, `${name}.ts`), t.component(name));
      await create(join(dir, `${name}.html`), t.componentHtml());
      await create(join(dir, `${name}.spec.ts`), t.componentSpec(name));
    },
  };
}

export async function run(argv, root = process.cwd()) {
  const { positional, options } = parseArgs(argv);
  const [kind, feature, name] = positional;
  const gen = createGenerator(root);

  if (kind !== "feature") assertKebab(feature, "El nombre de la feature");

  switch (kind) {
    case "feature":
      await gen.feature(feature);
      break;
    case "model":
      await gen.model(feature, name);
      break;
    case "service":
      await gen.service(feature, name, options.model);
      break;
    case "page":
      await gen.page(feature, name, options.service, options.path);
      break;
    case "component":
      await gen.component(feature, name);
      break;
    default:
      throw new Error(
        `Tipo desconocido: "${kind ?? ""}". Usa: feature, model, service, page o component.`,
      );
  }
  return gen.changes;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    console.log((await run(process.argv.slice(2))).join("\n"));
  } catch (error) {
    console.error(
      `gen: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}
