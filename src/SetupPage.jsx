"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_HOBBIES, HOBBIES_STORAGE_KEY } from "./defaultHobbies";
import { useSetupChat } from "./hooks/useSetupChat";
import {
  SETUP_COPY,
  buildMessageParts,
  getSetupHelperText,
  getSetupInputPlaceholder,
  mergeSelectedHobbies,
  resolveSelectedHobbies,
  splitListInput,
  updateHobbyList,
} from "./setupFlow";
import "./SetupPage.css";

function loadStoredHobbies() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(HOBBIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function MessageBubble({ message, onTagClick, disableTags }) {
  const parts = buildMessageParts(message.content);
  const hasTags =
    message.role === "assistant" && parts.some((part) => part.type === "tag");

  return (
    <div className={`setup-message setup-message--${message.role}`}>
      <div className="setup-message__avatar" aria-hidden="true">
        {message.role === "assistant" ? "🤖" : "🙂"}
      </div>
      <div className="setup-message__bubble">
        <div className="setup-message__text">
          {parts.map((part, index) => {
            if (part.type === "tag") return null;
            return (
              <span
                key={`${message.role}-text-${index}`}
                className="setup-message__copy"
              >
                {part.value}
              </span>
            );
          })}
          {message.streaming && (
            <span className="setup-message__cursor" aria-hidden="true">
              ▌
            </span>
          )}
        </div>

        {hasTags && (
          <div className="setup-message__tags">
            {parts
              .filter((part) => part.type === "tag")
              .map((part, index) => (
                <button
                  key={`${part.value}-${index}`}
                  type="button"
                  className="setup-tag"
                  onClick={() => onTagClick(part.value)}
                  disabled={disableTags}
                >
                  {part.value}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HobbySummaryCard({ hobby }) {
  return (
    <article className="setup-summary-card">
      <div className="setup-summary-card__header">
        <h3>{hobby.name}</h3>
        <span>
          {hobby.fixedMin ? `${hobby.fixedMin}분 고정` : `${hobby.minMin}분+`}
        </span>
      </div>
      <div className="setup-summary-card__section">
        <strong>할 일</strong>
        <p>
          {hobby.tasks.length > 0 ? hobby.tasks.join(", ") : "아직 정리 전"}
        </p>
      </div>
      <div className="setup-summary-card__section">
        <strong>BGM / 유튜브</strong>
        <p>
          {hobby.bgmQueries.length > 0
            ? hobby.bgmQueries.join(", ")
            : "아직 정리 전"}
        </p>
      </div>
    </article>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const hydratedRef = useRef(false);
  const [draftHobbies, setDraftHobbies] = useState([]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState("select-hobby");
  const [currentHobbyId, setCurrentHobbyId] = useState(null);
  const [queuedHobbyIds, setQueuedHobbyIds] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const { messages, isLoading, error, sendMessage } = useSetupChat({
    initialMessages: [
      { role: "assistant", content: SETUP_COPY.initialAssistantMessage },
    ],
  });

  const currentHobby =
    draftHobbies.find((hobby) => hobby.id === currentHobbyId) ?? null;
  const helperText = getSetupHelperText(stage, currentHobby);
  const inputPlaceholder = getSetupInputPlaceholder(stage);

  useEffect(() => {
    const stored = loadStoredHobbies();
    setDraftHobbies(stored);
    hydratedRef.current = true;
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current || !isHydrated) return;
    window.localStorage.setItem(
      HOBBIES_STORAGE_KEY,
      JSON.stringify(draftHobbies),
    );
  }, [draftHobbies, isHydrated]);

  function saveAndStart() {
    window.localStorage.setItem(
      HOBBIES_STORAGE_KEY,
      JSON.stringify(draftHobbies),
    );
    router.push("/");
  }

  async function submitConversation(rawContent) {
    const content = rawContent.trim();
    if (!content || isLoading) return;

    const activeStage = stage === "done" ? "select-hobby" : stage;

    if (activeStage === "select-hobby") {
      const pickedHobbies = resolveSelectedHobbies(content);
      const nextDraft = mergeSelectedHobbies(draftHobbies, pickedHobbies);
      const nextCurrentId = pickedHobbies[0]?.id ?? null;
      const nextQueue = pickedHobbies.slice(1).map((hobby) => hobby.id);

      setDraftHobbies(nextDraft);
      setCurrentHobbyId(nextCurrentId);
      setQueuedHobbyIds(nextQueue);
      setStage("collect-tasks");

      await sendMessage(content, {
        stage: "select-hobby",
        currentHobby: pickedHobbies[0]?.name,
        selectedHobbies: nextDraft,
      });
      return;
    }

    if (!currentHobby) return;

    if (activeStage === "collect-tasks") {
      const nextTasks = splitListInput(content);
      const nextDraft = updateHobbyList(
        draftHobbies,
        currentHobby.id,
        (hobby) => ({
          ...hobby,
          tasks: nextTasks,
        }),
      );

      setDraftHobbies(nextDraft);
      setStage("collect-bgm");

      await sendMessage(content, {
        stage: "collect-tasks",
        currentHobby: currentHobby.name,
        latestTasks: nextTasks,
        selectedHobbies: nextDraft,
      });
      return;
    }

    const nextBgm = splitListInput(content);
    const nextDraft = updateHobbyList(
      draftHobbies,
      currentHobby.id,
      (hobby) => ({
        ...hobby,
        bgmQueries: nextBgm,
      }),
    );
    const [nextHobbyId, ...restQueue] = queuedHobbyIds;
    const nextHobby =
      nextDraft.find((hobby) => hobby.id === nextHobbyId) ?? null;

    setDraftHobbies(nextDraft);
    setQueuedHobbyIds(restQueue);
    setCurrentHobbyId(nextHobby?.id ?? null);
    setStage(nextHobby ? "collect-tasks" : "done");

    await sendMessage(content, {
      stage: nextHobby ? "collect-bgm" : "done",
      currentHobby: currentHobby.name,
      nextHobby: nextHobby?.name,
      latestBgm: nextBgm,
      selectedHobbies: nextDraft,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    await submitConversation(content);
  }

  async function handleTagClick(tag) {
    await submitConversation(tag);
  }

  return (
    <div className="setup-page">
      <div className="setup-shell">
        <section className="setup-chat-panel">
          <div className="setup-chat-panel__header">
            <div>
              <p className="setup-eyebrow">Page 1 · /setup</p>
              <h1>취미 루틴 설정</h1>
              <p className="setup-subtitle">
                대화하면서 취미, 세부 할 일, BGM을 차근차근 정리해볼게요.
              </p>
            </div>
            <button
              type="button"
              className="setup-home-link"
              onClick={() => router.push("/")}
            >
              홈으로
            </button>
          </div>

          <div className="setup-chat-log" data-testid="setup-chat-log">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                message={message}
                onTagClick={handleTagClick}
                disableTags={isLoading}
              />
            ))}
          </div>

          {error && (
            <div className="setup-error" role="alert">
              ⚠️ {error}
            </div>
          )}

          <div className="setup-helper">{helperText}</div>

          <form className="setup-composer" onSubmit={handleSubmit}>
            <input
              className="setup-composer__input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={inputPlaceholder}
              disabled={isLoading}
              aria-label="설정 입력"
            />
            <button
              type="submit"
              className="setup-composer__submit"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? "생각 중..." : "보내기"}
            </button>
          </form>
        </section>

        <aside className="setup-summary-panel">
          <div className="setup-summary-panel__header">
            <div>
              <p className="setup-eyebrow">현재 저장될 내용</p>
              <h2>취미 요약</h2>
            </div>
            <span className="setup-count">{draftHobbies.length}개</span>
          </div>

          {draftHobbies.length === 0 ? (
            <div className="setup-empty">
              아직 선택한 취미가 없어요. 오른쪽 태그를 눌러 첫 취미를
              골라볼까요?
            </div>
          ) : (
            <div
              className="setup-summary-list"
              data-testid="setup-summary-list"
            >
              {draftHobbies.map((hobby) => (
                <HobbySummaryCard key={hobby.id} hobby={hobby} />
              ))}
            </div>
          )}

          <div className="setup-defaults">
            <h3>빠르게 시작하기</h3>
            <div className="setup-defaults__chips">
              {DEFAULT_HOBBIES.map((hobby) => (
                <button
                  key={hobby.id}
                  type="button"
                  className="setup-tag setup-tag--soft"
                  onClick={() =>
                    handleTagClick(
                      hobby.name.replace(/^[^\s]+\s/, "").split(" ")[0],
                    )
                  }
                  disabled={isLoading}
                >
                  {hobby.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="setup-save-button"
            onClick={saveAndStart}
            disabled={draftHobbies.length === 0}
          >
            저장하고 시작하기
          </button>
          {stage === "done" && draftHobbies.length > 0 && (
            <p className="setup-save-note">
              취미 정리가 끝났어요. 저장하고 홈으로 돌아가 시작해봐요!
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
