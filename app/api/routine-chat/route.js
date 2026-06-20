import { defineTool } from "@github/copilot-sdk";
import { createCopilotClient } from "../../../src/copilotClient";
import { buildRoutinePlanDraft } from "../../../src/routinePlanner";
import { searchYouTubeVideos } from "../../../src/youtubeSearch";

const SYSTEM_PROMPT = [
  "너는 RoutineTube의 Copilot agent야.",
  "항상 한국어로 답하고, 사용자의 남은 자유시간과 취미 목록을 바탕으로 자연스러운 하루 루틴을 추천해.",
  "시간표를 만들 때는 routine_plan tool을 사용하고, 영상 후보가 필요하면 youtube_search tool을 사용해.",
  "tool 결과를 바탕으로 왜 이 루틴과 영상이 생산성에 맞는지 짧게 설명해.",
  "출근 전 자유시간이 0분이면 절대 출근 전 여유가 있다고 말하지 말고, 아침에는 준비에 집중하라고 안내해.",
  "응답은 최대 3문장으로 짧고 명확하게 작성해.",
].join(" ");

const FALLBACK_ACTIVITY_NAMES = ["기타 연습", "책 읽기", "드로잉", "가벼운 스트레칭", "드라마 한 편"];

export async function buildRoutinePlanToolResult(context = {}) {
  return buildRoutinePlanDraft(context);
}

export async function searchYoutubeToolResult({ query, maxResults } = {}) {
  return searchYouTubeVideos({
    query,
    maxResults,
    apiKey: process.env.YOUTUBE_API_KEY,
  });
}

const routinePlanTool = defineTool("routine_plan", {
  description:
    "Build a feasible RoutineTube timetable from selected hobbies, task selections, and available free-time windows.",
  parameters: {
    type: "object",
    properties: {
      hobbies: { type: "array", description: "Available hobby definitions" },
      selectedHobbyIds: {
        type: "array",
        items: { type: "string" },
        description: "Hobby IDs the user explicitly selected",
      },
      taskSelections: {
        type: "object",
        description: "Selected task labels keyed by hobby ID",
      },
      freeTime: {
        type: "object",
        description: "Computed day free-time context including total and postStartStr",
      },
      swimming: { type: "boolean" },
      isRemote: { type: "boolean" },
    },
    required: ["hobbies", "selectedHobbyIds", "taskSelections", "freeTime"],
  },
  handler: buildRoutinePlanToolResult,
});

const youtubeSearchTool = defineTool("youtube_search", {
  description:
    "Search YouTube videos for a routine activity and return candidate videos with metadata.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "YouTube search query" },
      maxResults: { type: "number", description: "Maximum videos to return" },
    },
    required: ["query"],
  },
  handler: searchYoutubeToolResult,
});

let client;

function getClient() {
  if (!client) {
    client = createCopilotClient();
  }
  return client;
}

function formatMin(min) {
  if (min <= 0) return "0분";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function stripEmojiPrefix(name = "") {
  return name.replace(/^[^\p{L}\p{N}]+/u, "").trim() || name;
}

export function fallbackRecommendation(context = {}) {
  const hobbies = Array.isArray(context.hobbies) ? context.hobbies : [];
  const preMin = Number.isFinite(context.preMin) ? context.preMin : 0;
  const postMin = Number.isFinite(context.postMin) ? context.postMin : 0;
  const available = hobbies.filter(
    (hobby) => Number.isFinite(hobby?.minMin) && hobby.minMin <= Math.max(preMin, postMin),
  );

  const picks = available.slice(0, 3).map((hobby) => stripEmojiPrefix(hobby.name));
  const firstPick = picks[0] || FALLBACK_ACTIVITY_NAMES[0];
  const secondPick = picks[1] || FALLBACK_ACTIVITY_NAMES[1];
  const eveningPick = picks[2] || FALLBACK_ACTIVITY_NAMES[4];

  if (preMin <= 0 && postMin <= 0) {
    return "오늘은 출근 전에도 퇴근 후에도 남는 자유시간이 거의 없어요. 루틴을 억지로 넣기보다 내일 할 일을 하나만 골라두고 푹 쉬어도 충분해요 😊";
  }

  if (preMin <= 0) {
    return `오늘 출근 전에는 여유 시간이 없으니 아침엔 준비에 집중해도 좋아요. 퇴근 후 ${formatMin(postMin)}에는 ${firstPick}처럼 바로 시작하기 쉬운 루틴 하나만 가볍게 챙겨봐요 😊`;
  }

  if (postMin <= 0) {
    return `오늘 출근 전 ${formatMin(preMin)}이 남아 있어요. ${firstPick}${preMin >= 60 ? "부터" : "를"} 가볍게 시작하되, 퇴근 후엔 무리해서 더 채우지 않아도 괜찮아요 😊`;
  }

  return `오늘 출근 전 ${formatMin(preMin)}이 남아 있어요. ${firstPick}${preMin >= 60 ? "부터" : "를"} 가볍게 시작하고, 퇴근 후 ${formatMin(postMin)}에는 ${secondPick || eveningPick}처럼 편하게 이어가면 좋아요 😊`;
}

function emit(controller, encoder, data) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

function buildAgentPrompt(message, context = {}) {
  return `
사용자 메시지:
${message}

현재 RoutineTube 컨텍스트:
${JSON.stringify(context, null, 2)}

반드시 필요한 경우 routine_plan, youtube_search tool을 호출해서 답변하세요.
`;
}

export async function GET() {
  return Response.json({
    status: "ok",
    route: "routine-chat",
    tools: ["routine_plan", "youtube_search"],
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { message, context = {}, action, query, maxResults } = body;

  if (action === "plan") {
    const plan = await buildRoutinePlanToolResult(context);
    return Response.json({ plan, tool: "routine_plan", source: "copilot-sdk-tool" });
  }

  if (action === "youtube") {
    if (!query) {
      return Response.json({ error: "query is required" }, { status: 400 });
    }
    const result = await searchYoutubeToolResult({ query, maxResults });
    return Response.json(result);
  }

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let session;
      let unsubDelta = () => {};
      let unsubIdle = () => {};
      let finished = false;

      try {
        session = await getClient().createSession({
          model: "auto",
          streaming: true,
          systemMessage: {
            mode: "append",
            content: SYSTEM_PROMPT,
          },
          tools: [routinePlanTool, youtubeSearchTool],
        });

        unsubDelta = session.on("assistant.message_delta", (event) => {
          emit(controller, encoder, { type: "delta", content: event.data.deltaContent });
        });
        unsubIdle = session.on("session.idle", () => {
          if (!finished) {
            finished = true;
            emit(controller, encoder, { type: "done" });
          }
        });

        await session.sendAndWait({ prompt: buildAgentPrompt(message, context) });
      } catch {
        emit(controller, encoder, {
          type: "delta",
          content: fallbackRecommendation(context),
        });
        emit(controller, encoder, { type: "done" });
        finished = true;
      } finally {
        unsubDelta();
        unsubIdle();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
