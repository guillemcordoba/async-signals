import { Signal } from "signal-polyfill";
import { AsyncComputed, AsyncResult, AsyncSignal } from "./async-signals.js";
import { fromPromise } from "./promise.js";

export type AnySignal<T> = Signal.State<T> | Signal.Computed<T>;
export type PipeInput<T> = AsyncSignal<T> | AnySignal<T>;
export type PipeStep<T> =
  | AsyncSignal<T>
  | AnySignal<T>
  | AsyncResult<T>
  | Promise<T>
  | T;

function isPromise(p) {
  return (
    p != undefined &&
    typeof p === "object" &&
    "then" in p &&
    typeof p.then === "function"
  );
}

function pipeStep<T, U>(
  signal: AsyncSignal<T>,
  stepFn: (arg: T, ...previousValue: any[]) => PipeStep<U>,
  previoussignals: Array<AsyncSignal<any>>,
): AsyncSignal<U> {
  const stepResult = new Signal.Computed(() => {
    const values = [signal, ...previoussignals].map((s) => s.get());
    let value = values[0];
    if (!!value && value.status) {
      if (value.status === "error") return value;
      else if (value.status === "pending") return value;
      else value = value.value;
    }
    try {
      const v = stepFn(
        value as T,
        ...values
          .slice(1)
          .map((v) => (v as any).value)
          .reverse(),
      );
      return v;
    } catch (e) {
      return {
        status: "error",
        error: e,
      };
    }
  });
  let cachedSignal;
  const c = new AsyncComputed(() => {
    const v = signal.get();
    cachedSignal = undefined;
    return v;
  });
  return new AsyncComputed(() => {
    c.get();
    const result = stepResult.get();
    if (!!result && (result as AnySignal<any>).get) {
      const value = (result as AnySignal<U>).get();
      if (!!value && (value as AsyncResult<U>).status) {
        return value;
      } else {
        return { status: "completed", value };
      }
    } else if (isPromise(result)) {
      if (!cachedSignal) {
        cachedSignal = fromPromise(() => result as Promise<U>);
      }
      return cachedSignal.get();
    } else if (!!result && (result as AsyncResult<U>).status) {
      return result;
    } else {
      return { status: "completed", value: result };
    }
  });
}

/**
 * Takes an AsyncSignal signal and derives it with the given functions
 * - Each step may return an `AsyncSignal`, a `Promise` or just a raw value
 * - Each step receives the results of all the previous steps, normally you'll only need
 * the result for the latest one
 *
 * ```js
 *  const asyncSignal = fromPromise(async () => {
 *    await sleep(1);
 *    return 1;
 *  });
 *  const pipeSignal = pipe(
 *    asyncSignal,
 *    (n1) => fromPromise(async () => { // Step with `AsyncSignal`
 *      await sleep(1);
 *      return n1 + 1;
 *    }),
 *    async (n3, n2, n1) => {           // Step with `Promise`
 *      await sleep(1);
 *      return n3 + 1;
 *    },
 *    (n4, n3, n2, n1) => n4 + 1        // Step with raw value
 *  );
 *  toPromise(pipeSignal).then(value => console.log(value)); // Use like any other signal, will print "5" after 3 milliseconds
 * ```
 */
export function pipe<T, U>(
  signal: PipeInput<T>,
  fn1: (arg: T) => PipeStep<U>,
): AsyncSignal<U>;
export function pipe<T, U, V>(
  signal: PipeInput<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg0: T) => PipeStep<V>,
): AsyncSignal<V>;
export function pipe<T, U, V, W>(
  signal: PipeInput<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
): AsyncSignal<W>;
export function pipe<T, U, V, W, X>(
  signal: PipeInput<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>,
): AsyncSignal<X>;
export function pipe<T, U, V, W, X, Y>(
  signal: PipeInput<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>,
  fn5: (
    arg: X,
    prevArg0: W,
    prevArg1: V,
    prevArg2: U,
    prevArg3: T,
  ) => PipeStep<Y>,
): AsyncSignal<Y>;
export function pipe<T, U, V, W, X, Y, Z>(
  signal: PipeInput<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2?: (arg: U, prevArg: T) => PipeStep<V>,
  fn3?: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4?: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>,
  fn5?: (
    arg: X,
    prevArg0: W,
    prevArg1: V,
    prevArg2: U,
    prevArg3: T,
  ) => PipeStep<Y>,
  fn6?: (
    arg: Y,
    prevArg0: X,
    prevArg1: W,
    prevArg2: V,
    prevArg3: U,
    prevArg4: T,
  ) => PipeStep<Z>,
): AsyncSignal<Z> {
  let firstSignal: AsyncSignal<T> = signal as any;
  const value = firstSignal.get();
  if (!value || !(typeof value === "object" && "status" in value)) {
    firstSignal = new AsyncComputed(() => {
      const v = signal.get() as T;
      return {
        status: "completed",
        value: v,
      };
    });
  }
  const s1 = pipeStep(firstSignal, fn1, []);
  if (!fn2) return s1 as any;
  const s2 = pipeStep(s1, fn2, [firstSignal]);
  if (!fn3) return s2 as any;
  const s3 = pipeStep(s2, fn3, [firstSignal, s1]);
  if (!fn4) return s3 as any;
  const s4 = pipeStep(s3, fn4, [firstSignal, s1, s2]);
  if (!fn5) return s4 as any;
  const s5 = pipeStep(s4, fn5, [firstSignal, s1, s2, s3]);
  if (!fn6) return s5 as any;
  const s6 = pipeStep(s5, fn6, [firstSignal, s1, s2, s3, s4]);
  return s6 as any;
}
