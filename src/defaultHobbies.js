export const HOBBIES_STORAGE_KEY = "hobbies";

export const DEFAULT_HOBBIES = [
  {
    id: "stretching",
    name: "🧘 스트레칭",
    aliases: ["스트레칭", "명상", "stretching"],
    tasks: ["허벅지/골반/어깨 스트레칭"],
    bgmQueries: ["daily stretching routine office"],
    minMin: 10,
    fixedMin: 10,
    note: "딱 10분",
    showVideos: true,
  },
  {
    id: "guitar",
    name: "🎸 기타 연습",
    aliases: ["기타", "guitar"],
    tasks: ["크로매틱 연습"],
    bgmQueries: ["60fps 메트로놈"],
    minMin: 10,
    fixedMin: 30,
    note: "최대 30분 / 크로매틱 연습",
    showVideos: true,
  },
  {
    id: "drawing",
    name: "🎨 그림 (드로잉/크로키)",
    aliases: ["그림", "드로잉", "크로키", "drawing"],
    tasks: ["아이패드 드로잉", "크로키"],
    bgmQueries: ["침착맨 라디오", "비주류 초대석", "drum and bass playlist"],
    minMin: 30,
    fixedMin: null,
    note: "아이패드 드로잉 or 크로키 / BGM 틀어놓고",
    showVideos: true,
  },
  {
    id: "study",
    name: "📚 공부/독서",
    aliases: ["공부", "독서", "study", "reading"],
    tasks: ["프로그래머의 뇌", "소프트웨어 엔지니어링 가이드북", "쿠버네티스"],
    bgmQueries: ["빗소리 공부 음악 가사없음", "오케스트라 집중 공부 음악", "rain ambience study music no lyrics"],
    minMin: 30,
    fixedMin: null,
    note: "프로그래머의 뇌 · SW엔지니어링 가이드북 · 쿠버네티스",
    showVideos: true,
  },
  {
    id: "movie",
    name: "🎬 영화",
    aliases: ["영화", "movie"],
    tasks: ["위플래쉬", "Boys Before Friends"],
    bgmQueries: [],
    minMin: 90,
    fixedMin: null,
    note: "위플래쉬 · Boys Before Friends",
    showVideos: false,
  },
  {
    id: "drama",
    name: "📺 드라마",
    aliases: ["드라마", "series", "drama"],
    tasks: ["Two Broke Girls", "Orange is the New Black"],
    bgmQueries: [],
    minMin: 30,
    fixedMin: null,
    note: "Two Broke Girls · OITNB",
    showVideos: false,
  },
];

export function normalizeHobby(hobby, fallback = {}) {
  if (!hobby || typeof hobby !== "object") {
    return null;
  }

  const id = hobby.id || fallback.id;
  const name = hobby.name || fallback.name;

  if (!id || !name) {
    return null;
  }

  const tasks = Array.isArray(hobby.tasks)
    ? hobby.tasks.filter(Boolean)
    : Array.isArray(fallback.tasks)
      ? fallback.tasks
      : typeof hobby.note === "string" && hobby.note.trim()
        ? [hobby.note.trim()]
        : [];

  const bgmQueries = Array.isArray(hobby.bgmQueries)
    ? hobby.bgmQueries.filter(Boolean)
    : Array.isArray(hobby.queries)
      ? hobby.queries.filter(Boolean)
      : Array.isArray(fallback.bgmQueries)
        ? fallback.bgmQueries
        : [];

  return {
    id,
    name,
    aliases: Array.isArray(hobby.aliases)
      ? hobby.aliases.filter(Boolean)
      : Array.isArray(fallback.aliases)
        ? fallback.aliases
        : [],
    tasks,
    bgmQueries,
    minMin: Number.isFinite(hobby.minMin) ? hobby.minMin : fallback.minMin ?? 0,
    fixedMin:
      hobby.fixedMin === null || Number.isFinite(hobby.fixedMin)
        ? hobby.fixedMin
        : fallback.fixedMin ?? null,
    note: typeof hobby.note === "string" ? hobby.note : fallback.note ?? "",
    showVideos:
      typeof hobby.showVideos === "boolean"
        ? hobby.showVideos
        : typeof fallback.showVideos === "boolean"
          ? fallback.showVideos
          : bgmQueries.length > 0,
  };
}

export function hydrateHobbies(rawValue) {
  const baseMap = new Map(DEFAULT_HOBBIES.map((hobby) => [hobby.id, hobby]));

  if (!rawValue) {
    return DEFAULT_HOBBIES;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return DEFAULT_HOBBIES;
    }

    const normalized = parsed
      .map((item) => normalizeHobby(item, baseMap.get(item?.id) ?? {}))
      .filter(Boolean);

    return normalized.length > 0 ? normalized : DEFAULT_HOBBIES;
  } catch {
    return DEFAULT_HOBBIES;
  }
}
