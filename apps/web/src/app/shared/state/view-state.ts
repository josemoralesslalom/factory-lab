import { catchError, map, of, startWith, type OperatorFunction } from "rxjs";

export type ViewState<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly data: T }
  | { readonly status: "error"; readonly error: unknown };

export function toViewState<T>(): OperatorFunction<T, ViewState<T>> {
  return (source) =>
    source.pipe(
      map((data): ViewState<T> => ({ status: "ready", data })),
      startWith<ViewState<T>>({ status: "loading" }),
      catchError((error: unknown) =>
        of<ViewState<T>>({ status: "error", error }),
      ),
    );
}
