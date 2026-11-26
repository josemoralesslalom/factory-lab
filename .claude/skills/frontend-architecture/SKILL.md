---
name: frontend-architecture
description: Use this skill when the user asks about frontend project structure, architecture guidelines, how to organize files, where to place components, services or pages, or how to set up lazy loading in the Angular frontend project.
---

# Frontend Architecture Guidelines

## Folder Structure

The project follows a **layer-based** structure. All source code lives under `frontend/src/app/`:

```
frontend/
└── src/
    └── app/
        ├── components/        # Reusable, shared UI components
        ├── pages/             # Route-level components (one per route)
        ├── services/          # Business logic and API communication
        └── app.routes.ts      # Lazy loaded route definitions
```

## Layer Responsibilities

### components/

- Reusable UI building blocks used across multiple pages
- Should be generic and not depend on specific business logic
- Examples: `button`, `modal`, `navbar`, `card`

```
components/
├── navbar/
│   ├── navbar.component.ts
│   ├── navbar.component.html
│   └── navbar.component.scss
└── card/
    ├── card.component.ts
    ├── card.component.html
    └── card.component.scss
```

### pages/

- One folder per application route/view
- Responsible for layout and orchestrating components
- Each page is lazy loaded via the router

```
pages/
├── home/
│   ├── home.component.ts
│   ├── home.component.html
│   └── home.component.scss
└── dashboard/
    ├── dashboard.component.ts
    ├── dashboard.component.html
    └── dashboard.component.scss
```

### services/

- Handle all business logic, HTTP calls, and shared state
- Should be injectable at the root level (`providedIn: 'root'`)
- Examples: `auth.service.ts`, `user.service.ts`, `api.service.ts`

```
services/
├── auth.service.ts
└── user.service.ts
```

## Lazy Loading

All pages are lazy loaded through the Angular router to keep the initial bundle small.

**app.routes.ts**

```typescript
import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/home/home.component").then((m) => m.HomeComponent),
  },
  {
    path: "dashboard",
    loadComponent: () =>
      import("./pages/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
];
```

## Reactive Programming

The frontend is **reactive-first**. Data flows through RxJS Observables and is rendered with the Angular `async` pipe.

- **No manual subscriptions in components.** Never call `.subscribe()` inside a component. Bind the Observable directly in the template with the `async` pipe — the framework handles subscribe/unsubscribe for you.
- **Services expose Observables.** Data services return `Observable<T>` (e.g. `getSummary(): Observable<ScorecardSummary>`). Components inject the service and bind the stream, not the resolved value.
- **Derive state with operators, not imperative code.** Compute loading / error / empty states with RxJS operators (`map`, `startWith`, `catchError`, `combineLatest`) rather than subscribing and pushing into fields.

```typescript
// component
protected readonly summary$ = inject(DATA_SERVICE).getSummary().pipe(
  catchError(() => of(null)),
);
```

```html
<!-- template -->
@if (summary$ | async; as summary) {
<span>{{ summary.monthlyCostUsd }}</span>
}
```

## Conventions

- Every new **page** gets its own folder under `pages/` and a lazy loaded route entry in `app.routes.ts`
- **Render Observables with the `async` pipe — never `.subscribe()` in a component**
- Every new **reusable UI element** goes under `components/`
- Every new **API call or business logic** goes under `services/`
- Never place business logic inside page or component files — delegate to services
- Use Angular CLI to generate files to ensure consistency:
  ```bash
  ng generate component pages/my-page
  ng generate component components/my-component
  ng generate service services/my-service
  ```
