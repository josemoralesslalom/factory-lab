import { defineConfig, includeIgnoreFile } from "eslint/config";
import { fileURLToPath } from "node:url";
import angular from "angular-eslint";
import tseslint from "typescript-eslint";

const gitignore = fileURLToPath(new URL(".gitignore", import.meta.url));

const APP = "apps/web/src/app";

// Prohibido en toda la app
const appRestrictedImports = [
  {
    name: "@angular/core",
    importNames: ["signal", "computed", "effect", "linkedSignal", "resource"],
    message:
      "El estado de la app se maneja con RxJS (BehaviorSubject y async pipe). Los signals solo se usan donde el framework los entrega: input(), model() y queries.",
  },
  {
    name: "@angular/core",
    importNames: ["Injectable"],
    message: "Usa @Service() de @angular/core.",
  },
  {
    name: "@angular/core/rxjs-interop",
    importNames: ["toSignal", "rxResource"],
    message:
      "No conviertas streams en signals: expón el Observable y usa el async pipe. Para llevar un input() a RxJS usa toObservable().",
  },
  {
    name: "@angular/common",
    importNames: ["CommonModule"],
    message: "Importa solo los pipes y directivas que use la plantilla.",
  },
  {
    name: "@angular/common/http",
    importNames: ["httpResource"],
    message:
      "Carga datos con un servicio que exponga un Observable y toViewState().",
  },
];

// Prohibido fuera de services/ y core/
const httpOutsideServices = {
  name: "@angular/common/http",
  importNames: ["HttpClient"],
  message: "Solo los servicios (services/) y core/ hacen peticiones HTTP.",
};

export default defineConfig([
  includeIgnoreFile(gitignore),
  { ignores: ["eslint.config.mjs"] },

  // Todo el TypeScript del repo
  {
    files: ["**/*.ts", "**/*.mts"],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-restricted-imports": [
        "error",
        { paths: [...appRestrictedImports, httpOutsideServices] },
      ],
    },
  },

  {
    files: [`${APP}/**/services/**/*.ts`, `${APP}/core/**/*.ts`],
    rules: {
      "no-restricted-imports": ["error", { paths: appRestrictedImports }],
    },
  },
  // Componentes y pages: nunca .subscribe()
  {
    files: [`${APP}/**/{pages,components}/**/*.ts`, `${APP}/app.ts`],
    ignores: ["**/*.spec.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='subscribe']",
          message:
            "No uses .subscribe() en componentes: expón un Observable y usa el async pipe.",
        },
      ],
    },
  },
  // Angular: TypeScript
  {
    files: ["apps/web/**/*.ts"],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-extraneous-class": [
        "error",
        { allowWithDecorator: true },
      ],
      "@angular-eslint/component-selector": [
        "error",
        { type: "element", prefix: "app", style: "kebab-case" },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        { type: "attribute", prefix: "app", style: "camelCase" },
      ],
      "@angular-eslint/component-max-inline-declarations": [
        "error",
        { template: 0, styles: 0 },
      ],
    },
  },

  // Angular: plantillas
  {
    files: ["apps/web/**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
  },
]);
