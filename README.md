# 나의 하루 루틴 앱

**Next.js 15** 기반의 개인 맞춤형 하루 루틴 관리 웹앱.  
아침에 일어나면 오늘의 자유시간을 계산하고, 먼저 하고 싶은 일을 고른 뒤 시간표·실행용 영상·현재 시간대 화면을 정리해요.

---

## ✨ 주요 기능

### 📋 메인 페이지 (`/`)

- **하루 시작 플로우** (3단계 질문)
  1. 오늘 수영 갈 거야? → 퇴근 후 자유시간 계산
  2. 업무 언제 시작? (30분 단위 선택)
  3. 재택 / 출근? → 출근 준비 1시간 차감
- **24시간 막대 타임라인** — 업무·수영·자유시간을 색상으로 시각화, 현재 시각 표시
- **자유시간 계산** — 출근 전 / 퇴근(수영) 후 각각 분 단위로 표시
- **하고 싶은 일 선택** — 자유시간 내 가능한 취미를 먼저 고르고 세부 활동을 조정
- **스크립트 기반 시간표 추천** — 선택한 활동과 남은 시간을 로컬 규칙으로 판단해 추천 추가 활동과 시간표 생성
- **Yes/No 시간표 확정** — 추천 시간표를 보고 영상 선택 단계로 이동하거나 다시 선택
- **실행용 영상/BGM 선택 페이지** — 각 활동별 YouTube 영상 1개를 체크박스로 선택
- **최종 확인 플로우** — “이렇게 하시겠습니까?” 확인 후에만 오늘 시간표 저장
- **현재 시간대 메인 화면** — 사이트를 다시 열면 지금 시간에 맞는 활동/영상 또는 업무 중 상태 표시
- **오늘의 기록** — 확정한 활동·시간표·영상 정보를 localStorage에 저장·표시 (자정 초기화)

### ⚙️ 취미 설정 페이지 (`/setup`)

- Copilot SDK AI 채팅으로 취미·할 일·BGM 검색어 수집
- `[태그]` 형식의 클릭 가능한 버튼으로 빠른 선택
- 설정 내용을 localStorage에 저장 → 메인 페이지에서 자동 반영

---

## 🗓️ 하드코딩된 개인 스케줄

| 항목               | 값                |
| ------------------ | ----------------- |
| 수영 O → 업무 종료 | 19:30             |
| 수영 O → 수영 종료 | 21:30             |
| 수영 X → 업무 시간 | 8시간             |
| 출근 준비 시간     | 1시간 (재택 시 0) |
| 자정               | 24:00             |

---

## 🎯 기본 취미 목록

| 취미                    | 고정 시간 | 최소 시간 | BGM/검색어                                      |
| ----------------------- | --------- | --------- | ----------------------------------------------- |
| 🧘 스트레칭             | 10분      | 10분      | daily stretching routine office                 |
| 🎸 기타 연습            | 30분      | 10분      | 60fps 메트로놈                                  |
| 🎨 그림 (드로잉/크로키) | —         | 30분      | 침착맨 라디오, 비주류 초대석, drum and bass     |
| 📚 공부/독서            | —         | 30분      | 빗소리 공부음악, 오케스트라 집중, rain ambience |
| 🎬 영화                 | —         | 90분      | — (위플래쉬, Boys Before Friends)               |
| 📺 드라마               | —         | 30분      | — (Two Broke Girls, OITNB)                      |

---

## 🛠️ 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **런타임**: React 19
- **패키지 매니저**: pnpm
- **AI**: `@github/copilot-sdk` (스트리밍 SSE)
- **외부 API**: YouTube Data API v3
- **저장소**: localStorage (로그인 없음)
- **테스트**: Playwright (E2E)

---

## 🚀 시작하기

```bash
pnpm install
pnpm dev
```

### 환경 변수 (`.env.local`)

```env
YOUTUBE_API_KEY=your_youtube_data_api_v3_key
```

---

## 🏗️ 빌드 & 배포

```bash
pnpm build   # 프로덕션 빌드
pnpm start   # 프로덕션 서버 실행
```

GitHub Actions (`.github/workflows/`)가 `main` 브랜치 푸시 시 자동 배포.

---

## 🧪 테스트

```bash
npx playwright test
```

| 테스트 파일                | 내용                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `tests/main-page.spec.js`  | 하루 시작 플로우 → 활동 선택 → 시간표 확정 → 영상 선택 → 최종 확인 → 현재 시간 화면 |
| `tests/setup-page.spec.js` | 취미 설정 채팅 → 태그 클릭 → localStorage 저장 → 페이지 이동  |

---

## 📁 프로젝트 구조

```
app/
├── app/
│   ├── page.jsx                  # 메인 페이지 (DayStart)
│   ├── setup/page.jsx            # 취미 설정 페이지
│   ├── layout.jsx
│   └── api/
│       ├── youtube/route.js      # YouTube 검색 API
│       ├── routine-chat/route.js # 레거시 AI 루틴 추천 API
│       └── setup-chat/route.js   # AI 취미 설정 채팅 (Copilot SDK)
├── src/
│   ├── DayStart.jsx              # 메인 컴포넌트
│   ├── DayStart.css
│   ├── SetupPage.jsx             # 취미 설정 컴포넌트
│   ├── SetupPage.css
│   ├── defaultHobbies.js         # 기본 취미 데이터 + localStorage 유틸
│   ├── setupFlow.js              # 설정 채팅 흐름 헬퍼
│   └── hooks/useSetupChat.js     # 스트리밍 채팅 훅
├── tests/
│   ├── main-page.spec.js
│   └── setup-page.spec.js
├── playwright.config.js
└── .env.local                    # YOUTUBE_API_KEY
```
