import { expect, it } from 'vitest';
import { describeMicError } from './permission.js';
const secure = { isSecureContext: true, navigator: { mediaDevices: {}, userAgent: 'Chrome', userAgentData: { platform: 'Windows' } } };
it.each([
  ['NotAllowedError', 'mic.denied.title'], ['PermissionDeniedError', 'mic.denied.title'], ['SecurityError', 'mic.denied.title'],
  ['NotFoundError', 'mic.missing.title'], ['DevicesNotFoundError', 'mic.missing.title'],
  ['NotReadableError', 'mic.busy.title'], ['TrackStartError', 'mic.busy.title'], ['OverconstrainedError', 'mic.constraints.title'],
])('describes %s without exposing technical names', (name, title) => {
  const result = describeMicError({ name }, secure); expect(result.title).toBe(title); expect(result.technical).toBe('');
});
it('identifies an insecure origin without offering an ineffective retry', () => {
  const result = describeMicError({}, { isSecureContext: false, location: { origin: 'http://192.168.1.1' } });
  expect(result.canRetry).toBe(false); expect(result.params.origin).toBe('http://192.168.1.1');
});
it('identifies iPadOS with a desktop user agent', () => {
  const result = describeMicError({ name: 'NotAllowedError' }, { ...secure, navigator: { ...secure.navigator, userAgentData: { platform: 'macOS' }, platform: 'MacIntel', maxTouchPoints: 5 } });
  expect(result.body).toBe('mic.ios');
});
