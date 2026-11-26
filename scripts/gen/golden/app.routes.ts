import type { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "orders",
    loadChildren: () =>
      import("./features/orders/orders.routes").then((m) => m.ORDERS_ROUTES),
  },
  // @gen:routes
];
