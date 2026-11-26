import { AsyncPipe } from "@angular/common";
import { Component, inject } from "@angular/core";
import { BehaviorSubject, switchMap } from "rxjs";
import { toViewState } from "../../../../shared/state/view-state";
import { OrdersApi } from "../../services/orders-api";

@Component({
  imports: [AsyncPipe],
  selector: "app-orders-list",
  templateUrl: "./orders-list.html",
})
export class OrdersList {
  private readonly api = inject(OrdersApi);
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  protected readonly state$ = this.reload$.pipe(
    switchMap(() => this.api.getAll().pipe(toViewState())),
  );

  protected reload(): void {
    this.reload$.next();
  }
}
