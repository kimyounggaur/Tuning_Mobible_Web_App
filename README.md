# TuneString 2.0

[실행하기](https://tuning-mobible-web-app.vercel.app) · [GitHub](https://github.com/kimyounggaur/Tuning_Mobible_Web_App)

Vite + Vanilla JavaScript + CSS로 만든 모바일 우선 현악기 튜너 PWA입니다. 런타임 npm 의존성은 없습니다. 마이크 오디오는 기기 안에서 분석하며 서버로 전송하지 않습니다.

기타·베이스·우쿨렐레·바이올린·비올라·첼로·콘트라베이스·만돌린·밴조·크로매틱을 지원합니다. 커스텀 조현, 기준음, 지속 드론, 3초 피치 트레이스, 한국어/영어/일본어, 다크/라이트/시스템 테마를 제공합니다. 가야금·거문고·해금은 상대 조현 구조를 제공하지만, 간격과 청 기본값은 **연주자 검수 전 임시 데이터**입니다.

## 실행과 개발

Node.js 22.12 이상이 필요합니다. 마이크는 HTTPS 또는 localhost에서 사용할 수 있습니다.

```sh
npm ci
npm run dev
```

| 명령 | 내용 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 앱, 분석 워커, 버전별 서비스워커 빌드 |
| `npm run preview -- --port 5175` | QA 스크립트가 사용하는 빌드 확인 서버 |
| `npm test` / `npm run test:watch` | 단위 테스트 / 감시 모드 |
| `npm run gen:wav` | 가짜 마이크용 48kHz 모노 PCM 파일 생성 |
| `npx playwright install chromium` | E2E 브라우저 준비 |
| `npm run test:e2e` | 빌드 산출물 기반 브라우저 테스트 |
| `npm run test:all` | 단위 → WAV → 빌드 → E2E |
| `npm run lint` | ESLint 검사 |
| `npm run check:pitch` | 합성 신호 정확도와 악기별 연산 비용 |
| `npm run check:i18n` | 번역 키·치환 인자 검사 |
| `npm run check:performance` | 5175 서버에서 반복 시작/정지와 CPU 4배 제한 계측 |
| `node scripts/latency-check.mjs` | 버퍼 전송·워커 지연·트레이스 그리기 계측 |
| `npm run audit:lighthouse` | 모바일 Lighthouse HTML/JSON 보고서 |
| `npm run capture:pwa` | 실제 앱에서 설치 안내 스크린샷 생성 |

스크린샷은 `output/screens`, 테스트 결과는 `output/playwright`, 성능 계측은 `output/qa`, Lighthouse는 `output/lighthouse`에 생성됩니다. 생성된 QA 파일은 Git에 포함하지 않습니다. 설치용 이미지 2장과 마스커블 아이콘은 `public`에 포함됩니다.

## 구조

```text
main.js (54줄, 모듈 조립)
  +-- app/state, settings, actions       선택과 저장, 사용자 명령
  +-- app/session                       마이크와 화면 잠금, 복귀 처리
  |     +-- audio/context               단일 AudioContext
  |     +-- audio/pitch-engine           캡처, 버퍼 2개, 백프레셔
  |     |     +-- pitch-worker -> detect-pitch
  |     +-- audio/tone-player            기준음, 확인음, 드론
  +-- app/pitch-handler -> core/*        중앙값, 노트/현 락, 인튠 판정
  +-- app/view-model -> render-loop      상태 갱신 -> 한 곳의 rAF
  |     +-- app/render -> ui/*           게이지, 현 패널, 시트, 트레이스
  +-- app/feedback                       햅틱, 확인음, 완주
  +-- app/pwa                            업데이트와 캐시 관리
  +-- i18n/{ko,en,ja}                    표시 언어
```

오디오 입력 버퍼는 Transferable로 워커에 전달하고 반환받아 재사용합니다. 이전 분석이 끝나기 전에는 다음 프레임을 보내지 않습니다. 워커를 만들 수 없으면 같은 검출 함수를 메인 스레드에서 사용합니다. NSDF 분모와 DC 제거는 누적 합 항등식으로 계산해 안쪽 루프 연산을 줄입니다. 저음은 8192 샘플을 2:1 평균하여 분석합니다.

`src/app` 모듈은 모두 300줄 미만입니다. 오디오 결과 콜백은 DOM을 변경하지 않습니다. 음이 바뀌어도 현 카드를 다시 생성하지 않으며 악기·조현·언어가 바뀔 때만 구조를 갱신합니다.

## 배포와 업데이트

`main`에 push하면 연결된 Vercel 프로젝트의 프로덕션 배포가 시작됩니다. GitHub Actions는 push/PR마다 lint, 단위 테스트, 빌드, E2E를 실행하고 산출물을 보관합니다. 두 작업은 독립적으로 실행되므로 Actions 성공이 배포의 선행 조건은 아닙니다.

빌드 시 해시 자산 전체와 HTML·아이콘·매니페스트를 프리캐시에 넣고 서비스워커의 빌드 ID를 자동 치환합니다. 내비게이션은 network-first이며 3초 안에 응답이 없으면 캐시 HTML로 돌아갑니다. 해시 자산은 cache-first, 기타 자원은 stale-while-revalidate입니다.

새 서비스워커는 대기한 뒤 업데이트 버튼을 누르면 마이크를 정지하고 적용합니다. 튜닝 중 자동 새로고침은 없습니다. 60분마다 업데이트를 확인합니다. 업데이트 UI가 없던 v1은 서비스워커 제어권만 한 번 넘기며, 사용자가 다음에 페이지를 열 때 새 앱을 받습니다. 설정의 캐시 초기화는 TuneString 캐시와 해당 서비스워커만 제거하고 사용자 설정·커스텀 튜닝은 보존합니다.

관련 동작은 [MDN 서비스워커 수명주기](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [AudioContext 상태](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/state)를 참고했습니다.

## QA 실측

2026-09-06, Windows 11, Node 24.14.0, Playwright Chromium, 로컬 프로덕션 빌드 기준입니다. 브라우저 시뮬레이션과 실제 휴대기기 검증을 구분합니다.

| 항목 | 결과 | 확인 방법 |
|---|---|---|
| 단위 테스트 | 통과: 152개 | `npm test` |
| 마이크 및 UI | 통과: E2E 24개 | `npm run test:e2e`, 원래 8개 피치 시나리오 포함 |
| 정확도 | 통과: 54/54, 오차 1센트 이하 | 25~1100Hz, 48/44.1kHz, 톱니·강한 배음·DC·저음 데시메이션 |
| 악기별 분석 비용 | 통과: 기타 3.39ms, 바이올린 1.56ms, 베이스 3.18ms | 워밍업 후 100회 평균, `check:pitch` |
| 워커 왕복 | 통과: 평균 3.19ms, 분석 평균 3.06ms | 115개 프레임, 버퍼 분리 확인 |
| 시작/정지 반복 | 통과: 20회 후 JS heap +70,236 bytes, 컨텍스트 1개 | CDP GC 후 `Runtime.getHeapUsage`; 워밍업 포함 마이크 요청 21회 |
| CPU 4배 제한 | 통과: 30초 중 롱태스크 0, 50ms 초과 프레임 0 | PerformanceObserver + rAF 간격, 평균 16.66ms |
| 피치 트레이스 | 통과: 데스크톱 최대 0.20ms; 4배 제한 평균 0.14ms | Canvas clear부터 마지막 stroke까지; 4배 제한 최고 3ms |
| DOM 안정성 | 통과: 30초 중 현 카드 재생성 0 | MutationObserver |
| 반응형 | 통과: 375×667, 360×640, 430×932, 667×375, 800×450, 1024×768 | 스크린샷 + 좌표/스크롤 검사 |
| 7현·12현 | 통과 | 7현은 48px 너비 확보; 12현은 현 패널 내부 스크롤 허용 |
| 접근성 | 통과: dark/light axe serious/critical 0, 포커스 트랩·Escape·복귀 | E2E + Lighthouse, 현 버튼은 보이는 내용으로 접근성 이름 구성 |
| 대비 | 통과: dark muted 6.11:1; light muted 5.85, off 5.79, near 5.42, in 5.29:1 | sRGB 상대휘도 계산 |
| PWA 업데이트 | 통과 | 독립 HTTP 서버에서 SW 2개 리비전 → 알림 → 적용 → 캐시 교체 |
| 오프라인 | 통과 | 네트워크 차단 후 미캐시 URL로 재실행, 가짜 마이크 피치 검출 |
| 설치 메타데이터 | 통과 | manifest, 1080×1920/1920×1080 이미지, 마스커블 안전 영역 |
| Lighthouse 모바일 | 통과: 성능 100 / 접근성 100 / 권장사항 100 / SEO 100 | `output/lighthouse/report.html` |
| 의존성 감사 | 통과: 취약점 0 | `npm audit` |

### 실기기 확인이 남은 항목

| 항목 | 상태와 이유 | 관련 코드와 후속 확인 |
|---|---|---|
| iOS Safari / 홈 화면 설치 | 미확인: 연결된 iPhone 없음 | `session.visibility`, `pitch-engine.start`: 최초 권한·홈 이동 30초·복귀 5초 이내 입력 |
| Android Chrome / 설치 앱 | 미확인: 연결된 Android 없음 | 설치 아이콘·회전·오프라인·Wake Lock을 실제 기기에서 확인 |
| 전화·Siri·Bluetooth 해제 | 미확인: 실제 인터럽트 장비 없음 | 상태 전이 단위 테스트와 ended 이벤트 E2E는 통과; 기기 정책에 따라 재개 안내 경로 확인 |
| 말소리·박수·TV 오판 | 미확인: 실환경 녹음 없음 | `detectPitch` clarity/RMS 계측 후 필요한 경우 임계값을 별도 조정 |
| 5분 발열·체감 지연 | 미확인: 실제 스마트폰 없음 | 워커 지연과 CPU 스로틀 계측은 통과; 실기기에서 발열과 체감 반응 확인 |
| VoiceOver / NVDA 발화 횟수 | 미확인: 실제 스크린리더 미실행 | SR 영역 최대 1Hz 갱신, 안정음 30초의 추가 DOM 알림 0회; 실제 발화 별도 확인 |
| 기준음 음질·드론 클릭 잡음 | 미확인: 실제 스피커 청취 없음 | 20ms 출력 램프·-12dBFS 이하 합성 게인 코드 확인, 실제 녹음으로 확인 |
| 국악기 조현 정확성 | 미확인: 검수 자료 없음 | `presets.js` 임시 간격과 청을 아래 표로 검수 |

## 상수 가이드

정의 위치는 `src/config.js`입니다. 임계값 변경 시 단위 테스트와 합성 신호 검증을 함께 실행합니다.

| 상수 | 기본값 | 조정 효과 |
|---|---|---|
| `MIN_FREQ` / `MAX_FREQ` | 25 / 1100Hz | 넓히면 분석량·옥타브 후보 증가 |
| `RMS_MIN` / `RMS_LEVELS` | .008 / .014·.008·.004 | 높이면 생활소음과 약한 악기음을 함께 제외 |
| `CLARITY_MIN` / `PEAK_RATIO` | .90 / .90 | 명료도와 기본 피크 선택 기준 |
| `RECENT_FREQ_SIZE` | 5 | 키우면 안정성과 지연 증가 |
| `NOTE_LOCK_COUNT` / `STRING_LOCK_COUNT` | 3 / 3 | 전환 확인 횟수, 키우면 지연 증가 |
| `IN_TUNE_CENTS` / `OUT_OF_TUNE_RELEASE_CENTS` | 5 / 8센트 | 진입과 이탈을 분리해 경계 깜빡임 방지 |
| `NEAR_CENTS` / `IN_TUNE_HOLD_MS` | 15센트 / 500ms | 근접 표시와 성공 유지시간 |
| `BUFFER_SIZE` / `LOW_RANGE_BUFFER_SIZE` | 4096 / 8192 | 낮은 주파수의 주기 확보 |
| `LOW_RANGE_THRESHOLD_HZ` | 65Hz 미만 | 현재 조현과 A4로 저음 경로 자동 선택 |
| `TONE_RESUME_DELAY_MS` / `BEEP_IGNORE_MS` | 300 / 180ms | 기준음과 확인음의 마이크 유입 방지 |
| `HIDDEN_STOP_MS` | 10000ms | 숨긴 탭의 마이크와 컨텍스트 정리 |
| `GAUGE_MAX_ANGLE` | ±90도 | 반원 양 끝의 ±50센트 눈금과 일치 |

기존 첼로 C2는 A4=440에서 65.41Hz이므로 새로 명시된 `<65Hz` 규칙에서는 일반 버퍼를 사용합니다. v1의 고정 `lowRange: true`와 다르지만 같은 정확도 검증을 통과하며, A4를 낮춰 65Hz 아래로 내려가면 자동으로 저음 경로를 사용합니다.

## 국악기 데이터 검수

현재 예시는 전통 조현의 표준값이 아닙니다. 확인된 자료를 받으면 아래 항목을 근거로 임시 표시를 해제합니다.

| 악기 | 유파·레퍼토리 | 청 기준 Hz / 음명 | 저음부터 현별 반음 간격 | 연주자 / 출처 / 검수일 |
|---|---|---|---|---|
| 가야금 12현 | 미검수 | 미검수 | 미검수 | 미검수 |
| 거문고 6현 | 미검수 | 미검수 | 미검수 | 미검수 |
| 해금 2현 | 미검수 | 미검수 | 미검수 | 미검수 |

## 로드맵

PHASE 7A~7E의 구현은 포함되었습니다. 다음 검증 대상은 실기기 인수와 국악기 데이터 확정입니다. AudioWorklet 캡처, 스트로브 표시, 폴리포닉 튜닝은 이번 개선 설계의 기본 구현 범위 밖으로 남겨 두었습니다.

단계별 변경·수치·예외는 [구현 기록](docs/implementation.md), 변경 내역은 [CHANGELOG](CHANGELOG.md)를 참고하세요.
