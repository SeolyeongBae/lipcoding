"use client";

import { useState, useRef, useEffect } from "react";
import { DEFAULT_HOBBIES, HOBBIES_STORAGE_KEY, hydrateHobbies } from "./defaultHobbies";
import "./DayStart.css";

const TODAY_LOG_KEY = "todayLog";

const DEFAULT_WORK_END = { h: 19, m: 30 };
const LATEST_WORK_END = { h: 22, m: 0 };
const SWIMMING_END = { h: 21, m: 30 };
const MIDNIGHT = { h: 24, m: 0 };
const COMMUTE_PREP_MIN = 60;

function toRoutineHobby(hobby) {
  return {
    ...hobby,
    queries: hobby.bgmQueries ?? [],
    showVideos: Boolean(hobby.showVideos && (hobby.bgmQueries?.length ?? 0) > 0),
  };
}

function loadRoutineHobbies() {
  if (typeof window === "undefined") {
    return DEFAULT_HOBBIES.map(toRoutineHobby);
  }

  return hydrateHobbies(window.localStorage.getItem(HOBBIES_STORAGE_KEY)).map(toRoutineHobby);
}

function toMin(h, m) { return h * 60 + m; }

function formatMin(min) {
  if (min <= 0) return "0분";
  const h = Math.floor(min / 60), m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function pad(n) { return String(n).padStart(2, "0"); }

function formatViewCount(count) {
  if (count === null || count === undefined) return null;
  const n = Number(count);
  if (isNaN(n)) return null;
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억회`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만회`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천회`;
  return `${n}회`;
}

function formatPublishedAt(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const diffDays = Math.floor((new Date() - date) / 86400000);
  if (diffDays < 1) return "오늘";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
  return `${Math.floor(diffDays / 365)}년 전`;
}

function formatTimeLabel(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}시 ${m === 0 ? "정각" : `${m}분`}`;
}

function getWorkEndOptions() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = Math.ceil((nowMin + 1) / 30) * 30;
  const defaultEnd = toMin(DEFAULT_WORK_END.h, DEFAULT_WORK_END.m);
  const end = toMin(LATEST_WORK_END.h, LATEST_WORK_END.m);
  const opts = [];

  for (let t = Math.min(start, defaultEnd); t <= end; t += 30) {
    if (t <= nowMin) continue;
    const h = Math.floor(t / 60);
    const m = t % 60;
    opts.push({
      value: `${pad(h)}:${pad(m)}`,
      label: t === defaultEnd ? `${formatTimeLabel(t)} 보통 마무리` : formatTimeLabel(t),
    });
  }

  return opts;
}

function calcFreeTime(swimming, workEndStr, isRemote) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [wh, wm] = workEndStr.split(":").map(Number);
  const workEndMin = toMin(wh, wm);
  const commuteAfterWork = isRemote ? 0 : COMMUTE_PREP_MIN;
  const pre = 0;
  const preEndStr = `${pad(Math.floor(nowMin / 60))}:${pad(nowMin % 60)}`;
  const swimmingEndMin = toMin(SWIMMING_END.h, SWIMMING_END.m);
  const postStartMin = swimming
    ? Math.max(workEndMin, swimmingEndMin)
    : workEndMin + commuteAfterWork;
  const post = Math.max(0, toMin(MIDNIGHT.h, MIDNIGHT.m) - postStartMin);
  const postStartStr = `${pad(Math.floor(postStartMin / 60))}:${pad(postStartMin % 60)}`;
  const TOTAL = 1440;
  const segments = [];
  if (nowMin > 0) segments.push({ label: "지나간 시간", start: 0, end: nowMin, color: "#e0e0e0" });
  segments.push({ label: "업무 💼", start: nowMin, end: Math.max(nowMin, workEndMin), color: "#fd79a8" });
  if (!isRemote && !swimming) segments.push({ label: "퇴근/정리 🏃", start: workEndMin, end: postStartMin, color: "#ffeaa7" });
  if (swimming && workEndMin < swimmingEndMin) segments.push({ label: "수영 🏊", start: workEndMin, end: swimmingEndMin, color: "#81ecec" });
  if (post > 0) segments.push({ label: "자유시간 ✨", start: postStartMin, end: toMin(MIDNIGHT.h, MIDNIGHT.m), color: "#74b9ff" });
  const filled = segments.reduce((acc, s) => Math.max(acc, Math.min(s.end, TOTAL)), 0);
  if (filled < TOTAL) segments.push({ label: "수면/기타 😴", start: filled, end: TOTAL, color: "#b2bec3" });
  return { pre, post, total: pre + post, preEndStr, postStartStr, segments, nowMin };
}

function Timeline({ segments, nowMin }) {
  const TOTAL = 1440;
  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  return (
    <div className="ds-timeline">
      <div className="ds-timeline__bar">
        {segments.map((seg, i) => (
          <div key={i} className="ds-timeline__seg"
            style={{ width: `${((Math.min(seg.end, TOTAL) - seg.start) / TOTAL) * 100}%`, background: seg.color }}
            title={seg.label}
          />
        ))}
        <div className="ds-timeline__now" style={{ left: `${(nowMin / TOTAL) * 100}%` }}>
          <div className="ds-timeline__now-line" />
          <div className="ds-timeline__now-label">지금</div>
        </div>
      </div>
      <div className="ds-timeline__ticks">
        {hours.map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>{h === 24 ? "자정" : `${h}시`}</span>
        ))}
      </div>
      <div className="ds-timeline__legend">
        {segments.filter((s, i, arr) => arr.findIndex((x) => x.label === s.label) === i).map((seg, i) => (
          <div key={i} className="ds-timeline__legend-item">
            <span className="ds-timeline__legend-dot" style={{ background: seg.color }} />
            <span>{seg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadTodayLog() {
  if (typeof window === "undefined") return { date: getTodayStr(), entries: [] };
  try {
    const stored = JSON.parse(window.localStorage.getItem(TODAY_LOG_KEY) || "null");
    if (stored && stored.date === getTodayStr()) return stored;
  } catch {}
  return { date: getTodayStr(), entries: [] };
}

function saveTodayLog(log) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TODAY_LOG_KEY, JSON.stringify(log));
  }
}

export default function DayStart() {
  const [step, setStep] = useState(0);
  const [hobbies, setHobbies] = useState(() => DEFAULT_HOBBIES.map(toRoutineHobby));
  const [swimming, setSwimming] = useState(null);
  const [workEnd, setWorkEnd] = useState(null);
  const [isRemote, setIsRemote] = useState(null);
  const [freeTime, setFreeTime] = useState(null);
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);
  const [aiRec, setAiRec] = useState({ text: "", loading: false });
  const [modalState, setModalState] = useState(null);
  const [todayLog, setTodayLog] = useState(() => loadTodayLog());
  const workEndOptions = getWorkEndOptions();

  const hobbyPanelRef = useRef(null);
  const logRef = useRef(null);

  useEffect(() => {
    setHobbies(loadRoutineHobbies());
    setTodayLog(loadTodayLog());
  }, []);

  useEffect(() => {
    if (selectedHobby && hobbyPanelRef.current) {
      setTimeout(() => {
        hobbyPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [selectedHobby?.id]);

  async function fetchVideos(query) {
    setActiveQuery(query);
    setLoadingVideos(true);
    setVideos([]);
    try {
      const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}&maxResults=4`);
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }

  async function fetchAiRec(ft, sw, finishTime, remote, hobbyList) {
    setAiRec({ text: "", loading: true });
    const hobbyNames = hobbyList.map((h) => h.name).join(", ");
    const message = `업무 마무리: ${finishTime}. 자유시간: 업무 전 ${formatMin(ft.pre)}, 업무 후 ${formatMin(ft.post)}. 취미: ${hobbyNames}. 오늘 루틴 추천해줘.`;
    const context = { preMin: ft.pre, postMin: ft.post, workEnd: finishTime, remote, swimming: sw, hobbies: hobbyList };
    try {
      const res = await fetch("/api/routine-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let rec = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.type === "delta") { rec += evt.content; setAiRec({ text: rec, loading: false }); }
            else if (evt.type === "done") { setAiRec({ text: rec, loading: false }); }
          } catch {}
        }
      }
    } catch {
      setAiRec({ text: "", loading: false });
    }
  }

  const handleSwimming = (val) => { setSwimming(val); setStep(2); };
  const handleWorkEnd = (val) => { setWorkEnd(val); setStep(3); };
  const handleRemote = (val) => {
    setIsRemote(val);
    const ft = calcFreeTime(swimming, workEnd, val);
    setFreeTime(ft);
    setStep(4);
    fetchAiRec(ft, swimming, workEnd, val, hobbies);
  };

  function handleHobbySelect(hobby) {
    if (selectedHobby?.id === hobby.id) {
      setSelectedHobby(null);
      setVideos([]);
      setActiveQuery(null);
      return;
    }
    setSelectedHobby(hobby);
    if (hobby.showVideos && hobby.queries.length > 0) {
      fetchVideos(hobby.queries[0]);
    } else {
      setVideos([]);
      setActiveQuery(null);
    }
  }

  function handleVideoSelect(video) {
    setModalState({ video, hobby: selectedHobby });
  }

  function handleStartVideo() {
    if (!modalState) return;
    const { video, hobby } = modalState;
    const entry = {
      hobbyId: hobby.id,
      videoId: video.id,
      videoTitle: video.title,
      videoUrl: video.url,
      watchedAt: new Date().toISOString(),
    };
    const newLog = { ...todayLog, entries: [...todayLog.entries, entry] };
    setTodayLog(newLog);
    saveTodayLog(newLog);
    setModalState(null);
    setTimeout(() => { logRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
  }

  const handleReset = () => {
    setStep(0); setSwimming(null); setWorkEnd(null); setIsRemote(null);
    setFreeTime(null); setSelectedHobby(null); setVideos([]); setActiveQuery(null);
    setAiRec({ text: "", loading: false }); setModalState(null);
  };

  const getRecommended = (availableMin) => hobbies.filter((hobby) => hobby.minMin <= availableMin);

  return (
    <div className={`daystart${step === 4 ? " daystart--result" : ""}`}>
      {/* Video selection modal */}
      {modalState && (
        <div
          role="dialog"
          aria-label={`${modalState.hobby.name} 영상 시작`}
          className="ds-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setModalState(null)}
        >
          <div className="ds-modal">
            <button className="ds-modal__close" onClick={() => setModalState(null)}>×</button>
            <h2 className="ds-modal__title">🎬 {modalState.hobby.name}</h2>
            <p className="ds-modal__video-title">{modalState.video.title}</p>
            {modalState.video.thumbnail && (
              <img src={modalState.video.thumbnail} alt={modalState.video.title} className="ds-modal__thumb" />
            )}
            <div className="ds-modal__actions">
              <button className="ds-btn ds-btn--primary" onClick={handleStartVideo}>
                ✓ 시작하기
              </button>
              <a
                href={modalState.video.url || `https://www.youtube.com/watch?v=${modalState.video.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ds-modal__youtube-link"
              >
                ▶ YouTube에서 보기
              </a>
            </div>
          </div>
        </div>
      )}

      {step === 0 && (
        <div className="ds-welcome">
          <div className="ds-emoji">☀️</div>
          <h1>좋은 아침이에요!</h1>
          <p>오늘 하루를 계획해볼게요</p>
          <a className="ds-page-header__link" href="/setup">⚙️ 취미 설정</a>
          <button className="ds-btn ds-btn--primary" onClick={() => setStep(1)}>하루 시작 🚀</button>
        </div>
      )}

      {step === 1 && (
        <div className="ds-step">
          <div className="ds-step__question">🏊 오늘 수영 갈 거야?</div>
          <div className="ds-step__sub">수영 여부에 따라 업무 후 자유시간이 달라져요</div>
          <div className="ds-choices">
            <button className="ds-choice-btn" onClick={() => handleSwimming(true)}>🏊 응, 갈 거야</button>
            <button className="ds-choice-btn" onClick={() => handleSwimming(false)}>🛋️ 아니, 안 가</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="ds-step">
          <div className="ds-step__question">⏰ 업무 언제 마무리할 거야?</div>
          <div className="ds-step__sub">보통은 19시 30분, 늦으면 22시까지 고를 수 있어요</div>
          <div className="ds-time-grid">
            {workEndOptions.length > 0 ? (
              workEndOptions.map((opt) => (
                <button key={opt.value} className="ds-time-btn" onClick={() => handleWorkEnd(opt.value)}>{opt.label}</button>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "0.9rem" }}>오늘은 22시 이후라 남은 업무 마무리 선택지가 없어요</p>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="ds-step">
          <div className="ds-step__question">🏠 오늘 재택근무야?</div>
          <div className="ds-step__sub">출근이면 준비 시간 1시간이 차감돼요</div>
          <div className="ds-choices">
            <button className="ds-choice-btn" onClick={() => handleRemote(true)}>🏠 응, 재택이야</button>
            <button className="ds-choice-btn" onClick={() => handleRemote(false)}>🏢 아니, 출근해</button>
          </div>
        </div>
      )}

      {step === 4 && freeTime && (
        <div className="ds-result">
          <div className="ds-result__header">
            <h2>오늘 자유시간 💫</h2>
            <button className="ds-reset-btn" onClick={handleReset}>다시 시작</button>
          </div>

          <Timeline segments={freeTime.segments} nowMin={freeTime.nowMin} />

          <div className="ds-time-cards">
            <div className="ds-time-card ds-time-card--pre">
              <div className="ds-time-card__label">☀️ 업무 전</div>
              <div className="ds-time-card__value">{formatMin(freeTime.pre)}</div>
              <div className="ds-time-card__detail">지금 ~ {freeTime.preEndStr}</div>
            </div>
            <div className="ds-time-card ds-time-card--post">
              <div className="ds-time-card__label">{swimming ? "🏊 수영 후" : isRemote ? "🌙 업무 후" : "🌙 퇴근 후"}</div>
              <div className="ds-time-card__value">{formatMin(freeTime.post)}</div>
              <div className="ds-time-card__detail">{freeTime.postStartStr} ~ 자정</div>
            </div>
            <div className="ds-time-card ds-time-card--total">
              <div className="ds-time-card__label">⏱ 오늘 총 자유시간</div>
              <div className="ds-time-card__value">{formatMin(freeTime.total)}</div>
            </div>
          </div>

          {/* AI 루틴 추천 */}
          {(aiRec.loading || aiRec.text) && (
            <div className="ds-ai-rec">
              <h3>AI 루틴 추천 ✨</h3>
              {aiRec.loading && !aiRec.text && <div className="ds-loading">추천 생성 중... 🤔</div>}
              {aiRec.text && <p className="ds-ai-rec__text">{aiRec.text}</p>}
            </div>
          )}

          {/* 취미 선택 버튼 */}
          <div className="ds-hobbies">
            <h3>오늘 뭐 해볼까? 🎯</h3>

            {freeTime.pre > 0 && (
              <div className="ds-hobby-section">
                <div className="ds-hobby-section__title">업무 전 ({formatMin(freeTime.pre)} 있어요)</div>
                <div className="ds-hobby-grid">
                  {getRecommended(freeTime.pre).length > 0 ? (
                    getRecommended(freeTime.pre).map((h) => (
                      <button
                        key={`pre-${h.id}`}
                        className={`ds-hobby-btn${selectedHobby?.id === h.id ? " ds-hobby-btn--active" : ""}`}
                        onClick={() => handleHobbySelect(h)}
                      >
                        <span>{h.name}</span>
                        <span className="ds-hobby-btn__meta">{h.fixedMin ? `${h.fixedMin}분` : `${h.minMin}분+`}</span>
                      </button>
                    ))
                  ) : (
                    <span className="ds-hobby-empty">시간이 조금 부족해요 😅</span>
                  )}
                </div>
              </div>
            )}

            {freeTime.post > 0 && (
              <div className="ds-hobby-section">
                <div className="ds-hobby-section__title">
                  {swimming ? "수영 후" : isRemote ? "업무 후" : "퇴근 후"} ({formatMin(freeTime.post)} 있어요)
                </div>
                <div className="ds-hobby-grid">
                  {getRecommended(freeTime.post).map((h) => (
                    <button
                      key={`post-${h.id}`}
                      className={`ds-hobby-btn${selectedHobby?.id === h.id ? " ds-hobby-btn--active" : ""}`}
                      onClick={() => handleHobbySelect(h)}
                    >
                      <span>{h.name}</span>
                      <span className="ds-hobby-btn__meta">{h.fixedMin ? `${h.fixedMin}분` : `${h.minMin}분+`}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 취미 상세 패널 */}
          {selectedHobby && (
            <div className="ds-hobby-panel" ref={hobbyPanelRef}>
              <div className="ds-hobby-panel__header">
                <h3>{selectedHobby.name}</h3>
                {selectedHobby.note && <div className="ds-hobby-panel__note">📝 {selectedHobby.note}</div>}
              </div>

              <div className="ds-hobby-panel__tasks">
                <div className="ds-hobby-panel__tasks-title">이번에 해볼 것</div>
                <ul className="ds-task-list">
                  {selectedHobby.tasks.map((task) => (
                    <li key={task} className="ds-task-item">• {task}</li>
                  ))}
                </ul>
              </div>

              {selectedHobby.showVideos && (
                <div className="ds-hobby-panel__videos">
                  <div className="ds-hobby-panel__videos-title">📺 BGM / 참고 영상</div>

                  {selectedHobby.queries.length >= 1 && (
                    <div className="ds-videos__tabs">
                      {selectedHobby.queries.map((q, i) => (
                        <button
                          key={i}
                          className={`ds-videos__tab${activeQuery === q ? " ds-videos__tab--active" : ""}`}
                          onClick={() => fetchVideos(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}

                  {loadingVideos && <div className="ds-loading">불러오는 중... ⏳</div>}

                  {!loadingVideos && videos.length > 0 && (
                    <div className="ds-video-grid">
                      {videos.map((v) => {
                        const viewStr = formatViewCount(v.viewCount);
                        const dateStr = formatPublishedAt(v.publishedAt);
                        return (
                          <button
                            key={v.id}
                            className="ds-video-card"
                            onClick={() => handleVideoSelect(v)}
                          >
                            {v.thumbnail && (
                              <img src={v.thumbnail} alt={v.title} className="ds-video-thumb" />
                            )}
                            <div className="ds-video-info">
                              <div className="ds-video-title">{v.title}</div>
                              <div className="ds-video-channel">{v.channel}</div>
                              {(viewStr || dateStr) && (
                                <div className="ds-video-meta">
                                  {viewStr && <span className="ds-video-views">👁 {viewStr}</span>}
                                  {dateStr && <span className="ds-video-date">📅 {dateStr}</span>}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {!loadingVideos && videos.length === 0 && (
                    <div className="ds-loading">영상을 불러올 수 없어요 😢</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 오늘의 기록 */}
          <div className="ds-today-log" data-testid="today-log" ref={logRef}>
            <h3>오늘의 기록 📝</h3>
            {todayLog.entries.length === 0 ? (
              <p className="ds-today-log__empty">아직 기록이 없어요. 영상을 선택해 시작해봐요!</p>
            ) : (
              <ul className="ds-today-log__list">
                {todayLog.entries.map((entry, i) => {
                  const hobby = hobbies.find((h) => h.id === entry.hobbyId);
                  return (
                    <li key={i} className="ds-today-log__item">
                      <span className="ds-today-log__hobby">{hobby?.name ?? entry.hobbyId}</span>
                      <span className="ds-today-log__video">{entry.videoTitle}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
