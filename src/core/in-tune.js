export function createInTuneTracker({ inCents = 5, releaseCents = 8, nearCents = 15, holdMs = 500, now = () => performance.now() } = {}) {
  let inTune = false;
  let since = null;
  let key = null;
  function reset() { inTune = false; since = null; key = null; }
  function update(cents, targetKey) {
    if (targetKey !== key) { reset(); key = targetKey; }
    let entered = false;
    const abs = Math.abs(cents);
    if (!Number.isFinite(abs)) { reset(); return { state: 'off', entered }; }
    if (inTune) {
      if (abs > releaseCents) { inTune = false; since = null; }
    } else if (abs <= inCents) {
      if (since === null) since = now();
      if (now() - since >= holdMs) { inTune = true; since = null; entered = true; }
    } else { since = null; }
    return { state: inTune ? 'in' : abs <= nearCents ? 'near' : 'off', entered };
  }
  return { update, reset };
}
