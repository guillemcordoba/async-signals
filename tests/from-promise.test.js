import { it, expect } from "vitest";
import { Signal } from "signal-polyfill";

import { fromPromise } from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("to-promise subscribes every time", async () => {
  const signal = fromPromise(async () => {
    await sleep(10);
    return 1;
  });

  const w = new Signal.subtle.Watcher(() => {});
  w.watch(signal);

  expect(signal.get()).to.deep.equal({ status: "pending" });

  await sleep(20);

  expect(signal.get()).to.deep.equal({ status: "completed", value: 1 });
});
