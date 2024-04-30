import { AsyncResult } from "./async-signals.js";

/**
 * Defines the behavior of the joining of the `AsyncResults`
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
 *  Joins an array of `AsyncResults` into a single `AsyncResult` of the array of values
 */
export function joinAsync<T>(
  results: [AsyncResult<T>],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T]>;
export function joinAsync<T, U>(
  results: [AsyncResult<T>, AsyncResult<U>],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U]>;
export function joinAsync<T, U, V>(
  results: [AsyncResult<T>, AsyncResult<U>, AsyncResult<V>],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V]>;
export function joinAsync<T, U, V, W>(
  results: [AsyncResult<T>, AsyncResult<U>, AsyncResult<V>, AsyncResult<W>],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W]>;
export function joinAsync<T, U, V, W, X>(
  results: [
    AsyncResult<T>,
    AsyncResult<U>,
    AsyncResult<V>,
    AsyncResult<W>,
    AsyncResult<X>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W, X]>;
export function joinAsync<T, U, V, W, X, Y>(
  results: [
    AsyncResult<T>,
    AsyncResult<U>,
    AsyncResult<V>,
    AsyncResult<W>,
    AsyncResult<X>,
    AsyncResult<Y>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W, X, Y]>;
export function joinAsync<T, U, V, W, X, Y, Z>(
  results: [
    AsyncResult<T>,
    AsyncResult<U>,
    AsyncResult<V>,
    AsyncResult<W>,
    AsyncResult<X>,
    AsyncResult<Y>,
    AsyncResult<Z>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W, X, Y, Z]>;
export function joinAsync<T, U, V, W, X, Y, Z, A>(
  results: [
    AsyncResult<T>,
    AsyncResult<U>,
    AsyncResult<V>,
    AsyncResult<W>,
    AsyncResult<X>,
    AsyncResult<Y>,
    AsyncResult<Z>,
    AsyncResult<A>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W, X, Y, Z, A]>;
export function joinAsync<T, U, V, W, X, Y, Z, A, B>(
  results: [
    AsyncResult<T>,
    AsyncResult<U>,
    AsyncResult<V>,
    AsyncResult<W>,
    AsyncResult<X>,
    AsyncResult<Y>,
    AsyncResult<Z>,
    AsyncResult<A>,
    AsyncResult<B>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W, X, Y, Z, A, B]>;
export function joinAsync<T, U, V, W, X, Y, Z, A, B, C>(
  results: [
    AsyncResult<T>,
    AsyncResult<U>,
    AsyncResult<V>,
    AsyncResult<W>,
    AsyncResult<X>,
    AsyncResult<Y>,
    AsyncResult<Z>,
    AsyncResult<A>,
    AsyncResult<B>,
    AsyncResult<C>,
  ],
  joinOptions?: JoinAsyncOptions,
): AsyncResult<[T, U, V, W, X, Y, Z, A, B, C]>;
export function joinAsync<T>(
  results: Array<AsyncResult<T>>,
  joinOptions?: JoinAsyncOptions,
): AsyncResult<Array<T>>;
export function joinAsync<T>(
  results: Array<AsyncResult<T>>,
  joinOptions?: JoinAsyncOptions,
): AsyncResult<Array<T>> {
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
  if (options.errors === "bubble") {
    const firstError = results.find(
      (v) => v && (v as AsyncResult<any>).status === "error",
    );
    if (firstError) {
      return firstError as AsyncResult<T[]>;
    }
  }
  if (options.pendings === "bubble") {
    const firstLoading = results.find(
      (v) => v && (v as AsyncResult<any>).status === "pending",
    );
    if (firstLoading) {
      return firstLoading as AsyncResult<T[]>;
    }
  }

  const v = results
    .filter((v) => v.status === "completed")
    .map((v) => (v as any).value as T);
  return {
    status: "completed",
    value: v,
  } as AsyncResult<T[]>;
}

/**
 * Joins all the results in a HashMap of `AsyncResults`
 */
export function joinAsyncMap<K, V>(
  map: ReadonlyMap<K, AsyncResult<V>>,
  joinOptions?: JoinAsyncOptions,
): AsyncResult<ReadonlyMap<K, V>> {
  const resultsArray = Array.from(map.entries()).map(([key, result]) => {
    if (result.status !== "completed") return result;
    const value = [key, result.value] as [K, V];
    return {
      status: "completed",
      value,
    } as AsyncResult<[K, V]>;
  });
  const arrayResult = joinAsync(resultsArray, joinOptions);

  if (arrayResult.status !== "completed") return arrayResult;

  const value = new Map<K, V>(arrayResult.value);
  return {
    status: "completed",
    value,
  } as AsyncResult<ReadonlyMap<K, V>>;
}
