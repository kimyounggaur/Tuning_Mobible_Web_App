# v2 구현 기록

첨부 설계서의 제품 요구사항을 PHASE 순서로 구현한다. 문서의 대화 예문과 중간 승인 절차는 사용자의 일괄 진행 요청에 따라 생략한다. 검증되지 않은 실기기 결과는 통과로 기록하지 않는다.

## PHASE 1: 오류 재현과 수정

- 1A: 바늘 `view-box` 회전축, 중앙 기준 양/음 아크 위상, 0센트 아크 숨김. 개발 빌드에만 `__gaugeDebug` 노출.
- 1B: 48개 신호의 수정 전 결과 38/48 통과. 고음 10건 모두 한 옥타브 아래로 검출됨. NSDF 초기 로브 탐색을 tau=1로 수정.
- 1C: 권한 오류 1회 처리, 환경별 안내, 기술 정보 접기, 비보안 환경 사전 검사, 제약 조건 완화 1회 재시도.
- 1D: 가로 저높이 2열 배치, 앱 내부 스크롤 폴백. 최종 6개 뷰포트 검증은 E2E에 기록.

| 수치 | 이전 | 이후 | 근거 |
|---|---|---|---|
| 검출 범위 | 25~1100Hz | 동일 | 상한 변경 없음 |
| 경계 보간 오차 허용 | 없음 | 0.05센트 | 44.1kHz/1100Hz에서 1100.003Hz 보간값이 범위 검사에 걸림. 경계 밖 0.05센트 이내만 경계값으로 정규화 |
| 4096 평균 분석 비용 | 10.65ms | 10.30ms | 동일 PC에서 워밍업 10회, 측정 50회. 실행 편차 존재 |

검증 명령: `npm run check:pitch`, `npm run build`.

## PHASE 2: 안전망

`core/note`, `string-match`, `in-tune`을 순수 모듈로 추출했다. 초기 단위 83개와 8개 실제 마이크 파이프라인 E2E가 통과했다. Vitest, ESLint flat config, Playwright WAV 생성 및 GitHub Actions를 추가했다. 최종 테스트 수와 CI 결과는 README와 GitHub 실행 기록에 남긴다.

## PHASE 3~4: 구조와 성능

| 단계 | 변경 파일 | AC 확인 |
|---|---|---|
| 3A | `main.js`, `app/*`, `core/*` | main 54줄, 모든 app 모듈 300줄 미만, DOM 없는 피치 처리 테스트 11개 |
| 3B | `view-model`, `render-loop`, `render`, `ui/*` | rAF 한 곳, 음 전환 시 카드 재생성 0회, SR 요약 최대 1Hz, 무음/잡음 별도 디바운스 |
| 3C | `audio/context`, `pitch-engine`, `tone-player` | 20회 시작/정지 후 AudioContext 1개 |
| 3D | `config.js` | 음정 판정 임계값 통합, 개발용 읽기 전용 `__config` |
| 4A | `detect-pitch`, `pitch-engine`, `session`, `pitch-check` | 54개 정확도 통과, 기타/바이올린/베이스 연산 예산 통과, 전환 시 마이크 재요청 0 |
| 4B | `pitch-worker`, `pitch-engine` | Transferable 확인, 평균 왕복 3.19ms, 워커 없는 E2E 통과, CPU 4배 30초 롱태스크 0 |
| 4C | `session`, `pitch-engine` | 8개 상태 전이 테스트 및 track ended E2E 통과. 실제 iOS·전화 복귀는 미확인 |

주파수 입력 배열은 검출 함수 안에서 변경하지 않는다. DC 제거와 NSDF 분모는 합 항등식으로 처리하며 신호 버퍼를 프레임마다 새로 할당하지 않는다. Worker 메시지와 결과 객체의 브라우저 구조화 복제 비용은 존재한다.

## PHASE 5~6: 사용성과 PWA

| 단계 | 변경 파일 | AC 확인 |
|---|---|---|
| 5A | HTML, `render`, `session`, CSS | 정지/재시작·레벨·클리핑·크로매틱 시작 전 빈 표시·완주 초기화·확인음 제외 구간 |
| 5B | `ui/dialog`, `render`, `strings-panel`, CSS | 6개 뷰포트, 다크/라이트 axe, 포커스 이동·트랩·복귀, Escape, 탭/라디오 화살표 키 |
| 5C | `settings`, `actions`, `render` | v1 설정 마이그레이션, 마지막 첼로/수동 3번현/A4 복원 E2E |
| 6A | `pwa`, `sw.js`, `vite.config.js` | 2개 SW 리비전 대기/알림/적용/기존 캐시 삭제, 미캐시 URL 오프라인 마이크 튜닝 E2E |
| 6B | manifest, icons, screenshots, `vercel.json` | 설치 메타데이터·빌드 버전·헤더 구성. 실제 기기 설치 UI는 미확인 |
| 6C | `lighthouse.mjs`, QA 문서 | Lighthouse 모바일 100/100/100/100. 실기기 체크는 README의 미확인 표 |

첫 Lighthouse에서 현 카드의 사용자 지정 접근성 이름과 보이는 음명·주파수 사이의 불일치를 발견했다. 버튼의 보이는 내용을 그대로 접근성 이름으로 사용하도록 수정했다. `robots.txt`도 추가했다. Windows에서 Lighthouse 임시 프로필 정리가 실패하던 것은 QA 전용 프로필 경로로 수정했다.

## PHASE 7: 확장

| 단계 | 변경 파일 | AC 확인 |
|---|---|---|
| 7A | `presets`, `custom-tunings`, `custom-editor` | 문서의 MIDI 값 유지, 저장/복원/삭제·7현·저음 판정 테스트 |
| 7B | `core/trace`, `ui/pitch-trace`, 피치/렌더 연결 | 120개 링버퍼, 3초/56px, +20센트 캔버스 픽셀 검증, 데스크톱 그리기 최고 0.20ms |
| 7C | `tone-player`, 현 버튼 | 500ms 길게 눌러 드론, 20ms 램프, -12dBFS 이하, 비브라토와 자기 주파수 제외 실험 옵션 |
| 7D | `i18n/*`, HTML, CSS, `i18n-check` | 언어 키/인자 검사, English 화면 한국어 잔여 0, 일본어 전환, 테마 복원, 라이트 대비 기준 통과 |
| 7E | `presets`, 청 선택 UI | 임시 데이터 배지, 상대 청 변경 후 전 현 재계산, 12현 패널 내부 스크롤 |

## 명시적으로 해소한 충돌

| 설계 항목 | 구현 결정과 이유 |
|---|---|
| 매 단계 승인·새 세션 대기 | 사용자 요청에 따라 확인 질문 없이 연속 진행. `codex/v2-improvements`에서 누적 검증 후 main 반영 |
| 바늘 ±64도와 반원 ±50 눈금 | ±90도로 맞춰 반원의 실제 양 끝을 가리키도록 함. 순수 게이지 테스트와 실제 SVG 회전축 좌표 검사 |
| `<65Hz` 자동 저음 판정과 첼로 기존 true | 명시된 65Hz 규칙 사용. C2=65.41Hz이므로 기본 첼로는 일반 경로, 정확도 유지 |
| 새 SW 자동 skipWaiting 금지와 업데이트 UI 없는 v1 | v2부터 사용자 선택 후 적용. v1 캐시가 있을 때만 제어권을 넘기며 강제 페이지 리로드는 하지 않음 |
| 완주 배너 유지와 6초 자동 닫기 | 6초 표시하며 그동안 초기화 버튼 제공 |
| 12현과 48px 타깃/한 화면 | 앱 전체 대신 현 목록 내부만 스크롤, 게이지·조현 선택은 유지 |
| 국악기 표준 데이터 부재 | 구조 예시만 제공하고 source/TODO/임시 배지 유지. 검수 전 확정값처럼 표기하지 않음 |
| 버전 1.1/1.2 중간 태그 | 개발 마일스톤으로 CHANGELOG에 구분. 별도 배포한 태그인 것처럼 기록하지 않음 |

## PHASE 8: 릴리스

버전을 2.0.0으로 변경하고 README/CHANGELOG를 실측 결과로 작성했다. 최종 명령은 `npm run lint`, `npm test`, `npm run gen:wav`, `npm run build`, `npm run test:e2e`, `npm audit`이다. 실제 휴대기기, 스크린리더, 발열, 음질, 생활소음, 국악기 데이터 검수는 미확인으로 남긴다. 세부 원인과 후속 확인 방법은 README에 기재했다.
