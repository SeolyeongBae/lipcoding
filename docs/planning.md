# 🎬 RoutineTube — 기획 문서

> 하루 루틴에 맞는 유튜브 영상을 AI가 큐레이션하여, 영상 종료를 자연스러운 루틴 타이머로 활용하는 생산성 웹앱

---

## 💡 핵심 컨셉

사용자가 기타 연습 시 "30분 메트로놈 영상이 끝날 때까지" 집중하는 경험에서 출발.
→ **"영상 끝 = 루틴 끝"** 이라는 자연스러운 타이머 + 집중 앵커 효과

---

## 🎯 타겟 사용자

- 하루 루틴을 가지고 있지만 매번 유튜브를 직접 검색하는 게 번거로운 사람
- 운동, 스트레칭, 영어 공부, 악기 연습 등 영상과 함께 하는 활동이 있는 사람

---

## 📋 기본 루틴 (하드코딩 → 이후 사용자 입력으로 확장)

| 루틴 ID      | 이름      | 예시 시간 | 기본 길이 |
| ------------ | --------- | --------- | --------- |
| `stretching` | 스트레칭  | 07:00     | 7분       |
| `english`    | 영어 연습 | 07:10     | 6분       |
| `guitar`     | 기타 연습 | 21:00     | 30분      |

---

## 👣 유저 워크플로우

```
1. 첫 진입
   계정 생성 (데모: 식물 계정 1개 하드코딩)
        ↓
2. 루틴 세팅 (최초 1회)
   활동명 + 시간대 + 난이도(상/중/하) 입력
        ↓
3. 매일 아침 (루틴 시작 전)
   AI(Copilot SDK)가 루틴별 YouTube 영상 3개씩 큐레이션
   - 🔥 오늘의 추천 (댓글 반응 최고)
   - 🆕 새로운 시도 (다른 채널/스타일)
   - ⭐ 내 즐겨찾기 (저장된 영상 중 1개)
        ↓
4. 루틴 시작 버튼
   3개 카드 제시 (썸네일 + 왜 좋은지 한줄) → 사용자 선택 → 재생
        ↓
5. 완료 후
   👍 좋았다 저장 or 넘김
        ↓
6. 하루 끝 리뷰
   오늘 시청한 영상 목록을 하나의 URL 플레이리스트로 정리
```

---

## 🃏 영상 카드 UI 구조

```
┌─────────────────────────────────┐
│  🔥 오늘의 추천                  │
│  [썸네일]                        │
│  제목: "Morning Stretching..."   │
│  난이도: 중                      │
│  ✨ 추천 이유:                   │
│  "댓글 2천개 중 80%가 효과 언급" │
│  [선택하기]                      │
└─────────────────────────────────┘
```

---

## 📐 데이터 구조

### 루틴 정의

```json
{
  "routines": [
    {
      "id": "stretching",
      "label": "스트레칭",
      "keyword": "morning stretching routine",
      "duration_min": 7,
      "difficulty": "중",
      "scheduledAt": "07:00"
    },
    {
      "id": "english",
      "label": "영어 연습",
      "keyword": "BBC 6 minute english",
      "duration_min": 6,
      "difficulty": "하",
      "scheduledAt": "07:10"
    },
    {
      "id": "guitar",
      "label": "기타 연습",
      "keyword": "guitar practice metronome 30 minutes",
      "duration_min": 30,
      "difficulty": "상",
      "scheduledAt": "21:00"
    }
  ]
}
```

### 일일 세션 기록

```json
{
  "date": "2026-06-20",
  "sessions": [
    {
      "routineId": "guitar",
      "difficulty": "중",
      "candidates": ["videoId_A", "videoId_B", "videoId_C"],
      "selected": "videoId_B",
      "liked": true
    }
  ]
}
```

---

## 🔧 기술 스택 및 아키텍처

| 레이어      | 기술                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| 프레임워크  | Next.js (App Router)                                                      |
| AI 큐레이션 | **GitHub Copilot SDK** — 키워드+난이도 기반 검색 쿼리 생성, 댓글 분석     |
| 영상 검색   | YouTube Data API v3 (`search.list`, `videos.list`, `commentThreads.list`) |
| 알림        | Service Worker + Push API                                                 |
| 저장소      | LocalStorage (데모) → DB 확장 예정                                        |
| 배포        | Vercel / Azure Static Web App                                             |

### YouTube API 호출 흐름

```
Copilot SDK
  → 루틴 키워드 + 난이도 → 최적 검색 쿼리 생성
        ↓
YouTube Data API v3
  search.list (키워드, 영상 길이 필터)
        ↓
videos.list (조회수, 좋아요 수, 댓글 수)
        ↓
commentThreads.list (상위 댓글 샘플링 → 효과 언급 분석)
        ↓
3개 후보 카드 + 추천 이유 반환
```

---

## 💰 YouTube API 할당량

| 항목              | 내용                             |
| ----------------- | -------------------------------- |
| 무료 할당량       | 하루 **10,000 유닛**             |
| search 1회 비용   | **100 유닛**                     |
| 데모 가용 검색 수 | ~100회/일 → 충분                 |
| API 키 위치       | `.env.local` → `YOUTUBE_API_KEY` |

---

## ✅ MVP 체크리스트

- [ ] 루틴 3개 하드코딩 (스트레칭, 영어, 기타)
- [ ] 난이도(상/중/하) 기반 YouTube 검색 쿼리 생성 (Copilot SDK)
- [ ] 루틴별 영상 3개 후보 카드 UI
- [ ] 카드 선택 → YouTube 재생
- [ ] 👍 좋아요 저장 (LocalStorage)
- [ ] 하루 시청 영상 리뷰 페이지 (URL 목록)
- [ ] Service Worker 알림 (루틴 시작 시간)

---

## 🚀 향후 확장

- 사용자 커스텀 루틴 입력
- Azure OpenAI 기반 개인화 추천 강화
- 주간 통계 (완료율, 즐겨찾기 분석)
- 점진적 난이도 조절 (주차별 BPM 상승 등)
