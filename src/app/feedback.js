// 성공 이벤트와 피드백 설정을 안다.
// DOM과 피치 판정 알고리즘은 모른다.
import { stringKey } from '../core/string-match.js';
import { BEEP_IGNORE_MS, COMPLETE_BANNER_MS } from '../config.js';
export function createFeedback({ state, settings, view, tonePlayer, nav = globalThis.navigator, now = () => performance.now() }) {
  return ({ targetKey, instrument, tuning }) => {
    view.pulseUntil = now() + 560;
    if (settings.haptics) nav?.vibrate?.(60);
    if (settings.confirmSound) { view.ignoreUntil = now() + BEEP_IGNORE_MS; void tonePlayer.beep().catch(() => {}); }
    if (instrument.id === 'chromatic') return;
    state.tunedKeys.add(targetKey);
    if (!state.completeAnnounced && tuning.strings.every((string, index) => state.tunedKeys.has(stringKey(string, index)))) {
      state.completeAnnounced = true; view.completeUntil = now() + COMPLETE_BANNER_MS;
      if (settings.haptics) nav?.vibrate?.([55, 60, 55]);
    }
  };
}
