import { Component, input } from "@angular/core";

@Component({
  selector: "app-order-row",
  templateUrl: "./order-row.html",
})
export class OrderRow {
  readonly label = input.required<string>();
}
