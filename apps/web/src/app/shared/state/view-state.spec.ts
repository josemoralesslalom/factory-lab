import { firstValueFrom, of, throwError, toArray } from "rxjs";
import { toViewState } from "./view-state";

describe("toViewState", () => {
  it("emite loading y luego ready", async () => {
    const states = await firstValueFrom(of([1]).pipe(toViewState(), toArray()));
    expect(states).toEqual([
      { status: "loading" },
      { status: "ready", data: [1] },
    ]);
  });

  it("emite loading y luego error", async () => {
    const boom = new Error("boom");
    const states = await firstValueFrom(
      throwError(() => boom).pipe(toViewState(), toArray()),
    );
    expect(states).toEqual([
      { status: "loading" },
      { status: "error", error: boom },
    ]);
  });
});
