import { expect, it } from "vitest";
import { Signal } from "signal-polyfill";
import { pipe, fromPromise } from "../src";

function watch(signal, callback) {
  const w = new Signal.subtle.Watcher(() => {
    setTimeout(() => {
      callback(signal.get());
    });
  });
  w.watch(signal);

  return () => {
    w.unwatch(signal);
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("pipe with normal fn", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(asyncSignal, (s) => `${s}hi`);
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: "hihi",
  });
});

it("pipe with normal fn that returns undefined", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(asyncSignal, (s) => undefined);
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: undefined,
  });
});

it("pipe with signal fn that returns undefined", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(asyncSignal, (s) => new Signal.State(undefined));

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: undefined,
  });
});

it("pipe with promise", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(asyncSignal, async (s) => {
    await sleep(5);
    return `${s}hi`;
  });
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(30);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: "hihi",
  });
});

it("pipe with state", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(asyncSignal, (s) => new Signal.State(`${s}hi`));
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: "hihi",
  });
});

it("pipe with fromPromise", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(asyncSignal, (s) =>
    fromPromise(async () => {
      await sleep(1);
      return `${s}hi`;
    }),
  );
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: "hihi",
  });
});

it("pipe with all types", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return "hi";
  });
  const pipeStore = pipe(
    asyncSignal,
    (s) =>
      fromPromise(async () => {
        await sleep(1);
        return `${s}hi`;
      }),
    (s) => new Signal.State(`${s}hi`),
    async (s) => {
      await sleep(1);
      return `${s}hi`;
    },
    (s) => `${s}hi`,
  );
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(20);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: "hihihihihi",
  });
});

it("pipe yield the results for every step", async () => {
  const asyncSignal = fromPromise(async () => {
    await sleep(10);
    return 1;
  });
  const pipeStore = pipe(
    asyncSignal,
    (s1) => s1 + 1,
    (s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      return s1 + s2;
    },
    (s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      return s1 + s2 + s3;
    },
    (s4, s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      expect(s4).to.equal(6);
      return s1 + s2 + s3 + s4;
    },
    (s5, s4, s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      expect(s4).to.equal(6);
      expect(s5).to.equal(12);
      return s1 + s2 + s3 + s4 + s5;
    },
    (s6, s5, s4, s3, s2, s1) => {
      expect(s1).to.equal(1);
      expect(s2).to.equal(2);
      expect(s3).to.equal(3);
      expect(s4).to.equal(6);
      expect(s5).to.equal(12);
      expect(s6).to.equal(24);
      return s1 + s2 + s3 + s4 + s5 + s6;
    },
  );
  watch(pipeStore, () => {});

  expect(pipeStore.get()).to.deep.equal({ status: "pending" });
  await sleep(30);

  expect(pipeStore.get()).to.deep.equal({
    status: "completed",
    value: 48,
  });
});
