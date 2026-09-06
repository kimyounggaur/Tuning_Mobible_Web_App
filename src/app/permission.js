// 권한과 플랫폼을 메시지 키로 변환한다.
// DOM과 오디오 엔진 내부는 모른다.
export function describeMicError(error, environment = globalThis) {
  const nav = environment.navigator ?? {};
  if (!environment.isSecureContext || !nav.mediaDevices) return { title: 'mic.https.title', body: 'mic.https.body', params: { origin: environment.location?.origin ?? '' }, canRetry: false, technical: '' };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? nav.userAgent ?? '';
  const ios = /iPad|iPhone|iPod/i.test(nav.userAgent ?? '') || (/Mac/i.test(platform) && nav.maxTouchPoints > 1);
  const android = /Android/i.test(platform) || /Android/i.test(nav.userAgent ?? '');
  const hint = ios ? 'mic.ios' : android ? 'mic.android' : 'mic.desktop';
  const errors = {
    NotAllowedError: ['mic.denied.title', hint], PermissionDeniedError: ['mic.denied.title', hint], SecurityError: ['mic.denied.title', hint],
    NotFoundError: ['mic.missing.title', 'mic.missing.body'], DevicesNotFoundError: ['mic.missing.title', 'mic.missing.body'],
    NotReadableError: ['mic.busy.title', 'mic.busy.body'], TrackStartError: ['mic.busy.title', 'mic.busy.body'],
    OverconstrainedError: ['mic.constraints.title', 'mic.missing.body'],
  };
  const description = errors[error?.name];
  return { title: description?.[0] ?? 'mic.unknown.title', body: description?.[1] ?? 'mic.unknown.body', canRetry: true,
    technical: description ? '' : `${error?.name ?? 'Error'}: ${error?.message ?? ''}` };
}
