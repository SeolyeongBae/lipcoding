import { CopilotClient } from "@github/copilot-sdk";

let client = null;
let session = null;
let initPromise = null;

const SETUP_SYSTEM_MESSAGE = `
<setup_rules>
- 항상 한국어로만 답변하세요.
- 당신은 사용자의 루틴 앱 설정을 도와주는 따뜻한 취미 코치입니다.
- 사용자가 취미, 세부 할 일, BGM/유튜브 검색어를 편하게 말하도록 도와주세요.
- 추천 버튼이 필요할 때는 반드시 [태그1] [태그2] [태그3] 형식으로만 제안하세요.
- 한 번에 질문은 하나씩만 하고, 짧고 다정하게 반응하세요.
- 사용자가 답한 내용을 요약해서 인정한 뒤 다음 질문으로 이어가세요.
- 완료 단계에서는 수집된 취미를 짧게 요약하고 저장 버튼을 눌러 시작하라고 안내하세요.
</setup_rules>
`;

function summarizeHobbies(hobbies = []) {
  if (!Array.isArray(hobbies) || hobbies.length === 0) return "아직 선택된 취미 없음";

  return hobbies
    .map((hobby) => {
      const tasks = Array.isArray(hobby.tasks) && hobby.tasks.length > 0
        ? hobby.tasks.join(", ")
        : "미정";
      const bgm = Array.isArray(hobby.bgmQueries) && hobby.bgmQueries.length > 0
        ? hobby.bgmQueries.join(", ")
        : "없음";
      return `- ${hobby.name} | 할 일: ${tasks} | BGM: ${bgm}`;
    })
    .join("\n");
}

function buildPrompt(message, context = {}) {
  const stageLabels = {
    "select-hobby": "취미 선택",
    "collect-tasks": "세부 할 일 수집",
    "collect-bgm": "BGM 수집",
    done: "설정 마무리",
  };

  return `
사용자 입력:
${message}

현재 설정 상태:
- 단계: ${stageLabels[context.stage] ?? context.stage ?? "취미 선택"}
- 지금 설정 중인 취미: ${context.currentHobby ?? "없음"}
- 다음으로 이어질 취미: ${context.nextHobby ?? "없음"}
- 방금 정리된 세부 할 일: ${Array.isArray(context.latestTasks) && context.latestTasks.length > 0 ? context.latestTasks.join(", ") : "없음"}
- 방금 정리된 BGM/영상 검색어: ${Array.isArray(context.latestBgm) && context.latestBgm.length > 0 ? context.latestBgm.join(", ") : "없음"}
- 현재까지 모인 취미 초안:
${summarizeHobbies(context.selectedHobbies)}

응답 규칙:
- 2~4문장으로 답하세요.
- 다음 질문이 필요하면 딱 하나만 하세요.
- 태그 추천이 있으면 마지막 줄에만 [태그1] [태그2] 형식으로 제안하세요.
- 단계가 "취미 선택"이면 취미 후보를, "세부 할 일 수집"이면 구체적인 할 일을, "BGM 수집"이면 유튜브/BGM 검색어를 제안하세요.
- 단계가 "설정 마무리"이면 요약과 저장 안내에 집중하세요.
`;
}

async function getSession() {
  if (session) return session;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    client = new CopilotClient();
    session = await client.createSession({
      model: "auto",
      streaming: true,
      systemMessage: {
        content: SETUP_SYSTEM_MESSAGE,
      },
    });
    return session;
  })();

  return initPromise;
}

export async function GET() {
  return Response.json({ status: "ok", route: "setup-chat" });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const { message, context = {} } = body;

  if (!message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let unsubscribers = [];

      try {
        const activeSession = await getSession();

        unsubscribers = [
          activeSession.on("assistant.message_delta", (event) => {
            send({ type: "delta", content: event.data.deltaContent });
          }),
          activeSession.on("session.idle", () => {
            send({ type: "done" });
          }),
        ];

        await activeSession.sendAndWait({
          prompt: buildPrompt(message, context),
        });
      } catch (err) {
        send({ type: "error", message: err.message });
      } finally {
        unsubscribers.forEach((unsubscribe) => unsubscribe?.());
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
