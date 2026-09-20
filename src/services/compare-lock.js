// @ts-check
import { isValidInteger } from "@dwtechs/checkard";

/** @type {Map<number, Promise<void>>} */
const tails = new Map();

/**
 * Exclusive lock for one user's compare pipeline (check → hash → bump/reset).
 * Callers must invoke the returned release function, including on errors.
 *
 * @param {number} userId
 * @returns {Promise<() => void>}
 */
export function acquireCompareLock(userId) {
  if (!isValidInteger(userId, 1, undefined, true)) {
    return Promise.resolve(() => {});
  }

  /** @type {() => void} */
  let unlock = () => {};
  const held = new Promise((resolve) => {
    unlock = resolve;
  });
  const prev = tails.get(userId) ?? Promise.resolve();
  const ready = Promise.resolve(prev).then(
    () => undefined,
    () => undefined,
  );
  const tail = ready.then(() => held);
  tails.set(userId, tail);

  return ready.then(() => {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      unlock();
      if (tails.get(userId) === tail) tails.delete(userId);
    };
  });
}

/** Test helper: drop every queued compare lock. */
export function clearCompareLocks() {
  tails.clear();
}
