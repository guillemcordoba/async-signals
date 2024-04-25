# async-signals

Synthatic sugar and utilities to support async tasks on top of [`signal-polyfill`](https://www.npmjs.com/package/signal-polyfill).

## Installation

```bash
npm install async-signals
```

## Usage

### AsyncSignal and AsyncResult

An `AsyncSignal` is just a [signal](https://github.com/tc39/proposal-signals?tab=readme-ov-file#introducing-signals) that has an `AsyncResult` as its value. `AsyncResult` is defined as follows:

```ts
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
```

It has 3 possible states: `pending`, `completed` or `error`. You can see that the lifecycle is really similar to that of a `Promise`. The big difference is that an `AsyncSignal` can update any watcher multiple times (eg. a UI component) throughout the lifecycle of an application when new completed values get discovered.


### AsyncState

A common use case is to implement a signal that is responsible for some async task (eg. fetching data from the backend) only when it's watched.

```js
import { AsyncState } from 'async-signals';

import { getMyFriendsUsersIds, onNewFriendAdded } from './requests.js';

let unsubscribe = undefined;

// Will contain all the user ids for all my friends, updated in real-time when a new friend is added
const myFriendsUsersIdsSignal = new AsyncState({ status: 'pending' }, {
  [Signal.subtle.watched]: async () => {
    const myFriendsUsersIds = await getMyFriendsUsersIds();
    myFriendsUsersIdsSignal.set({
      status: "completed",
      value: myFriendsUsersIds,
    });

    unsubscribe = onNewFriendAdded(friendUserId => {
      const currentFriends = myFriendsUsersIdsSignal.get().value;
      const friends = [...currentFriends, friendUserId];
      myFriendsUsersIdsSignal.set({
        status: 'completed',
        value: friends
      });
    });
  },
  [Signal.subtle.unwatched]: () => {
    // We revert back to pending state so that the next time this signal is queried,
    // the backend request is sent again
    asyncState.set({
      status: "pending",
    });
    unsubscribe?.();
  },
});
```


### AsyncComputed

Once we have source signals for some interesting state, we can create any downstread computed signals with `AsyncComputed`.

```js
import { AsyncComputed } from 'async-signals';

// Will contain the number of my friends, updated in real-time when a new friend is added
const myFriendsCountSignal = new AsyncComputed(() => {
  // This will be re-run every time there is a new value for `myFriendsUsersIds`
  const myFriendsUsersIds = myFriendsUsersIdsSignal.get();
  // Return early any other status than completed
  if (myFriendsUsersIds.status !== 'completed') return myFriendsUsersIds; 

  return myFriendsUsersIds.length;
});
```

Whenever this signal is watched, it will watch the `myFriendsUsersIdsSignal`, which in its turn will make a request to the backend and listen to any new friends added. Whenever the value of `myFriendsUsersIdsSignal` changes, either by the request to the backend being `completed` or because there is a new friend added, the callback for `myFriendsCountSignal` will be run again. With this, `myFriendsCountSignal` can guarantee to any downstream watcher that it will contain the count of my friends, up to date with the state of the backend.


### toPromise

Sometimes we just want to **read once** the resulting state from a signal. For that we have `toPromise`:

```js
const myFriendsCount = await toPromise(myFriendsCountSignal);
```

> [!WARN]
> Don't do this when reading a signal from a UI component. The UI component **will not be update** every time the value of the signal changes.
> Only do this in business logic that **only needs to read the value of the signal once**.


### fromPromise

We can easily construct an `AsyncSignal` from a `Promise` with `fromPromise`:

```js
import { fromPromise } from 'async-signals';

import { getMyUserId } from './requests.js';

const myUserId = await fromPromise(() => getMyUserId());
```

This is useful for tasks whose result doesn't need to be updated after they resolve.


### joinAsyncMap

Image we need a `myFriendsProfilesSignal` that will contain an up to date `HashMap`: `UserId` -> `Profile` for all our friends. 

We can implement `myFriendsProfilesSignal` as follows:

```js
import { AsyncComputed, joinMap } from 'async-signals';

import { getUserProfile } from './requests.js';

// Client-side "cache" so that we don't request the profile for a user if we already have it
const usersProfiles = new Map();

// Will contain all the profiles for all my friends, updated in real-time when a new friend is added
const myFriendsProfilesSignal = new AsyncComputed(() => {
  // This will be re-run every time there is a new value for `myFriendsUsersIds`
  const myFriendsUsersIds = myFriendsUsersIds.get();
  // Return early any other status than completed
  if (myFriendsUsersIds.status !== 'completed') return myFriendsUsersIds; 

  for (const friendUserId of myFriendsUsersIds.value) {
    if (!usersProfiles.has(friendUserId)) {
      usersProfiles.set(friendUserId, fromPromise(() => getUserProfile(friendUserId)));
    }
  }

  return joinAsyncMap(friendsProfiles); // Will iterate over all the signals in the map and will join their results
                                        // If any of the results is still pending, it will return "pending"
                                        // If any of the results is an error, it will return that error
                                        // If all results are completed, it will return the map of their values
});
```
