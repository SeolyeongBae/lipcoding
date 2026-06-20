function pad(n) {
  return String(n).padStart(2, "0");
}

export function formatRoutineMin(min) {
  if (min <= 0) return "0분";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function getPlanMinutes(hobby) {
  return hobby?.fixedMin ?? hobby?.minMin ?? 0;
}

export function parseTimeToMin(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function formatClockLabel(minutes) {
  const normalized = Math.min(minutes, 24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${pad(h)}:${pad(m)}`;
}

export function stripEmojiPrefix(name = "") {
  return name.replace(/^[^\p{L}\p{N}]+/u, "").trim() || name;
}

export function buildRoutinePlanDraft({
  hobbies = [],
  selectedHobbyIds = [],
  taskSelections = {},
  freeTime,
  swimming,
  isRemote,
}) {
  const selectedIdSet = new Set(selectedHobbyIds);
  const selectedHobbies = selectedHobbyIds
    .map((id) => hobbies.find((hobby) => hobby.id === id))
    .filter(Boolean);
  const availableMin = freeTime?.total ?? 0;
  const postLabel = swimming ? "수영 후" : isRemote ? "업무 후" : "퇴근 후";
  const startMin = freeTime?.postStartStr ? parseTimeToMin(freeTime.postStartStr) : 0;
  const selectedTotal = selectedHobbies.reduce(
    (total, hobby) => total + getPlanMinutes(hobby),
    0,
  );
  const remainingAfterSelected = availableMin - selectedTotal;
  const addOn =
    remainingAfterSelected > 0
      ? hobbies
          .filter(
            (hobby) =>
              !selectedIdSet.has(hobby.id) &&
              getPlanMinutes(hobby) <= remainingAfterSelected,
          )
          .sort((a, b) => getPlanMinutes(a) - getPlanMinutes(b))[0]
      : null;
  const planHobbies = addOn ? [...selectedHobbies, addOn] : selectedHobbies;
  let cursor = startMin;
  const entries = planHobbies.map((hobby) => {
    const durationMin = getPlanMinutes(hobby);
    const entry = {
      hobbyId: hobby.id,
      hobbyName: hobby.name,
      taskLabels:
        taskSelections[hobby.id]?.length > 0
          ? taskSelections[hobby.id]
          : hobby.tasks,
      durationMin,
      startLabel: formatClockLabel(cursor),
      endLabel: formatClockLabel(cursor + durationMin),
      isSuggested: hobby.id === addOn?.id,
      reason:
        hobby.id === addOn?.id
          ? `${formatRoutineMin(remainingAfterSelected)}이 남아서 바로 이어 하기 쉬운 ${stripEmojiPrefix(hobby.name)}도 더했어요.`
          : `${stripEmojiPrefix(hobby.name)} 활동은 ${formatRoutineMin(durationMin)} 안에 끝낼 수 있어 오늘 선택과 잘 맞아요.`,
    };
    cursor += durationMin;
    return entry;
  });
  const totalMin = entries.reduce((total, entry) => total + entry.durationMin, 0);
  const status = totalMin > availableMin ? "over" : "ok";
  const feedback =
    status === "over"
      ? `선택한 활동만으로 오늘 자유시간보다 ${formatRoutineMin(totalMin - availableMin)} 길어요. 하나를 빼거나 짧은 활동으로 바꾸면 좋아요.`
      : addOn
        ? `${postLabel} ${formatRoutineMin(availableMin)} 중 ${formatRoutineMin(totalMin)}을 쓰는 흐름이에요. 선택한 활동 뒤에 ${stripEmojiPrefix(addOn.name)}까지 더하면 남는 시간이 애매하지 않아요.`
        : `${postLabel} ${formatRoutineMin(availableMin)} 안에서 선택한 활동만 깔끔하게 들어가요. 오늘은 더 넣기보다 이 정도로 마무리해도 좋아요.`;

  return {
    entries,
    feedback,
    status,
    totalMin,
    availableMin,
    source: "copilot-sdk-tool",
    toolName: "routine_plan",
  };
}
