import { CopilotClient } from "@github/copilot-sdk";

const SYSTEM_PROMPT = [
  "너는 개인 루틴 앱의 따뜻한 하루 코치야.",
  "항상 한국어로 답하고, 사용자의 남은 자유시간과 취미 목록을 바탕으로 자연스러운 하루 루틴을 추천해.",
  "말투는 다정하고 개인적이며 응원하는 느낌으로 유지해.",
  "응답은 최대 3문장으로 짧고 명확하게 작성해.",
].join(" ");

const FALLBACK_ACTIVITY_NAMES = ["기타 연습", "책 읽기", "드로잉", "가벼운 스트레칭", "드라마 한 편"];

let client;

function getClient() {
  if (!client) {
    client = new CopilotClient();
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

function fallbackRecommendation(context = {}) {
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

  return `오늘 출근 전 ${formatMin(preMin)} 정도 여유가 있네요! ${firstPick}${preMin >= 60 ? "부터" : "를"} 가볍게 시작하고 ${secondPick}까지 이어가면 하루 리듬이 예쁘게 잡힐 것 같아요. ${postMin > 0 ? `퇴근 후 ${formatMin(postMin)}에는 ${eveningPick}처럼 편하게 몰입할 시간을 남겨두면 좋겠어요 😊` : "오늘도 무리하지 말고 작은 루틴 하나만 챙겨봐요 😊"}`;
}

function emit(controller, encoder, data) {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function GET() {
  return Response.json({ status: "ok", route: "routine-chat" });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { message, context } = body;

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

        await session.sendAndWait({ prompt: message });
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
