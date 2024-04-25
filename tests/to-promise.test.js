import { expect, it } from "vitest";
import { Signal } from "signal-polyfill";
import { toPromise, AsyncState } from "../src";

const sleep = (ms) => new Promise((r) => setTimeout(() => r(), ms));

it("to-promise", async () => {
  let unsubscribed = false;
  const asyncState = new AsyncState(
    { status: "pending" },
    {
      [Signal.subtle.watched]: async () => {
        await sleep(10);
        asyncState.set({
          status: "completed",
          value: "hi",
        });
      },
      [Signal.subtle.unwatched]: () => {
        unsubscribed = true;
      },
    },
  );

  const result = await toPromise(asyncState);

  expect(unsubscribed).to.be.true;

  expect(result).to.equal("hi");
});

it("to-promise subscribes every time", async () => {
  let subscriberCount = 0;
  const asyncState = new AsyncState(
    { status: "pending" },
    {
      [Signal.subtle.watched]: async () => {
        await sleep(10);
        asyncState.set({
          status: "completed",
          value: "hi",
        });
        subscriberCount++;
      },
      [Signal.subtle.unwatched]: async () => {
        asyncState.set({
          status: "pending",
        });
      },
    },
  );

  await toPromise(asyncState);
  await toPromise(asyncState);

  expect(subscriberCount).to.equal(2);
});
