"use client";

import { useState, useCallback } from "react";
import "./DayStart.css";

// ── 하드코딩 상수 ──────────────────────────────────────────
const SWIMMING_WORK_END = { h: 19, m: 30 }; // 수영 O → 퇴근 고정 (19:30)
const SWIMMING_END = { h: 21, m: 30 };      // 수영 종료 (21:30)
const WORK_HOURS = 8;                        // 수영 X → 업무시작 + 8시간
const MIDNIGHT = { h: 24, m: 0 };           // 자정
const COMMUTE_PREP_MIN = 60;                 // 출근 준비 시간 (분)

// 본인 취향 기반 콘텐츠 목록
const HOBBIES = [
  { id: "guitar",      name: "🎸 기타 연습",    query: "기타 연습 레슨",                   minMin: 30 },
  { id: "classic",     name: "🎹 클래식/피아노", query: "잔잔한 클래식 피아노 플레이리스트", minMin: 20 },
  { id: "kpop",        name: "🎵 케이팝",        query: "케이팝 플레이리스트 2024",         minMin: 20 },
  { id: "edm",         name: "⚡ EDM",           query: "drum and bass EDM playlist",      minMin: 20 },
  { id: "chimchakman", name: "📺 침착맨 라디오",  query: "침착맨 라디오",                   minMin: 30 },
  { id: "bijuryu",     name: "🎙️ 비주류 초대석", query: "비주류 초대석",                   minMin: 30 },
];

function toMin(h, m) {
  return h * 60 + m;
}

function formatMin(min) {
  if (min <= 0) return "0분";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function getWorkStartOptions() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = Math.ceil((nowMin + 1) / 30) * 30; // 현재 이후 첫 30분 단위
  const end = toMin(14, 0);
  const opts = [];
  for (let t = start; t <= end; t += 30) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    opts.push({
      value: `${pad(h)}:${pad(m)}`,
      label: `${h}시 ${m === 0 ? "정각" : m + "분"}`,
    });
  }
  return opts;
}

function calcFreeTime(swimming, workStartStr, isRemote) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [wh, wm] = workStartStr.split(":").map(Number);
  const workStartMin = toMin(wh, wm);
  const commute = isRemote ? 0 : COMMUTE_PREP_MIN;

  // 출근 전: 지금 ~ (업무시작 - 출근준비)
  const preEndMin = workStartMin - commute;
  const pre = Math.max(0, preEndMin - nowMin);
  const preEndStr = `${pad(Math.floor(preEndMin / 60))}:${pad(preEndMin % 60)}`;

  // 출근 후: 수영O → 수영끝(21:30)~자정 / 수영X → (업무시작+8h)~자정
  const workEndMin = swimming
    ? toMin(SWIMMING_WORK_END.h, SWIMMING_WORK_END.m)
    : workStartMin + WORK_HOURS * 60;
  const postStartMin = swimming
    ? toMin(SWIMMING_END.h, SWIMMING_END.m)
    : workEndMin;
  const post = Math.max(0, toMin(MIDNIGHT.h, MIDNIGHT.m) - postStartMin);
  const postStartStr = `${pad(Math.floor(postStartMin / 60))}:${pad(postStartMin % 60)}`;

  // 타임라인 세그먼트 (0~1440분 기준)
  const segments = [];
  const TOTAL = 1440;

  // 지나간 시간 (회색)
  if (nowMin > 0) segments.push({ label: "지나간 시간", start: 0, end: nowMin, color: "#e0e0e0", emoji: "" });

  // 출근 전 자유시간
  if (pre > 0) segments.push({ label: "자유시간 ✨", start: nowMin, end: preEndMin, color: "#74b9ff", emoji: "✨" });

  // 출근 준비
  if (commute > 0) segments.push({ label: "출근 준비 🏃", start: preEndMin, end: workStartMin, color: "#ffeaa7", emoji: "🏃" });

  // 업무
  segments.push({ label: "업무 💼", start: workStartMin, end: workEndMin, color: "#fd79a8", emoji: "💼" });

  // 수영
  if (swimming) segments.push({ label: "수영 🏊", start: workEndMin, end: toMin(SWIMMING_END.h, SWIMMING_END.m), color: "#81ecec", emoji: "🏊" });

  // 퇴근 후 자유시간
  if (post > 0) segments.push({ label: "자유시간 ✨", start: postStartMin, end: toMin(MIDNIGHT.h, MIDNIGHT.m), color: "#74b9ff", emoji: "✨" });

  // 틈새 (수면 등 미정)
  const filled = segments.reduce((acc, s) => {
    const e = s.end > TOTAL ? TOTAL : s.end;
    return Math.max(acc, e);
  }, 0);
  if (filled < TOTAL) segments.push({ label: "수면/기타 😴", start: filled, end: TOTAL, color: "#b2bec3", emoji: "😴" });

  return { pre, post, total: pre + post, preEndStr, postStartStr, segments, nowMin };
}

function Timeline({ segments, nowMin }) {
  const TOTAL = 1440;
  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];

  return (
    <div className="ds-timeline">
      {/* 막대 그래프 */}
      <div className="ds-timeline__bar">
        {segments.map((seg, i) => {
          const width = ((Math.min(seg.end, TOTAL) - seg.start) / TOTAL) * 100;
          return (
            <div
              key={i}
              className="ds-timeline__seg"
              style={{ width: `${width}%`, background: seg.color }}
              title={`${seg.label} (${pad(Math.floor(seg.start / 60))}:${pad(seg.start % 60)} ~ ${pad(Math.floor(Math.min(seg.end, TOTAL) / 60))}:${pad(Math.min(seg.end, TOTAL) % 60)})`}
            />
          );
        })}
        {/* 현재 시각 마커 */}
        <div
          className="ds-timeline__now"
          style={{ left: `${(nowMin / TOTAL) * 100}%` }}
          title="지금"
        >
          <div className="ds-timeline__now-line" />
          <div className="ds-timeline__now-label">지금</div>
        </div>
      </div>

      {/* 시간 눈금 */}
      <div className="ds-timeline__ticks">
        {hours.map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {h === 24 ? "자정" : `${h}시`}
          </span>
        ))}
      </div>

      {/* 범례 */}
      <div className="ds-timeline__legend">
        {segments
          .filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i)
          .map((seg, i) => (
            <div key={i} className="ds-timeline__legend-item">
              <span className="ds-timeline__legend-dot" style={{ background: seg.color }} />
              <span>{seg.label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function DayStart() {
  const [step, setStep] = useState(0);
  const [swimming, setSwimming] = useState(null);
  const [workStart, setWorkStart] = useState(null);
  const [isRemote, setIsRemote] = useState(null);
  const [freeTime, setFreeTime] = useState(null);
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [workStartOptions] = useState(() => getWorkStartOptions());

  const handleSwimming = (val) => {
    setSwimming(val);
    setStep(2);
  };
  const handleWorkStart = (val) => {
    setWorkStart(val);
    setStep(3);
  };
  const handleRemote = (val) => {
    setIsRemote(val);
    setFreeTime(calcFreeTime(swimming, workStart, val));
    setStep(4);
  };

  const handleHobbySelect = useCallback(
    async (hobby) => {
      if (selectedHobby?.id === hobby.id) {
        setSelectedHobby(null);
        setVideos([]);
        return;
      }
      setSelectedHobby(hobby);
      setLoadingVideos(true);
      setVideos([]);
      try {
        const res = await fetch(
          `/api/youtube?q=${encodeURIComponent(hobby.query)}&maxResults=4`,
        );
        const data = await res.json();
        setVideos(data.videos || []);
      } catch {
        setVideos([]);
      } finally {
        setLoadingVideos(false);
      }
    },
    [selectedHobby],
  );

  const handleReset = () => {
    setStep(0);
    setSwimming(null);
    setWorkStart(null);
    setIsRemote(null);
    setFreeTime(null);
    setSelectedHobby(null);
    setVideos([]);
  };

  const getRecommended = (availableMin) =>
    HOBBIES.filter((h) => h.minMin <= availableMin);

  return (
    <div className="daystart">
      {/* ── Step 0: 시작 ── */}
      {step === 0 && (
        <div className="ds-welcome">
          <div className="ds-emoji">☀️</div>
          <h1>좋은 아침이에요!</h1>
          <p>오늘 하루를 계획해볼게요</p>
          <button className="ds-btn ds-btn--primary" onClick={() => setStep(1)}>
            하루 시작 🚀
          </button>
        </div>
      )}

      {/* ── Step 1: 수영 ── */}
      {step === 1 && (
        <div className="ds-step">
          <div className="ds-step__question">🏊 오늘 수영 갈 거야?</div>
          <div className="ds-step__sub">
            수영 여부에 따라 퇴근 후 자유시간이 달라져요
          </div>
          <div className="ds-choices">
            <button
              className="ds-choice-btn"
              onClick={() => handleSwimming(true)}
            >
              🏊 응, 갈 거야
            </button>
            <button
              className="ds-choice-btn"
              onClick={() => handleSwimming(false)}
            >
              🛋️ 아니, 안 가
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: 업무 시작 시간 ── */}
      {step === 2 && (
        <div className="ds-step">
          <div className="ds-step__question">⏰ 업무 언제 시작할 거야?</div>
          <div className="ds-step__sub">30분 단위로 선택해줘</div>
          <div className="ds-time-grid">
            {workStartOptions.length > 0 ? (
              workStartOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="ds-time-btn"
                  onClick={() => handleWorkStart(opt.value)}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "0.9rem" }}>
                선택 가능한 시간이 없어요 (14시 이후)
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: 재택 ── */}
      {step === 3 && (
        <div className="ds-step">
          <div className="ds-step__question">🏠 오늘 재택근무야?</div>
          <div className="ds-step__sub">
            출근이면 준비 시간 1시간이 차감돼요
          </div>
          <div className="ds-choices">
            <button
              className="ds-choice-btn"
              onClick={() => handleRemote(true)}
            >
              🏠 응, 재택이야
            </button>
            <button
              className="ds-choice-btn"
              onClick={() => handleRemote(false)}
            >
              🏢 아니, 출근해
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: 결과 ── */}
      {step === 4 && freeTime && (
        <div className="ds-result">
          <div className="ds-result__header">
            <h2>오늘 자유시간 💫</h2>
            <button className="ds-reset-btn" onClick={handleReset}>
              다시 시작
            </button>
          </div>

          {/* 24시간 타임라인 */}
          <Timeline segments={freeTime.segments} nowMin={freeTime.nowMin} />
          <div className="ds-time-cards">
            <div className="ds-time-card ds-time-card--pre">
              <div className="ds-time-card__label">☀️ 출근 전</div>
              <div className="ds-time-card__value">
                {formatMin(freeTime.pre)}
              </div>
              <div className="ds-time-card__detail">
                지금 ~ {freeTime.preEndStr}
              </div>
            </div>
            <div className="ds-time-card ds-time-card--post">
              <div className="ds-time-card__label">
                {swimming ? "🏊 수영 후" : "🌙 퇴근 후"}
              </div>
              <div className="ds-time-card__value">
                {formatMin(freeTime.post)}
              </div>
              <div className="ds-time-card__detail">
                {freeTime.postStartStr} ~ 자정
              </div>
            </div>
            <div className="ds-time-card ds-time-card--total">
              <div className="ds-time-card__label">⏱ 오늘 총 자유시간</div>
              <div className="ds-time-card__value">
                {formatMin(freeTime.total)}
              </div>
            </div>
          </div>

          <div className="ds-hobbies">
            <h3>오늘 뭐 해볼까? 🎯</h3>

            {freeTime.pre > 0 && (
              <div className="ds-hobby-section">
                <div className="ds-hobby-section__title">
                  출근 전 ({formatMin(freeTime.pre)} 있어요)
                </div>
                <div className="ds-hobby-grid">
                  {getRecommended(freeTime.pre).length > 0 ? (
                    getRecommended(freeTime.pre).map((h) => (
                      <button
                        key={`pre-${h.id}`}
                        className={`ds-hobby-btn${selectedHobby?.id === h.id ? " ds-hobby-btn--active" : ""}`}
                        onClick={() => handleHobbySelect(h)}
                      >
                        {h.name}
                      </button>
                    ))
                  ) : (
                    <span className="ds-hobby-empty">
                      시간이 조금 부족해요 😅
                    </span>
                  )}
                </div>
              </div>
            )}

            {freeTime.post > 0 && (
              <div className="ds-hobby-section">
                <div className="ds-hobby-section__title">
                  {swimming ? "수영 후" : "퇴근 후"} ({formatMin(freeTime.post)}{" "}
                  있어요)
                </div>
                <div className="ds-hobby-grid">
                  {getRecommended(freeTime.post).map((h) => (
                    <button
                      key={`post-${h.id}`}
                      className={`ds-hobby-btn${selectedHobby?.id === h.id ? " ds-hobby-btn--active" : ""}`}
                      onClick={() => handleHobbySelect(h)}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedHobby && (
            <div className="ds-videos">
              <h3>{selectedHobby.name} 영상 추천 📺</h3>
              {loadingVideos && (
                <div className="ds-loading">불러오는 중... ⏳</div>
              )}
              {!loadingVideos && videos.length > 0 && (
                <div className="ds-video-grid">
                  {videos.map((v) => (
                    <a
                      key={v.id}
                      href={`https://www.youtube.com/watch?v=${v.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ds-video-card"
                    >
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="ds-video-thumb"
                      />
                      <div className="ds-video-info">
                        <div className="ds-video-title">{v.title}</div>
                        <div className="ds-video-channel">{v.channel}</div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              {!loadingVideos && videos.length === 0 && (
                <div className="ds-loading">영상을 불러올 수 없어요 😢</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
