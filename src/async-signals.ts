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

/**
 * Waits for the signal to completes its task and returns its value
 *
 * Note that it will only return the first "completed" value generated by the signal,
 * and will unsubscribe after that
 */
export function toPromise<T, E = unknown>(
  asyncSignal: AsyncSignal<T, E>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const w = new Signal.subtle.Watcher(() => {
      setTimeout(() => {
        const result = asyncSignal.get();
        if (result.status === "pending") return;
        else if (result.status === "completed") {
          resolve(result.value);
          w.unwatch(asyncSignal);
        } else if (result.status === "error") {
          reject(result.error);
          w.unwatch(asyncSignal);
        }
      });
    });
    w.watch(asyncSignal);
  });
}

// export function value<T>(signal: AsyncSignal<T>): T | undefined {
//   const result = signal.get();
//   if (result.status === "completed") return result.value;
//   return undefined;
// }

/**
 * Converts a task that returns a promise into an `AsyncSignal`
 *
 * Useful for tasks whose result doesn't need to be updated after they resolve
 */
export function fromPromise<T>(task: () => Promise<T>): AsyncSignal<T> {
  const signal = new AsyncState<T>(
    { status: "pending" },
    {
      [Signal.subtle.watched]: () => {
        task()
          .then((value) => {
            signal.set({
              status: "completed",
              value,
            });
          })
          .catch((error) => {
            signal.set({
              status: "error",
              error,
            });
          });
      },
      [Signal.subtle.unwatched]: () => {
        // We revert back to pending state so that the next time this signal is queried,
        // the backend request is sent again
        signal.set({
          status: "pending",
        });
      },
    },
  );
  return signal;
}
