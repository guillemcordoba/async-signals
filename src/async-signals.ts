import { Signal } from "signal-polyfill";

export type AsyncResult<T, E = unknown> =
  | {
      status: "pending";
    }
  | {
      status: "completed";
      value: T;
    }
  | {
      status: "error";
      error: E;
    };

export class AsyncState<T, E = unknown> extends Signal.State<
  AsyncResult<T, E>
> {}
export class AsyncComputed<T, E = unknown> extends Signal.Computed<
  AsyncResult<T, E>
> {}

export type AsyncSignal<T, E = unknown> =
  | AsyncState<T, E>
  | AsyncComputed<T, E>;

// export function value<T>(signal: AsyncSignal<T>): T | undefined {
//   const result = signal.get();
//   if (result.status === "completed") return result.value;
//   return undefined;
// }
