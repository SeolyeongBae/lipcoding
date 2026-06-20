"use client";

import { useState, useRef, useEffect } from "react";
import {
  DEFAULT_HOBBIES,
  HOBBIES_STORAGE_KEY,
  hydrateHobbies,
} from "./defaultHobbies";
import {
  buildRoutinePlanDraft,
  getPlanMinutes,
  parseTimeToMin,
} from "./routinePlanner";
import "./DayStart.css";

const TODAY_LOG_KEY = "todayLog";
const VIDEO_RESULTS_COUNT = 8;

const DEFAULT_WORK_END = { h: 19, m: 30 };
const LATEST_WORK_END = { h: 22, m: 0 };
const SWIMMING_END = { h: 21, m: 30 };
const MIDNIGHT = { h: 24, m: 0 };
const COMMUTE_PREP_MIN = 60;

function toRoutineHobby(hobby) {
  return {
    ...hobby,
    queries: hobby.bgmQueries ?? [],
    showVideos: Boolean(
      hobby.showVideos && (hobby.bgmQueries?.length ?? 0) > 0,
    ),
  };
}

function loadRoutineHobbies() {
  if (typeof window === "undefined") {
    return DEFAULT_HOBBIES.map(toRoutineHobby);
  }

  return hydrateHobbies(window.localStorage.getItem(HOBBIES_STORAGE_KEY)).map(
    toRoutineHobby,
  );
}

function toMin(h, m) {
  return h * 60 + m;
}

function formatMin(min) {
  if (min <= 0) return "0분";
  const h = Math.floor(min / 60),
    m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

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
  const remainingWorkWindow = Math.max(1, end - nowMin);
  const opts = [];

  for (let t = Math.min(start, defaultEnd); t <= end; t += 30) {
    if (t <= nowMin) continue;
    const h = Math.floor(t / 60);
    const m = t % 60;
    const workMinutes = Math.max(0, t - nowMin);
    opts.push({
      value: `${pad(h)}:${pad(m)}`,
      label:
        t === defaultEnd
          ? `${formatTimeLabel(t)} 보통 마무리`
          : formatTimeLabel(t),
      workLabel: formatMin(workMinutes),
      workPercent: Math.min(100, (workMinutes / remainingWorkWindow) * 100),
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
  if (nowMin > 0)
    segments.push({
      label: "지나간 시간",
      start: 0,
      end: nowMin,
      color: "#e0e0e0",
    });
  segments.push({
    label: "업무 💼",
    start: nowMin,
    end: Math.max(nowMin, workEndMin),
    color: "#fd79a8",
  });
  if (!isRemote && !swimming)
    segments.push({
      label: "퇴근/정리 🏃",
      start: workEndMin,
      end: postStartMin,
      color: "#ffeaa7",
    });
  if (swimming && workEndMin < swimmingEndMin)
    segments.push({
      label: "수영 🏊",
      start: workEndMin,
      end: swimmingEndMin,
      color: "#81ecec",
    });
  if (post > 0)
    segments.push({
      label: "자유시간 ✨",
      start: postStartMin,
      end: toMin(MIDNIGHT.h, MIDNIGHT.m),
      color: "#74b9ff",
    });
  const filled = segments.reduce(
    (acc, s) => Math.max(acc, Math.min(s.end, TOTAL)),
    0,
  );
  if (filled < TOTAL)
    segments.push({
      label: "수면/기타 😴",
      start: filled,
      end: TOTAL,
      color: "#b2bec3",
    });
  return {
    pre,
    post,
    total: pre + post,
    preEndStr,
    postStartStr,
    segments,
    nowMin,
  };
}

function Timeline({ segments, nowMin }) {
  const TOTAL = 1440;
  const hours = [0, 3, 6, 9, 12, 15, 18, 21, 24];
  return (
    <div className="ds-timeline">
      <div className="ds-timeline__bar">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="ds-timeline__seg"
            style={{
              width: `${((Math.min(seg.end, TOTAL) - seg.start) / TOTAL) * 100}%`,
              background: seg.color,
            }}
            title={seg.label}
          />
        ))}
        <div
          className="ds-timeline__now"
          style={{ left: `${(nowMin / TOTAL) * 100}%` }}
        >
          <div className="ds-timeline__now-line" />
          <div className="ds-timeline__now-label">지금</div>
        </div>
      </div>
      <div className="ds-timeline__ticks">
        {hours.map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {h === 24 ? "자정" : `${h}시`}
          </span>
        ))}
      </div>
      <div className="ds-timeline__legend">
        {segments
          .filter(
            (s, i, arr) => arr.findIndex((x) => x.label === s.label) === i,
          )
          .map((seg, i) => (
            <div key={i} className="ds-timeline__legend-item">
              <span
                className="ds-timeline__legend-dot"
                style={{ background: seg.color }}
              />
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
  if (typeof window === "undefined")
    return { date: getTodayStr(), entries: [] };
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(TODAY_LOG_KEY) || "null",
    );
    if (stored && stored.date === getTodayStr()) return stored;
  } catch {}
  return { date: getTodayStr(), entries: [] };
}

function saveTodayLog(log) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TODAY_LOG_KEY, JSON.stringify(log));
  }
}

function getInitialStep() {
  return loadTodayLog().confirmedAt ? 6 : 0;
}

function makePlanEntry(hobby, video = null, tasks = [], extra = {}) {
  return {
    id: `${hobby.id}-${video?.id ?? "activity"}-${Date.now()}`,
    hobbyId: hobby.id,
    taskLabels: tasks,
    videoId: video?.id ?? null,
    videoTitle: video?.title ?? null,
    videoUrl: video?.url ?? null,
    videoThumbnail: video?.thumbnail ?? null,
    videoChannel: video?.channel ?? null,
    durationMin: extra.durationMin ?? getPlanMinutes(hobby),
    startLabel: extra.startLabel ?? null,
    endLabel: extra.endLabel ?? null,
    reason: extra.reason ?? null,
    source: extra.source ?? "manual",
    plannedAt: new Date().toISOString(),
    completedAt: null,
  };
}

function attachVideoToEntry(entry, video) {
  return {
    ...entry,
    videoId: video?.id ?? null,
    videoTitle: video?.title ?? null,
    videoUrl: video?.url ?? null,
    videoThumbnail: video?.thumbnail ?? null,
    videoChannel: video?.channel ?? null,
  };
}

function getVideoCapableEntries(entries = [], hobbies = []) {
  return entries.filter((entry) => {
    const hobby = hobbies.find((item) => item.id === entry.hobbyId);
    return hobby?.showVideos && (hobby.queries?.length ?? 0) > 0;
  });
}

function getCurrentPlanStatus(todayLog, hobbies = []) {
  const entries = Array.isArray(todayLog.entries) ? todayLog.entries : [];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const scheduledEntries = entries
    .filter((entry) => entry.startLabel && entry.endLabel)
    .map((entry) => ({
      ...entry,
      startMin: parseTimeToMin(entry.startLabel),
      endMin: parseTimeToMin(entry.endLabel),
    }))
    .sort((a, b) => a.startMin - b.startMin);
  const activeEntry = scheduledEntries.find(
    (entry) => nowMin >= entry.startMin && nowMin < entry.endMin,
  );

  if (activeEntry) {
    const hobby = hobbies.find((item) => item.id === activeEntry.hobbyId);
    return {
      type: "activity",
      title: `${hobby?.name ?? activeEntry.hobbyId} 시간이에요`,
      message: activeEntry.videoTitle
        ? "지금 시간표에 맞는 영상을 바로 켤 수 있어요."
        : "지금 할 일을 시작할 시간이에요.",
      entry: activeEntry,
      hobby,
    };
  }

  const firstEntry = scheduledEntries[0];
  const dayContext = todayLog.dayContext;
  const workEndMin = dayContext?.workEnd ? parseTimeToMin(dayContext.workEnd) : null;
  const postStartMin = dayContext?.postStartStr
    ? parseTimeToMin(dayContext.postStartStr)
    : firstEntry?.startMin;

  if (firstEntry && nowMin < firstEntry.startMin) {
    if (workEndMin !== null && nowMin < workEndMin) {
      return {
        type: "work",
        title: "지금은 일하고 있는 시간이에요",
        message: `오늘 첫 루틴은 ${firstEntry.startLabel}에 시작해요.`,
        entry: firstEntry,
      };
    }

    if (postStartMin !== null && nowMin < postStartMin) {
      return {
        type: "waiting",
        title: "아직 루틴 시작 전이에요",
        message: `오늘 루틴은 ${firstEntry.startLabel}부터 시작하면 돼요.`,
        entry: firstEntry,
      };
    }
  }

  if (scheduledEntries.length > 0 && nowMin >= scheduledEntries.at(-1).endMin) {
    return {
      type: "done",
      title: "오늘 계획한 활동은 마무리됐어요",
      message: "체크를 보면서 완료한 일을 정리해도 좋아요.",
      entry: scheduledEntries.at(-1),
    };
  }

  return {
    type: "empty",
    title: "오늘 확정된 시간표가 없어요",
    message: "하루 시작을 눌러 오늘 할 일을 먼저 정해볼까요?",
    entry: null,
  };
}

export default function DayStart() {
  const [step, setStep] = useState(() => getInitialStep());
  const [hobbies, setHobbies] = useState(() =>
    DEFAULT_HOBBIES.map(toRoutineHobby),
  );
  const [swimming, setSwimming] = useState(null);
  const [workEnd, setWorkEnd] = useState(null);
  const [isRemote, setIsRemote] = useState(null);
  const [freeTime, setFreeTime] = useState(null);
  const [selectedHobby, setSelectedHobby] = useState(null);
  const [selectedHobbyIds, setSelectedHobbyIds] = useState([]);
  const [taskSelections, setTaskSelections] = useState({});
  const [planDraft, setPlanDraft] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [videoSelections, setVideoSelections] = useState({});
  const [activeVideoEntryId, setActiveVideoEntryId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [activeQuery, setActiveQuery] = useState(null);
  const [todayLog, setTodayLog] = useState(() => loadTodayLog());
  const [customTask, setCustomTask] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const workEndOptions = getWorkEndOptions();

  const hobbyPanelRef = useRef(null);
  const logRef = useRef(null);
  const planDraftRef = useRef(null);

  useEffect(() => {
    setHobbies(loadRoutineHobbies());
    const storedLog = loadTodayLog();
    setTodayLog(storedLog);
    if (storedLog.confirmedAt) setStep(6);
  }, []);

  useEffect(() => {
    if (selectedHobby && hobbyPanelRef.current) {
      setTimeout(() => {
        hobbyPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 150);
    }
  }, [selectedHobby?.id]);

  async function fetchVideos(query) {
    setActiveQuery(query);
    setLoadingVideos(true);
    setVideos([]);
    try {
      const res = await fetch("/api/routine-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "youtube",
          query,
          maxResults: VIDEO_RESULTS_COUNT,
        }),
      });
      const data = await res.json();
      setVideos(data.videos || []);
    } catch {
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }

  const handleSwimming = (val) => {
    setSwimming(val);
    setStep(2);
  };
  const handleWorkEnd = (val) => {
    setWorkEnd(val);
    setStep(3);
  };
  const handleRemote = (val) => {
    setIsRemote(val);
    const ft = calcFreeTime(swimming, workEnd, val);
    setFreeTime(ft);
    setStep(4);
  };

  function handleHobbySelect(hobby) {
    setPlanDraft(null);
    setPendingPlan(null);
    setActiveVideoEntryId(null);
    setVideos([]);
    setActiveQuery(null);

    if (selectedHobbyIds.includes(hobby.id)) {
      setSelectedHobbyIds((current) => current.filter((id) => id !== hobby.id));
      if (selectedHobby?.id === hobby.id) {
        setSelectedHobby(null);
        setCustomTask("");
      }
      return;
    }

    setSelectedHobbyIds((current) => [...current, hobby.id]);
    setTaskSelections((current) => ({
      ...current,
      [hobby.id]: current[hobby.id] ?? (hobby.tasks ?? []),
    }));
    setSelectedHobby(hobby);
    setCustomTask("");
  }

  function getPlannedEntries() {
    return Array.isArray(todayLog.entries) ? todayLog.entries : [];
  }

  function getCurrentTasks() {
    if (!selectedHobby) return [];
    return taskSelections[selectedHobby.id] ?? selectedHobby.tasks ?? [];
  }

  function getPlannedTotalMin() {
    return getPlannedEntries().reduce((total, entry) => {
      const hobby = hobbies.find((h) => h.id === entry.hobbyId);
      return total + (entry.durationMin ?? getPlanMinutes(hobby));
    }, 0);
  }

  function getPlanGuide() {
    const totalMin = freeTime?.total ?? 0;
    const plannedMin = getPlannedTotalMin();
    const remainingMin = totalMin - plannedMin;

    if (plannedMin === 0) {
      return "하고 싶은 걸 하나씩 담으면 오늘 자유시간 안에서 가능한 조합을 볼 수 있어요.";
    }

    if (remainingMin < 0) {
      return `오늘 자유시간보다 ${formatMin(Math.abs(remainingMin))} 많아요. 하나를 줄이거나 짧은 활동으로 바꿔보세요.`;
    }

    const postLabel = swimming ? "수영 후" : isRemote ? "업무 후" : "퇴근 후";
    return `오늘 자유시간 ${formatMin(totalMin)} 중 ${formatMin(plannedMin)}을 담았어요. ${postLabel}에는 담은 순서대로 시작하면 좋아요.`;
  }

  function handleTaskToggle(task) {
    if (!selectedHobby) return;
    setPlanDraft(null);
    setTaskSelections((current) => {
      const tasks = current[selectedHobby.id] ?? selectedHobby.tasks ?? [];
      return {
        ...current,
        [selectedHobby.id]: tasks.includes(task)
          ? tasks.filter((item) => item !== task)
          : [...tasks, task],
      };
    });
  }

  function handleCustomTaskAdd() {
    if (!selectedHobby) return;
    const task = customTask.trim();
    if (!task) return;
    setPlanDraft(null);
    setTaskSelections((current) => {
      const tasks = current[selectedHobby.id] ?? selectedHobby.tasks ?? [];
      return {
        ...current,
        [selectedHobby.id]: tasks.includes(task) ? tasks : [...tasks, task],
      };
    });
    setCustomTask("");
  }

  function buildLocalPlanDraft() {
    return buildRoutinePlanDraft({
      hobbies,
      selectedHobbyIds,
      taskSelections,
      freeTime,
      swimming,
      isRemote,
    });
  }

  async function handleBuildPlanDraft() {
    setIsPlanning(true);
    setPendingPlan(null);
    setActiveVideoEntryId(null);
    setVideos([]);
    setActiveQuery(null);

    try {
      const res = await fetch("/api/routine-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "plan",
          context: {
            hobbies,
            selectedHobbyIds,
            taskSelections,
            freeTime,
            swimming,
            isRemote,
          },
        }),
      });
      const data = await res.json();
      setPlanDraft(data.plan ?? buildLocalPlanDraft());
    } catch {
      setPlanDraft(buildLocalPlanDraft());
    } finally {
      setIsPlanning(false);
      setTimeout(() => {
        planDraftRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }

  function handleAcceptPlanDraft() {
    if (!planDraft || planDraft.status === "over") return;
    const nextEntries = planDraft.entries
      .map((entry) => {
        const hobby = hobbies.find((item) => item.id === entry.hobbyId);
        if (!hobby) return null;
        return makePlanEntry(hobby, null, entry.taskLabels, {
          durationMin: entry.durationMin,
          startLabel: entry.startLabel,
          endLabel: entry.endLabel,
          reason: entry.reason,
          source: entry.isSuggested ? "script-suggested" : "script-selected",
        });
      })
      .filter(Boolean);
    const nextPendingPlan = {
      entries: nextEntries,
      dayContext: {
        workEnd,
        swimming,
        isRemote,
        postStartStr: freeTime?.postStartStr ?? null,
        totalMin: freeTime?.total ?? 0,
      },
    };
    const firstVideoEntry = getVideoCapableEntries(nextEntries, hobbies)[0];
    setPendingPlan(nextPendingPlan);
    setVideoSelections({});
    setActiveVideoEntryId(firstVideoEntry?.id ?? null);
    setPlanDraft(null);
    setSelectedHobby(null);
    setSelectedHobbyIds([]);
    setCustomTask("");
    setVideos([]);
    setActiveQuery(null);
    setStep(5);
    if (firstVideoEntry) {
      const firstHobby = hobbies.find((item) => item.id === firstVideoEntry.hobbyId);
      if (firstHobby?.queries?.[0]) fetchVideos(firstHobby.queries[0]);
    }
  }

  function handleRejectPlanDraft() {
    setPlanDraft(null);
  }

  function handleVideoEntrySelect(entry) {
    const hobby = hobbies.find((item) => item.id === entry.hobbyId);
    if (!hobby || !hobby.showVideos || hobby.queries.length === 0) return;
    setActiveVideoEntryId(entry.id);
    fetchVideos(hobby.queries[0]);
  }

  function handleVideoCheck(entryId, video) {
    setVideoSelections((current) => ({
      ...current,
      [entryId]: current[entryId]?.id === video.id ? null : video,
    }));
  }

  function isReadyForFinalConfirm() {
    if (!pendingPlan) return false;
    return getVideoCapableEntries(pendingPlan.entries, hobbies).every(
      (entry) => videoSelections[entry.id],
    );
  }

  function handleFinalConfirm() {
    if (!pendingPlan || !isReadyForFinalConfirm()) return;
    const entries = pendingPlan.entries.map((entry) =>
      attachVideoToEntry(entry, videoSelections[entry.id]),
    );
    const newLog = {
      date: getTodayStr(),
      entries,
      dayContext: pendingPlan.dayContext,
      confirmedAt: new Date().toISOString(),
    };
    setTodayLog(newLog);
    saveTodayLog(newLog);
    setPendingPlan(null);
    setVideoSelections({});
    setActiveVideoEntryId(null);
    setVideos([]);
    setActiveQuery(null);
    setStep(6);
  }

  function handleTogglePlanDone(entryId, fallbackIndex) {
    const newLog = {
      ...todayLog,
      entries: getPlannedEntries().map((entry, index) => {
        const isTarget = entry.id
          ? entry.id === entryId
          : index === fallbackIndex;
        if (!isTarget) return entry;
        return {
          ...entry,
          completedAt: entry.completedAt ? null : new Date().toISOString(),
        };
      }),
    };
    setTodayLog(newLog);
    saveTodayLog(newLog);
  }

  function handleRemovePlan(entryId, fallbackIndex) {
    const entries = getPlannedEntries();
    const newLog = {
      ...todayLog,
      entries: entries.filter((entry, index) =>
        entry.id ? entry.id !== entryId : index !== fallbackIndex,
      ),
    };
    setTodayLog(newLog);
    saveTodayLog(newLog);
  }

  const handleReset = () => {
    setStep(0);
    setSwimming(null);
    setWorkEnd(null);
    setIsRemote(null);
    setFreeTime(null);
    setSelectedHobby(null);
    setSelectedHobbyIds([]);
    setTaskSelections({});
    setPlanDraft(null);
    setPendingPlan(null);
    setVideoSelections({});
    setActiveVideoEntryId(null);
    setVideos([]);
    setActiveQuery(null);
    setCustomTask("");
    const emptyLog = { date: getTodayStr(), entries: [] };
    setTodayLog(emptyLog);
    saveTodayLog(emptyLog);
  };

  const getRecommended = (availableMin) =>
    hobbies.filter((hobby) => hobby.minMin <= availableMin);
  const pendingEntries = pendingPlan?.entries ?? [];
  const videoEntries = getVideoCapableEntries(pendingEntries, hobbies);
  const activeVideoEntry =
    videoEntries.find((entry) => entry.id === activeVideoEntryId) ??
    videoEntries[0] ??
    null;
  const activeVideoHobby = activeVideoEntry
    ? hobbies.find((hobby) => hobby.id === activeVideoEntry.hobbyId)
    : null;
  const missingVideoCount = videoEntries.filter(
    (entry) => !videoSelections[entry.id],
  ).length;
  const currentStatus = getCurrentPlanStatus(todayLog, hobbies);

  return (
    <div className={`daystart${step >= 4 ? " daystart--result" : ""}`}>
      {step === 0 && (
        <div className="ds-welcome">
          <div className="ds-emoji">☀️</div>
          <h1>myroutine</h1>
          <p>오늘 루틴에 맞는 영상을 골라볼게요</p>
          <details className="ds-info">
            <summary aria-label="myroutine 작동 방식 보기">
              <span aria-hidden="true">i</span>
            </summary>
            <p>
              오늘 일정과 자유시간을 확인한 뒤, AI가 루틴에 맞는 YouTube
              영상을 추천해요. 선택한 영상이 끝나면 자연스럽게 루틴도 마무리돼요.
            </p>
          </details>
          <a className="ds-page-header__link" href="/setup">
            ⚙️ 취미 설정
          </a>
          <button className="ds-btn ds-btn--primary" onClick={() => setStep(1)}>
            하루 시작 🚀
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="ds-step">
          <div className="ds-step__question">🏊 오늘 수영 갈 거야?</div>
          <div className="ds-step__sub">
            수영 여부에 따라 업무 후 자유시간이 달라져요
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

      {step === 2 && (
        <div className="ds-step">
          <div className="ds-step__question">⏰ 업무 언제 마무리할 거야?</div>
          <div className="ds-step__sub">
            보통은 19시 30분, 늦으면 22시까지 고를 수 있어요
          </div>
          <div className="ds-work-preview" aria-hidden="true">
            <div className="ds-work-preview__header">
              <span>지금</span>
              <strong>업무 시간</strong>
              <span>22시</span>
            </div>
            <div className="ds-work-preview__bar">
              <span className="ds-work-preview__block ds-work-preview__block--work" />
              <span className="ds-work-preview__block ds-work-preview__block--free" />
            </div>
            <p>
              각 버튼의 막대가 지금부터 선택한 마무리 시각까지 남은 업무 시간을
              보여줘요.
            </p>
          </div>
          <div className="ds-time-grid">
            {workEndOptions.length > 0 ? (
              workEndOptions.map((opt) => (
                <button
                  key={opt.value}
                  className="ds-time-btn"
                  onClick={() => handleWorkEnd(opt.value)}
                  aria-label={opt.label}
                >
                  <span className="ds-time-btn__label">{opt.label}</span>
                  <span className="ds-time-btn__meta">
                    업무 {opt.workLabel}
                  </span>
                  <span className="ds-time-btn__bar" aria-hidden="true">
                    <span style={{ width: `${opt.workPercent}%` }} />
                  </span>
                </button>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "0.9rem" }}>
                오늘은 22시 이후라 남은 업무 마무리 선택지가 없어요
              </p>
            )}
          </div>
        </div>
      )}

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

      {step === 4 && freeTime && (
        <div className="ds-result">
          <div className="ds-result__header">
            <h2>오늘 자유시간 💫</h2>
            <button className="ds-reset-btn" onClick={handleReset}>
              다시 시작
            </button>
          </div>

          <Timeline segments={freeTime.segments} nowMin={freeTime.nowMin} />

          <div className="ds-time-cards">
            <div className="ds-time-card ds-time-card--pre">
              <div className="ds-time-card__label">☀️ 업무 전</div>
              <div className="ds-time-card__value">
                {formatMin(freeTime.pre)}
              </div>
              <div className="ds-time-card__detail">
                지금 ~ {freeTime.preEndStr}
              </div>
            </div>
            <div className="ds-time-card ds-time-card--post">
              <div className="ds-time-card__label">
                {swimming
                  ? "🏊 수영 후"
                  : isRemote
                    ? "🌙 업무 후"
                    : "🌙 퇴근 후"}
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

          <div className="ds-plan-summary">
            <div>
              <div className="ds-plan-summary__label">오늘 담은 시간</div>
              <div className="ds-plan-summary__value">
                {formatMin(getPlannedTotalMin())}
                <span> / {formatMin(freeTime.total)}</span>
              </div>
            </div>
            <p>{getPlanGuide()}</p>
          </div>

          {/* 취미 선택 버튼 */}
          <div className="ds-hobbies">
            <div className="ds-hobbies__header">
              <div>
                <h3>오늘 하고 싶은 일부터 골라볼까요? 🎯</h3>
                <p>
                  먼저 끌리는 활동을 담으면, 남은 시간에 맞춰 시간표를
                  스크립트로 만들어볼게요.
                </p>
              </div>
              <span>{selectedHobbyIds.length}개 선택</span>
            </div>

            {freeTime.pre > 0 && (
              <div className="ds-hobby-section">
                <div className="ds-hobby-section__title">
                  업무 전 ({formatMin(freeTime.pre)} 있어요)
                </div>
                <div className="ds-hobby-grid">
                  {getRecommended(freeTime.pre).length > 0 ? (
                    getRecommended(freeTime.pre).map((h) => (
                      <button
                        key={`pre-${h.id}`}
                        type="button"
                        className={`ds-hobby-btn${selectedHobbyIds.includes(h.id) ? " ds-hobby-btn--active" : ""}`}
                        onClick={() => handleHobbySelect(h)}
                      >
                        <span>{h.name}</span>
                        <span className="ds-hobby-btn__meta">
                          {h.fixedMin ? `${h.fixedMin}분` : `${h.minMin}분+`}
                        </span>
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
                  {swimming ? "수영 후" : isRemote ? "업무 후" : "퇴근 후"} (
                  {formatMin(freeTime.post)} 있어요)
                </div>
                <div className="ds-hobby-grid">
                  {getRecommended(freeTime.post).map((h) => (
                    <button
                      key={`post-${h.id}`}
                      type="button"
                      className={`ds-hobby-btn${selectedHobbyIds.includes(h.id) ? " ds-hobby-btn--active" : ""}`}
                      onClick={() => handleHobbySelect(h)}
                    >
                      <span>{h.name}</span>
                      <span className="ds-hobby-btn__meta">
                        {h.fixedMin ? `${h.fixedMin}분` : `${h.minMin}분+`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="ds-plan-builder">
              <button
                type="button"
                className="ds-task-add-btn"
                onClick={handleBuildPlanDraft}
                disabled={selectedHobbyIds.length === 0 || isPlanning}
              >
                {isPlanning ? "Copilot이 시간표 짜는 중..." : "추천 시간표 만들기"}
              </button>
              <p>
                영상은 시간표를 확정한 다음, 각 플랜 카드에서 필요할 때만
                고를 수 있어요.
              </p>
            </div>
          </div>

          {/* 취미 상세 패널 */}
          {selectedHobby && (
            <div className="ds-hobby-panel" ref={hobbyPanelRef}>
              <div className="ds-hobby-panel__header">
                <h3>{selectedHobby.name}</h3>
                {selectedHobby.note && (
                  <div className="ds-hobby-panel__note">
                    📝 {selectedHobby.note}
                  </div>
                )}
              </div>

              <div className="ds-hobby-panel__tasks">
                <div className="ds-hobby-panel__tasks-title">
                  이번에 해볼 것
                </div>
                <ul className="ds-task-list">
                  {selectedHobby.tasks.map((task) => (
                    <li key={task} className="ds-task-pick-item">
                      <label className="ds-task-pick-label">
                        <input
                          type="checkbox"
                          className="ds-task-pick-checkbox"
                          checked={getCurrentTasks().includes(task)}
                          onChange={() => handleTaskToggle(task)}
                        />
                        <span
                          className={`ds-task-pick-text${getCurrentTasks().includes(task) ? " ds-task-pick-text--checked" : ""}`}
                        >
                          {task}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <form
                  className="ds-task-pick-custom"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleCustomTaskAdd();
                  }}
                >
                  <input
                    className="ds-task-pick-input"
                    value={customTask}
                    onChange={(event) => setCustomTask(event.target.value)}
                    name="customTask"
                    autoComplete="off"
                    aria-label="세부 활동 직접 추가"
                    placeholder="예: 좋아하는 곡 1절만 연습…"
                  />
                  <button
                    className="ds-task-pick-add"
                    type="submit"
                    disabled={!customTask.trim()}
                  >
                    추가
                  </button>
                </form>
                <p className="ds-hobby-panel__hint">
                  체크한 세부 활동은 추천 시간표에 반영돼요.
                </p>
              </div>
            </div>
          )}

          {planDraft && (
            <div
              className="ds-plan-draft"
              aria-live="polite"
              ref={planDraftRef}
            >
              <div className="ds-plan-draft__header">
                <div>
                  <p className="ds-plan-draft__eyebrow">스크립트 추천</p>
                  <h3>이 시간표로 해볼까요?</h3>
                  {planDraft.toolName && (
                    <span className="ds-tool-badge">
                      Copilot SDK tool · {planDraft.toolName}
                    </span>
                  )}
                </div>
                <span>
                  {formatMin(planDraft.totalMin)} /{" "}
                  {formatMin(planDraft.availableMin)}
                </span>
              </div>
              <p className="ds-plan-draft__feedback">{planDraft.feedback}</p>
              <ol className="ds-plan-draft__list">
                {planDraft.entries.map((entry) => (
                  <li
                    key={`${entry.hobbyId}-${entry.startLabel}`}
                    className={entry.isSuggested ? "ds-plan-draft__suggested" : ""}
                  >
                    <time>
                      {entry.startLabel}–{entry.endLabel}
                    </time>
                    <div>
                      <strong>
                        {entry.hobbyName}
                        {entry.isSuggested ? " · 추천 추가" : ""}
                      </strong>
                      <p>{entry.taskLabels.join(" · ") || "가볍게 시작"}</p>
                      <small>{entry.reason}</small>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="ds-plan-draft__actions">
                <button
                  type="button"
                  className="ds-btn ds-btn--primary"
                  onClick={handleAcceptPlanDraft}
                  disabled={planDraft.status === "over"}
                >
                  Yes, 이대로 할래요
                </button>
                <button
                  type="button"
                  className="ds-reset-btn"
                  onClick={handleRejectPlanDraft}
                >
                  No, 다시 고를래요
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {step === 5 && pendingPlan && (
        <div className="ds-result">
          <div className="ds-result__header">
            <div>
              <p className="ds-plan-draft__eyebrow">Page 2 · 영상 선택</p>
              <h2>각 활동에 맞는 YouTube를 하나씩 골라주세요</h2>
            </div>
            <button className="ds-reset-btn" onClick={() => setStep(4)}>
              시간표로 돌아가기
            </button>
          </div>

          <div className="ds-video-step">
            <aside className="ds-video-step__schedule">
              <h3>오늘 시간표</h3>
              <ol>
                {pendingEntries.map((entry) => {
                  const hobby = hobbies.find((item) => item.id === entry.hobbyId);
                  const selectedVideo = videoSelections[entry.id];
                  const canSelectVideo = videoEntries.some(
                    (item) => item.id === entry.id,
                  );
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={`ds-video-step__entry${activeVideoEntry?.id === entry.id ? " ds-video-step__entry--active" : ""}`}
                        onClick={() => handleVideoEntrySelect(entry)}
                        disabled={!canSelectVideo}
                      >
                        <span className="ds-today-log__time">
                          {entry.startLabel}–{entry.endLabel}
                        </span>
                        <strong>{hobby?.name ?? entry.hobbyId}</strong>
                        <small>
                          {canSelectVideo
                            ? selectedVideo?.title ?? "영상 1개를 골라주세요"
                            : "영상 없이 진행"}
                        </small>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </aside>

            <section className="ds-video-step__picker">
              {activeVideoEntry && activeVideoHobby ? (
                <>
                  <div className="ds-video-picker__header">
                    <div>
                      <p className="ds-plan-draft__eyebrow">단일 선택</p>
                      <h3>{activeVideoHobby.name}</h3>
                    </div>
                    <span className="ds-video-step__selected-count">
                      {videoSelections[activeVideoEntry.id] ? "선택 완료" : "미선택"}
                    </span>
                  </div>

                  <div className="ds-videos__tabs">
                    {activeVideoHobby.queries.map((q, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`ds-videos__tab${activeQuery === q ? " ds-videos__tab--active" : ""}`}
                        onClick={() => fetchVideos(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>

                  {loadingVideos && (
                    <div className="ds-loading">불러오는 중… ⏳</div>
                  )}

                  {!loadingVideos && videos.length > 0 && (
                    <div className="ds-video-choice-grid">
                      {videos.map((video) => {
                        const selected =
                          videoSelections[activeVideoEntry.id]?.id === video.id;
                        const viewStr = formatViewCount(video.viewCount);
                        const dateStr = formatPublishedAt(video.publishedAt);
                        return (
                          <label
                            key={video.id}
                            className={`ds-video-choice${selected ? " ds-video-choice--selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() =>
                                handleVideoCheck(activeVideoEntry.id, video)
                              }
                            />
                            {video.thumbnail && (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="ds-video-thumb"
                              />
                            )}
                            <span className="ds-video-info">
                              <strong className="ds-video-title">
                                {video.title}
                              </strong>
                              <span className="ds-video-channel">
                                {video.channel}
                              </span>
                              {(viewStr || dateStr) && (
                                <span className="ds-video-meta">
                                  {viewStr && <span>👁 {viewStr}</span>}
                                  {dateStr && <span>📅 {dateStr}</span>}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {!loadingVideos && videos.length === 0 && (
                    <div className="ds-loading">영상을 불러올 수 없어요 😢</div>
                  )}
                </>
              ) : (
                <div className="ds-video-step__empty">
                  이번 시간표에는 YouTube가 필요한 활동이 없어요.
                </div>
              )}
            </section>
          </div>

          <div className="ds-final-confirm">
            <div>
              <p className="ds-plan-draft__eyebrow">최종 확인</p>
              <h3>이렇게 하시겠습니까?</h3>
              <p>
                {missingVideoCount > 0
                  ? `아직 ${missingVideoCount}개 활동의 영상을 골라야 해요.`
                  : "시간표와 영상 선택이 모두 준비됐어요."}
              </p>
            </div>
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              onClick={handleFinalConfirm}
              disabled={!isReadyForFinalConfirm()}
            >
              네, 오늘은 이렇게 할래요
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="ds-result">
          <div className="ds-result__header">
            <div>
              <p className="ds-plan-draft__eyebrow">오늘의 메인</p>
              <h2>{currentStatus.title}</h2>
            </div>
            <button className="ds-reset-btn" onClick={handleReset}>
              오늘 다시 계획하기
            </button>
          </div>

          <section className="ds-now-card">
            <p>{currentStatus.message}</p>
            {currentStatus.entry?.videoTitle && (
              <a
                className="ds-now-card__video"
                href={
                  currentStatus.entry.videoUrl ||
                  `https://www.youtube.com/watch?v=${currentStatus.entry.videoId}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {currentStatus.entry.videoThumbnail && (
                  <img
                    src={currentStatus.entry.videoThumbnail}
                    alt={currentStatus.entry.videoTitle}
                  />
                )}
                <span>
                  <strong>{currentStatus.entry.videoTitle}</strong>
                  <small>{currentStatus.entry.videoChannel}</small>
                </span>
              </a>
            )}
          </section>

          <div className="ds-today-log" data-testid="today-log" ref={logRef}>
            <h3>오늘 확정한 시간표</h3>
            <ul className="ds-today-log__list">
              {getPlannedEntries().map((entry, i) => {
                const hobby = hobbies.find((h) => h.id === entry.hobbyId);
                const durationMin = entry.durationMin ?? getPlanMinutes(hobby);
                const taskText =
                  Array.isArray(entry.taskLabels) && entry.taskLabels.length > 0
                    ? entry.taskLabels.join(" · ")
                    : "활동만 담김";
                return (
                  <li
                    key={entry.id ?? `${entry.hobbyId}-${entry.videoId}-${i}`}
                    className={`ds-today-log__item${entry.completedAt ? " ds-today-log__item--done" : ""}`}
                  >
                    <button
                      type="button"
                      className="ds-checklist__check"
                      aria-label={`${hobby?.name ?? entry.hobbyId} 완료 표시`}
                      onClick={() => handleTogglePlanDone(entry.id, i)}
                    >
                      {entry.completedAt ? "✓" : ""}
                    </button>
                    <div className="ds-today-log__main">
                      <span className="ds-today-log__hobby">
                        {hobby?.name ?? entry.hobbyId}
                      </span>
                      <div className="ds-today-log__detail">
                        <span className="ds-today-log__time">
                          {entry.startLabel}–{entry.endLabel}
                        </span>
                        <span className="ds-today-log__video">
                          {[taskText, entry.videoTitle]
                            .filter(Boolean)
                            .join(" / ")}
                        </span>
                        {entry.reason && (
                          <span className="ds-today-log__reason">
                            {entry.reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="ds-today-log__duration">
                      {formatMin(durationMin)}
                    </span>
                    <button
                      type="button"
                      className="ds-today-log__remove"
                      aria-label={`${hobby?.name ?? entry.hobbyId} 빼기`}
                      onClick={() => handleRemovePlan(entry.id, i)}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
