import { Service } from "@angular/core";
import { of, type Observable } from "rxjs";
import type { Order } from "../models/order";

@Service()
export class OrdersApi {
  getAll(): Observable<readonly Order[]> {
    return of([]);
  }
}
