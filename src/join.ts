import { AsyncComputed, AsyncResult, AsyncSignal } from "./async-signals.js";

/**
 * Defines the behavior of the joining of the `AsyncSignals`
 */
export interface JoinAsyncOptions {
  /**
   * 'bubbles': the first error encountered in the collection of signals is going to be automatically returned
   * 'filter_out': all errors encountered in the collection of signals are going to be filtered out, returning only those signals that completed successfully
   */
  errors?: "filter_out" | "bubble";
  /**
   * 'bubbles': the first pending status encountered in the collection of signals is going to be automatically returned
   * 'filter_out': all pending status encountered in the collection of signals are going to be filtered out, returning only those signals that completed successfully
   */
  pendings?: "filter_out" | "bubble";
}

/**
 *  Joins an array of `AsyncSignals` into a single `AsyncSignal` of the array of values
 */
export function joinAsync<T>(
  signals: [AsyncSignal<T>],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T]>;
export function joinAsync<T, U>(
  signals: [AsyncSignal<T>, AsyncSignal<U>],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U]>;
export function joinAsync<T, U, V>(
  signals: [AsyncSignal<T>, AsyncSignal<U>, AsyncSignal<V>],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V]>;
export function joinAsync<T, U, V, W>(
  signals: [AsyncSignal<T>, AsyncSignal<U>, AsyncSignal<V>, AsyncSignal<W>],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W]>;
export function joinAsync<T, U, V, W, X>(
  signals: [
    AsyncSignal<T>,
    AsyncSignal<U>,
    AsyncSignal<V>,
    AsyncSignal<W>,
    AsyncSignal<X>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W, X]>;
export function joinAsync<T, U, V, W, X, Y>(
  signals: [
    AsyncSignal<T>,
    AsyncSignal<U>,
    AsyncSignal<V>,
    AsyncSignal<W>,
    AsyncSignal<X>,
    AsyncSignal<Y>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W, X, Y]>;
export function joinAsync<T, U, V, W, X, Y, Z>(
  signals: [
    AsyncSignal<T>,
    AsyncSignal<U>,
    AsyncSignal<V>,
    AsyncSignal<W>,
    AsyncSignal<X>,
    AsyncSignal<Y>,
    AsyncSignal<Z>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W, X, Y, Z]>;
export function joinAsync<T, U, V, W, X, Y, Z, A>(
  signals: [
    AsyncSignal<T>,
    AsyncSignal<U>,
    AsyncSignal<V>,
    AsyncSignal<W>,
    AsyncSignal<X>,
    AsyncSignal<Y>,
    AsyncSignal<Z>,
    AsyncSignal<A>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W, X, Y, Z, A]>;
export function joinAsync<T, U, V, W, X, Y, Z, A, B>(
  signals: [
    AsyncSignal<T>,
    AsyncSignal<U>,
    AsyncSignal<V>,
    AsyncSignal<W>,
    AsyncSignal<X>,
    AsyncSignal<Y>,
    AsyncSignal<Z>,
    AsyncSignal<A>,
    AsyncSignal<B>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W, X, Y, Z, A, B]>;
export function joinAsync<T, U, V, W, X, Y, Z, A, B, C>(
  signals: [
    AsyncSignal<T>,
    AsyncSignal<U>,
    AsyncSignal<V>,
    AsyncSignal<W>,
    AsyncSignal<X>,
    AsyncSignal<Y>,
    AsyncSignal<Z>,
    AsyncSignal<A>,
    AsyncSignal<B>,
    AsyncSignal<C>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<[T, U, V, W, X, Y, Z, A, B, C]>;
export function joinAsync<T>(
  signals: Array<AsyncSignal<T>>,
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<Array<T>>;
export function joinAsync<T>(
  signals: Array<AsyncSignal<T>>,
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<Array<T>> {
  let options = {
    errors: "bubble",
    pendings: "bubble",
  };
  if (joinOptions) {
    options = {
      ...options,
      ...joinOptions,
    };
  }
  return new AsyncComputed(() => {
    const values = signals.map((s) => s.get());
    if (options.errors === "bubble") {
      const firstError = values.find(
        (v) => v && (v as AsyncResult<any>).status === "error",
      );
      if (firstError) {
        return firstError as AsyncResult<T[]>;
      }
    }
    if (options.pendings === "bubble") {
      const firstLoading = values.find(
        (v) => v && (v as AsyncResult<any>).status === "pending",
      );
      if (firstLoading) {
        return firstLoading as AsyncResult<T[]>;
      }
    }

    const v = values
      .filter((v) => v.status === "completed")
      .map((v) => (v as any).value as T);
    return {
      status: "completed",
      value: v,
    } as AsyncResult<T[]>;
  });
}

/**
 * Joins all the results in a HashMap of `AsyncSignals`
 */
export function joinAsyncMap<K, T, V extends AsyncSignal<any>>(
  map: ReadonlyMap<K, V>,
  joinOptions?: JoinAsyncOptions,
): AsyncSignal<ReadonlyMap<K, T>> {
  const signalArray = Array.from(map.entries()).map(
    ([key, signal]) =>
      new AsyncComputed<[K, T]>(() => {
        const result = signal.get();
        if (result.status !== "completed") return result;
        const value = [key, result.value] as [K, T];
        return {
          status: "completed",
          value,
        };
      }),
  );
  const arraySignal = joinAsync(signalArray, joinOptions);

  return new AsyncComputed(() => {
    const result = arraySignal.get();
    if (result.status !== "completed") return result;

    const value = new Map(result.value);
    return {
      status: "completed",
      value,
    } as AsyncResult<ReadonlyMap<K, T>>;
  });
}
