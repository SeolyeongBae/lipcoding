import { describe, expect, it } from "vitest";
import {
  buildRoutinePlanToolResult,
  fallbackRecommendation,
  searchYoutubeToolResult,
} from "../app/api/routine-chat/route.js";

describe("routine-chat fallback recommendation", () => {
  it("does not describe 0 pre-work minutes as available time", () => {
    const text = fallbackRecommendation({
      preMin: 0,
      postMin: 30,
      hobbies: [{ name: "🎸 기타 연습", minMin: 10 }],
    });

    expect(text).toContain("출근 전에는 여유 시간이 없으니");
    expect(text).not.toContain("출근 전 0분 정도 여유");
  });

  it("avoids recommending a routine when no free time remains", () => {
    const text = fallbackRecommendation({
      preMin: 0,
      postMin: 0,
      hobbies: [{ name: "🎸 기타 연습", minMin: 10 }],
    });

    expect(text).toContain("남는 자유시간이 거의 없어요");
    expect(text).not.toContain("여유가 있네요");
  });
});

describe("routine-chat SDK tool handlers", () => {
  it("builds a routine plan through the routine_plan tool handler", async () => {
    const plan = await buildRoutinePlanToolResult({
      hobbies: [
        {
          id: "guitar",
          name: "🎸 기타 연습",
          tasks: ["크로매틱 연습"],
          minMin: 10,
          fixedMin: 30,
        },
      ],
      selectedHobbyIds: ["guitar"],
      taskSelections: { guitar: ["크로매틱 연습"] },
      freeTime: { total: 60, postStartStr: "19:30" },
      swimming: false,
      isRemote: true,
    });

    expect(plan.toolName).toBe("routine_plan");
    expect(plan.source).toBe("copilot-sdk-tool");
    expect(plan.entries[0]).toEqual(
      expect.objectContaining({
        hobbyId: "guitar",
        startLabel: "19:30",
        endLabel: "20:00",
      }),
    );
  });

  it("searches YouTube through the youtube_search tool handler with fallback videos", async () => {
    const result = await searchYoutubeToolResult({
      query: "60fps 메트로놈",
      maxResults: 2,
    });

    expect(result.toolName).toBe("youtube_search");
    expect(result.source).toBe("copilot-sdk-tool");
    expect(result.videos).toHaveLength(2);
  });
});
