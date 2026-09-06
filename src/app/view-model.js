// 표시 데이터만 유지한다.
// DOM과 오디오 처리를 모른다.
import { createTrace } from '../core/trace.js';
export function createViewModel() {
  return { trace: createTrace(), cents: null, note: '', freq: null, targetFreq: null, toneState: 'idle', message: 'status.idle',
    rms: 0, dirty: true, permission: null, toast: '', toastUntil: 0, completeUntil: 0, pulseUntil: 0,
    rejectedSince: null, silentSince: null, ignoreUntil: 0, toneMode: null, toneFreq: 0, updateReady: false };
}
export function setIdle(view, message) {
  Object.assign(view, { cents: null, freq: null, toneState: 'idle', message, dirty: true });
}
