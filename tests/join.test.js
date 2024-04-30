import { expect, it } from "vitest";
import { Signal } from "signal-polyfill";
import { AsyncComputed, fromPromise, joinAsyncMap } from "../src";

function mapValues(map, mappingFn) {
  const mappedMap = new Map();

  for (const [key, value] of map.entries()) {
    mappedMap.set(key, mappingFn(value, key));
  }
  return mappedMap;
}

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

class LazyMap extends Map {
  constructor(fn) {
    super();
    this.fn = fn;
  }
  get(key) {
    if (!super.get(key)) {
      this.set(key, this.fn(key));
    }
    return super.get(key);
  }
}

it("joinAsyncMap", async () => {
  const lazyMap = new LazyMap((id) =>
    fromPromise(async () => {
      await sleep(10);
      return id;
    }),
  );

  const keys = ["0", "1"];

  for (const h of keys) {
    lazyMap.get(h);
  }

  const j = new AsyncComputed(() =>
    joinAsyncMap(mapValues(lazyMap, (s) => s.get())),
  );

  const w = new Signal.subtle.Watcher(() => {});
  w.watch(j);

  expect(j.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(Array.from(j.get().value.entries()).length).to.deep.equal(2);
});

it("joinAsyncMap with error filtering", async () => {
  let first = true;
  const lazyMap = new LazyMap((hash) =>
    fromPromise(async () => {
      await sleep(10);
      if (first) {
        first = false;
        throw new Error("hi");
      }
      return 2;
    }),
  );

  const keys = ["0", "1"];

  for (const h of keys) {
    lazyMap.get(h);
  }

  const j = new AsyncComputed(() =>
    joinAsyncMap(
      mapValues(lazyMap, (s) => s.get()),
      {
        errors: "filter_out",
      },
    ),
  );

  const w = new Signal.subtle.Watcher(() => {});
  w.watch(j);

  expect(j.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(j.get().status).to.equal("completed");
  expect(Array.from(j.get().value.entries()).length).to.deep.equal(1);
});

// it("mapAndJoin", async () => {
//   const lazyStoreMap = new LazyHoloHashMap((hash) =>
//     asyncReadable(async (set) => {
//       await sleep(10);
//       set(hash);
//     }),
//   );

//   const hashes = [new Uint8Array([0]), new Uint8Array([1])];

//   const map = new HoloHashMap();
//   map.set(hashes[0], "0");
//   map.set(hashes[1], "1");

//   const j = mapAndJoin(map, (h) => lazyStoreMap.get(h));

//   const subscriber = j.subscribe(() => {});

//   expect(get(j)).to.deep.equal({ status: "pending" });
//   await sleep(20);

//   expect(Array.from(get(j).value.entries()).length).to.deep.equal(2);
// });

// it("joinMap", async () => {
//   const lazyStoreMap = new LazyHoloHashMap((hash) => readable(0));

//   const hashes = [new Uint8Array([0]), new Uint8Array([1])];

//   for (const h of hashes) {
//     lazyStoreMap.get(h);
//   }

//   const j = joinMap(lazyStoreMap);

//   const subscriber = j.subscribe(() => {});

//   expect(Array.from(get(j).values())).to.deep.equal([0, 0]);
// });
