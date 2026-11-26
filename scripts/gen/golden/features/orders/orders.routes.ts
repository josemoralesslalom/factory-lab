import type { Routes } from "@angular/router";

export const ORDERS_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/orders-list/orders-list").then((m) => m.OrdersList),
  },
  {
    path: "order-detail",
    loadComponent: () =>
      import("./pages/order-detail/order-detail").then((m) => m.OrderDetail),
  },
  // @gen:routes
];
