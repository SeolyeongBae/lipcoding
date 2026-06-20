"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import "./DayStart.css";

const SWIMMING_WORK_END = { h: 19, m: 30 };
const SWIMMING_END = { h: 21, m: 30 };
const WORK_HOURS = 8;
const MIDNIGHT = { h: 24, m: 0 };
const COMMUTE_PREP_MIN = 60;

const HOBBIES = [
  {
    id: "stretching",
    name: "🧘 스트레칭 / 명상",
    queries: ["허벅지 골반 어깨 스트레칭 데일리", "daily office stretching routine"],
    minMin: 10,
    fixedMin: 10,
    note: "딱 10분",
    showVideos: true, // 따라할 영상 필요
    tasks: ["허벅지 / 골반 스트레칭", "어깨 스트레칭", "명상 3분"],
  },
  {
    id: "guitar",
    name: "🎸 기타 연습",
    queries: ["60fps 메트로놈"],
    minMin: 10,
    fixedMin: 30,
    note: "최대 30분 / 크로매틱 연습",
    showVideos: false, // 정해진 메트로놈 영상 사용
    tasks: ["크로매틱 연습 15분", "목표 곡 연습 15분", "코드 전환 연습"],
  },
  {
    id: "drawing",
    name: "🎨 그림 (드로잉 / 크로키)",
    queries: ["침착맨 라디오", "비주류 초대석", "drum and bass playlist"],
    minMin: 30,
    fixedMin: null,
    note: "아이패드 드로잉 or 크로키 / BGM 틀어놓고",
    showVideos: true, // BGM 영상 필요
    tasks: ["아이패드 드로잉 30분", "크로키 5장", "레퍼런스 수집"],
  },
  {
    id: "study",
    name: "📚 공부 / 독서",
    queries: ["빗소리 공부 음악 가사없음", "오케스트라 집중 공부 음악", "rain ambience study music no lyrics"],
    minMin: 30,
    fixedMin: null,
    note: "프로그래머의 뇌 · SW엔지니어링 가이드북 · 쿠버네티스",
    showVideos: true, // 집중 BGM 필요
    tasks: ["프로그래머의 뇌 30분 읽기", "노트 정리하기", "쿠버네티스 1장 공부", "SW엔지니어링 가이드북 읽기"],
  },
  {
    id: "movie",
    name: "🎬 영화",
    queries: [],
    minMin: 90,
    fixedMin: null,
    note: "위플래쉬 · Boys Before Friends",
    showVideos: false, // 이미 정해진 영화 시청
    tasks: ["위플래쉬 보기", "Boys Before Friends 보기"],
  },
  {
    id: "drama",
    name: "📺 드라마",
    queries: [],
    minMin: 30,
    fixedMin: null,
    note: "Two Broke Girls · OITNB",
    showVideos: false, // 이미 정해진 드라마 시청
    tasks: ["Two Broke Girls 1화 보기", "OITNB 이어보기"],
  },
];

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

function getWorkStartOptions() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = Math.ceil((nowMin + 1) / 30) * 30;
  const end = toMin(14, 0);
  const opts = [];
  for (let t = start; t <= end; t += 30) {
    const h = Math.floor(t / 60), m = t % 60;
    opts.push({ value: `${pad(h)}:${pad(m)}`, label: `${h}시 ${m === 0 ? "정각" : m + "분"}` });
  }
  return opts;
}

function calcFreeTime(swimming, workStartStr, isRemote) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [wh, wm] = workStartStr.split(":").map(Number);
  const workStartMin = toMin(wh, wm);
  const commute = isRemote ? 0 : COMMUTE_PREP_MIN;
  const preEndMin = workStartMin - commute;
  const pre = Math.max(0, preEndMin - nowMin);
  const preEndStr = `${pad(Math.floor(preEndMin / 60))}:${pad(preEndMin % 60)}`;
  const workEndMin = swimming ? toMin(SWIMMING_WORK_END.h, SWIMMING_WORK_END.m) : workStartMin + WORK_HOURS * 60;
  const postStartMin = swimming ? toMin(SWIMMING_END.h, SWIMMING_END.m) : workEndMin;
  const post = Math.max(0, toMin(MIDNIGHT.h, MIDNIGHT.m) - postStartMin);
  const postStartStr = `${pad(Math.floor(postStartMin / 60))}:${pad(postStartMin % 60)}`;
  const TOTAL = 1440;
  const segments = [];
  if (nowMin > 0) segments.push({ label: "지나간 시간", start: 0, end: nowMin, color: "#e0e0e0" });
  if (pre > 0) segments.push({ label: "자유시간 ✨", start: nowMin, end: preEndMin, color: "#74b9ff" });
  if (commute > 0) segments.push({ label: "출근 준비 🏃", start: preEndMin, end: workStartMin, color: "#ffeaa7" });
  segments.push({ label: "업무 💼", start: workStartMin, end: workEndMin, color: "#fd79a8" });
  if (swimming) segments.push({ label: "수영 🏊", start: workEndMin, end: toMin(SWIMMING_END.h, SWIMMING_END.m), color: "#81ecec" });
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

export default function DayStart() {
  const [step, setStep] = useState(0);
  const [swimming, setSwimming] = useState(null);
  const [workStart, setWorkStart] = useState(null);
  const [isRemote, setIsRemote] = useState(null);
  const [freeTime, setFreeTime] = useState(null);
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);
  const [workStartOptions] = useState(() => getWorkStartOptions());

  // 체크리스트
  const [todoItems, setTodoItems] = useState([]);
  const [watchItems, setWatchItems] = useState([]);

  // 취미 패널 task 선택 상태 (체크박스)
  const [pendingTasks, setPendingTasks] = useState({});
  const [customTaskInput, setCustomTaskInput] = useState("");

  const hobbyPanelRef = useRef(null);
  const checklistRef = useRef(null);

  // 취미 변경 시 task 선택 초기화 (모두 체크된 상태로)
  useEffect(() => {
    if (selectedHobby) {
      const init = {};
      selectedHobby.tasks.forEach((t) => { init[t] = true; });
      setPendingTasks(init);
      setCustomTaskInput("");
    }
  }, [selectedHobby?.id]);

  // 취미 선택 시 패널로 스크롤
  useEffect(() => {
    if (selectedHobby && hobbyPanelRef.current) {
      setTimeout(() => {
        hobbyPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [selectedHobby?.id]);

  const fetchVideos = useCallback(async (hobby, query) => {
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
  }, []);

  const handleSwimming = (val) => { setSwimming(val); setStep(2); };
  const handleWorkStart = (val) => { setWorkStart(val); setStep(3); };
  const handleRemote = (val) => {
    setIsRemote(val);
    setFreeTime(calcFreeTime(swimming, workStart, val));
    setStep(4);
  };

  const handleHobbySelect = useCallback((hobby) => {
    if (selectedHobby?.id === hobby.id) {
      setSelectedHobby(null);
      setVideos([]);
      setActiveQuery(null);
      return;
    }
    setSelectedHobby(hobby);
    if (hobby.showVideos && hobby.queries.length > 0) {
      fetchVideos(hobby, hobby.queries[0]);
    } else {
      setVideos([]);
      setActiveQuery(null);
    }
  }, [selectedHobby, fetchVideos]);

  // 선택된 task들을 오늘 할 일 목록에 추가
  const handleAddTasks = () => {
    const selected = Object.entries(pendingTasks)
      .filter(([, checked]) => checked)
      .map(([text]) => text);

    if (selected.length === 0 && !customTaskInput.trim()) return;

    const toAdd = [...selected];
    if (customTaskInput.trim()) toAdd.push(customTaskInput.trim());

    setTodoItems((prev) => {
      const existingTexts = new Set(prev.map((t) => t.text));
      const newItems = toAdd
        .filter((text) => !existingTexts.has(text))
        .map((text) => ({ id: `${Date.now()}-${Math.random()}`, text, done: false }));
      return [...prev, ...newItems];
    });
    setCustomTaskInput("");
    setTimeout(() => {
      checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleTogglePendingTask = (taskText) => {
    setPendingTasks((prev) => ({ ...prev, [taskText]: !prev[taskText] }));
  };

  const handleToggleTodo = (id) => setTodoItems((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const handleRemoveTodo = (id) => setTodoItems((prev) => prev.filter((t) => t.id !== id));

  const handleAddToWatch = (video) => {
    setWatchItems((prev) => prev.some((w) => w.id === video.id) ? prev : [...prev, { ...video, done: false }]);
    setTimeout(() => {
      checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };
  const handleToggleWatch = (id) => setWatchItems((prev) => prev.map((w) => w.id === id ? { ...w, done: !w.done } : w));
  const handleRemoveWatch = (id) => setWatchItems((prev) => prev.filter((w) => w.id !== id));

  const handleReset = () => {
    setStep(0); setSwimming(null); setWorkStart(null); setIsRemote(null);
    setFreeTime(null); setSelectedHobby(null); setVideos([]); setActiveQuery(null);
    setTodoItems([]); setWatchItems([]); setPendingTasks({}); setCustomTaskInput("");
  };

  const getRecommended = (availableMin) => HOBBIES.filter((h) => h.minMin <= availableMin);

  return (
    <div className={`daystart${step === 4 ? " daystart--result" : ""}`}>
      {step === 0 && (
        <div className="ds-welcome">
          <div className="ds-emoji">☀️</div>
          <h1>좋은 아침이에요!</h1>
          <p>오늘 하루를 계획해볼게요</p>
          <button className="ds-btn ds-btn--primary" onClick={() => setStep(1)}>하루 시작 🚀</button>
        </div>
      )}

      {step === 1 && (
        <div className="ds-step">
          <div className="ds-step__question">🏊 오늘 수영 갈 거야?</div>
          <div className="ds-step__sub">수영 여부에 따라 퇴근 후 자유시간이 달라져요</div>
          <div className="ds-choices">
            <button className="ds-choice-btn" onClick={() => handleSwimming(true)}>🏊 응, 갈 거야</button>
            <button className="ds-choice-btn" onClick={() => handleSwimming(false)}>🛋️ 아니, 안 가</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="ds-step">
          <div className="ds-step__question">⏰ 업무 언제 시작할 거야?</div>
          <div className="ds-step__sub">30분 단위로 선택해줘</div>
          <div className="ds-time-grid">
            {workStartOptions.length > 0 ? (
              workStartOptions.map((opt) => (
                <button key={opt.value} className="ds-time-btn" onClick={() => handleWorkStart(opt.value)}>{opt.label}</button>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "0.9rem" }}>선택 가능한 시간이 없어요 (14시 이후)</p>
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
              <div className="ds-time-card__label">☀️ 출근 전</div>
              <div className="ds-time-card__value">{formatMin(freeTime.pre)}</div>
              <div className="ds-time-card__detail">지금 ~ {freeTime.preEndStr}</div>
            </div>
            <div className="ds-time-card ds-time-card--post">
              <div className="ds-time-card__label">{swimming ? "🏊 수영 후" : "🌙 퇴근 후"}</div>
              <div className="ds-time-card__value">{formatMin(freeTime.post)}</div>
              <div className="ds-time-card__detail">{freeTime.postStartStr} ~ 자정</div>
            </div>
            <div className="ds-time-card ds-time-card--total">
              <div className="ds-time-card__label">⏱ 오늘 총 자유시간</div>
              <div className="ds-time-card__value">{formatMin(freeTime.total)}</div>
            </div>
          </div>

          {/* ── 취미 선택 버튼 ── */}
          <div className="ds-hobbies">
            <h3>오늘 뭐 해볼까? 🎯</h3>

            {freeTime.pre > 0 && (
              <div className="ds-hobby-section">
                <div className="ds-hobby-section__title">출근 전 ({formatMin(freeTime.pre)} 있어요)</div>
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
                  {swimming ? "수영 후" : "퇴근 후"} ({formatMin(freeTime.post)} 있어요)
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

          {/* ── 취미 상세 패널 ── */}
          {selectedHobby && (
            <div className="ds-hobby-panel" ref={hobbyPanelRef}>
              <div className="ds-hobby-panel__header">
                <h3>{selectedHobby.name}</h3>
                {selectedHobby.note && <div className="ds-hobby-panel__note">📝 {selectedHobby.note}</div>}
              </div>

              {/* Task 선택 */}
              <div className="ds-hobby-panel__tasks">
                <div className="ds-hobby-panel__tasks-title">오늘 할 것 골라봐 ✅</div>
                <ul className="ds-task-pick-list">
                  {selectedHobby.tasks.map((task) => (
                    <li key={task} className="ds-task-pick-item">
                      <label className="ds-task-pick-label">
                        <input
                          type="checkbox"
                          className="ds-task-pick-checkbox"
                          checked={!!pendingTasks[task]}
                          onChange={() => handleTogglePendingTask(task)}
                        />
                        <span className={`ds-task-pick-text${pendingTasks[task] ? " ds-task-pick-text--checked" : ""}`}>
                          {task}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>

                {/* 직접 입력 */}
                <div className="ds-task-pick-custom">
                  <input
                    className="ds-task-pick-input"
                    type="text"
                    placeholder="직접 입력..."
                    value={customTaskInput}
                    onChange={(e) => setCustomTaskInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTasks()}
                  />
                </div>

                <button className="ds-task-add-btn" onClick={handleAddTasks}>
                  ✓ 오늘 할 일에 추가
                </button>
              </div>

              {/* 유튜브 영상 (showVideos인 경우만) */}
              {selectedHobby.showVideos && (
                <div className="ds-hobby-panel__videos">
                  <div className="ds-hobby-panel__videos-title">
                    📺 {selectedHobby.showVideos && selectedHobby.queries.length > 1 ? "BGM / 참고 영상" : "참고 영상"}
                  </div>

                  {selectedHobby.queries.length > 1 && (
                    <div className="ds-videos__tabs">
                      {selectedHobby.queries.map((q, i) => (
                        <button
                          key={i}
                          className={`ds-videos__tab${activeQuery === q ? " ds-videos__tab--active" : ""}`}
                          onClick={() => fetchVideos(selectedHobby, q)}
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
                        const isInWatch = watchItems.some((w) => w.id === v.id);
                        const viewStr = formatViewCount(v.viewCount);
                        const dateStr = formatPublishedAt(v.publishedAt);
                        return (
                          <div key={v.id} className="ds-video-card">
                            <a
                              href={v.url || `https://www.youtube.com/watch?v=${v.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ds-video-link"
                            >
                              <img src={v.thumbnail} alt={v.title} className="ds-video-thumb" />
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
                            </a>
                            <button
                              className={`ds-video-add-btn${isInWatch ? " ds-video-add-btn--added" : ""}`}
                              onClick={() => isInWatch ? handleRemoveWatch(v.id) : handleAddToWatch(v)}
                            >
                              {isInWatch ? "✓ 추가됨" : "+ 담기"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!loadingVideos && videos.length === 0 && !loadingVideos && (
                    <div className="ds-loading">영상을 불러올 수 없어요 😢</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── 체크리스트 ── */}
          <div className="ds-checklist" ref={checklistRef}>
            <h3>오늘의 체크리스트 ✅</h3>

            {/* 오늘 하고 싶은 일 */}
            <div className="ds-checklist__section">
              <div className="ds-checklist__section-title">📌 오늘 하고 싶은 일</div>
              {todoItems.length === 0 ? (
                <div className="ds-checklist__empty">
                  취미 패널에서 할 일을 선택해서 추가해요 👆
                </div>
              ) : (
                <ul className="ds-checklist__list">
                  {todoItems.map((item) => (
                    <li key={item.id} className={`ds-checklist__item${item.done ? " ds-checklist__item--done" : ""}`}>
                      <button className="ds-checklist__check" onClick={() => handleToggleTodo(item.id)}>
                        {item.done ? "✓" : ""}
                      </button>
                      <span className="ds-checklist__text">{item.text}</span>
                      <button className="ds-checklist__remove" onClick={() => handleRemoveTodo(item.id)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* 오늘 보고 싶은 영상 */}
            <div className="ds-checklist__section">
              <div className="ds-checklist__section-title">🎬 오늘 보고 싶은 영상</div>
              {watchItems.length === 0 ? (
                <div className="ds-checklist__empty">
                  영상 카드의 <strong>+ 담기</strong> 버튼으로 추가해요 👆
                </div>
              ) : (
                <ul className="ds-checklist__list">
                  {watchItems.map((item) => (
                    <li key={item.id} className={`ds-checklist__item ds-checklist__item--video${item.done ? " ds-checklist__item--done" : ""}`}>
                      <button className="ds-checklist__check" onClick={() => handleToggleWatch(item.id)}>
                        {item.done ? "✓" : ""}
                      </button>
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt={item.title} className="ds-checklist__thumb" />
                      )}
                      <a
                        href={item.url || `https://www.youtube.com/watch?v=${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ds-checklist__video-info"
                      >
                        <span className="ds-checklist__video-title">{item.title}</span>
                        <span className="ds-checklist__video-channel">{item.channel}</span>
                      </a>
                      <button className="ds-checklist__remove" onClick={() => handleRemoveWatch(item.id)}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
