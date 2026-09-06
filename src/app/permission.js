// 브라우저 권한 정보만 읽는다. 오디오 엔진과 표시 상태는 모른다.
export function describeMicError(error, environment = globalThis) {
  const nav = environment.navigator ?? {};
  const technical = `${error?.name ?? 'Error'}: ${error?.message ?? ''}`;
  if (!environment.isSecureContext || !nav.mediaDevices) {
    return { title: 'HTTPS 연결이 필요합니다', body: `마이크는 https:// 주소 또는 localhost에서만 사용할 수 있습니다. 현재 주소: ${environment.location?.origin ?? ''}`, canRetry: false, technical: '' };
  }
  const platform = nav.userAgentData?.platform ?? nav.platform ?? nav.userAgent ?? '';
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent ?? '') || (/Mac/.test(platform) && nav.maxTouchPoints > 1);
  const android = /Android/.test(platform) || /Android/.test(nav.userAgent ?? '');
  const hint = ios ? 'Safari의 페이지 메뉴에서 웹사이트 설정 → 마이크를 허용하거나, 설정 앱의 Safari 마이크 권한을 확인하세요.'
    : android ? 'Chrome 주소창 왼쪽 사이트 설정에서 마이크를 허용하세요.'
      : '주소창 왼쪽 사이트 설정에서 이 사이트의 마이크 권한을 허용하고 다시 시도하세요.';
  const errors = {
    NotAllowedError: ['마이크 권한이 꺼져 있습니다', hint],
    PermissionDeniedError: ['마이크 권한이 꺼져 있습니다', hint],
    SecurityError: ['마이크 권한이 꺼져 있습니다', hint],
    NotFoundError: ['연결된 마이크가 없습니다', '마이크를 연결한 뒤 다시 시도하세요.'],
    DevicesNotFoundError: ['연결된 마이크가 없습니다', '마이크를 연결한 뒤 다시 시도하세요.'],
    NotReadableError: ['다른 앱이 마이크를 사용 중입니다', '통화·녹음 앱을 종료하고 재시도하세요.'],
    TrackStartError: ['다른 앱이 마이크를 사용 중입니다', '통화·녹음 앱을 종료하고 재시도하세요.'],
    OverconstrainedError: ['마이크 설정을 지원하지 않습니다', '다른 마이크를 연결한 뒤 다시 시도하세요.'],
  };
  const description = errors[error?.name];
  return { title: description?.[0] ?? '알 수 없는 오류', body: description?.[1] ?? '잠시 후 다시 시도하세요.', canRetry: true, technical: description ? '' : technical };
}
