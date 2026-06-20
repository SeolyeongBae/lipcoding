import { DEFAULT_HOBBIES } from "./defaultHobbies";

export const SETUP_COPY = {
  initialAssistantMessage: [
    "안녕하세요! 같이 취미 루틴을 다듬어볼게요 😊",
    "먼저 자주 하고 싶은 취미를 골라주세요. 버튼을 눌러도 되고 직접 입력해도 괜찮아요.",
    "[기타] [그림] [공부] [영화] [드라마] [스트레칭]",
  ].join("\n\n"),
  helperText: {
    selectHobby: "하고 싶은 취미를 자유롭게 말하거나 태그를 눌러보세요.",
    done: "원하면 다른 취미를 더 추가하거나, 바로 저장하고 시작할 수 있어요.",
  },
  placeholders: {
    selectHobby: "예: 기타, 그림, 공부",
    collectTasks: "예: 크로매틱 연습, 코드 연습",
    collectBgm: "예: 60fps 메트로놈, 빗소리",
  },
};

export function normalizeToken(value) {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

export function splitListInput(value) {
  return value
    .split(/\n|,|\/|·|\|/)
    .map((item) => item.replace(/^[-•\s]+/, "").trim())
    .filter(Boolean);
}

export function extractTagLabels(content) {
  return Array.from(content.matchAll(/\[([^\]]+)\]/g), (match) =>
    match[1].trim(),
  );
}

export function buildMessageParts(content) {
  const parts = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content))) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }
    parts.push({ type: "tag", value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts;
}

export function createCustomHobby(name) {
  const trimmedName = name.trim();
  return {
    id: `custom-${trimmedName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
    name: trimmedName,
    aliases: [trimmedName],
    tasks: [],
    bgmQueries: [],
    minMin: 10,
    fixedMin: null,
    note: "",
    showVideos: false,
  };
}

export function mergeSelectedHobbies(currentHobbies, pickedHobbies) {
  const existing = new Map(currentHobbies.map((hobby) => [hobby.id, hobby]));
  const next = [...currentHobbies];

  for (const hobby of pickedHobbies) {
    if (existing.has(hobby.id)) continue;
    next.push({
      ...hobby,
      aliases: [...(hobby.aliases ?? [])],
      tasks: [...hobby.tasks],
      bgmQueries: [...hobby.bgmQueries],
    });
  }

  return next;
}

export function updateHobbyList(currentHobbies, hobbyId, updater) {
  return currentHobbies.map((hobby) =>
    hobby.id === hobbyId ? updater(hobby) : hobby,
  );
}

export function findCatalogMatches(content, catalog = DEFAULT_HOBBIES) {
  const normalizedContent = normalizeToken(content);

  return catalog.filter((hobby) => {
    const tokens = [hobby.name, ...(hobby.aliases ?? [])];
    return tokens.some((token) =>
      normalizedContent.includes(normalizeToken(token)),
    );
  });
}

export function resolveSelectedHobbies(content, catalog = DEFAULT_HOBBIES) {
  const tagTokens = extractTagLabels(content);
  const listTokens = splitListInput(content);
  const tokens = [...tagTokens, ...listTokens];
  const resolved = [];
  const seen = new Set();

  for (const token of tokens) {
    for (const hobby of findCatalogMatches(token, catalog)) {
      if (seen.has(hobby.id)) continue;
      seen.add(hobby.id);
      resolved.push(hobby);
    }
  }

  if (resolved.length > 0) return resolved;

  for (const hobby of findCatalogMatches(content, catalog)) {
    if (seen.has(hobby.id)) continue;
    seen.add(hobby.id);
    resolved.push(hobby);
  }

  return resolved.length > 0 ? resolved : [createCustomHobby(content)];
}

export function getSetupHelperText(stage, currentHobby) {
  if (stage === "collect-tasks" && currentHobby) {
    return `${currentHobby.name}에서 어떤 세부 할 일을 할지 적어주세요.`;
  }
  if (stage === "collect-bgm" && currentHobby) {
    return `${currentHobby.name} 할 때 듣는 BGM이나 유튜브 검색어를 알려주세요.`;
  }
  if (stage === "done") return SETUP_COPY.helperText.done;
  return SETUP_COPY.helperText.selectHobby;
}

export function getSetupInputPlaceholder(stage) {
  if (stage === "collect-tasks") return SETUP_COPY.placeholders.collectTasks;
  if (stage === "collect-bgm") return SETUP_COPY.placeholders.collectBgm;
  return SETUP_COPY.placeholders.selectHobby;
}
