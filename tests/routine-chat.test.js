import { describe, expect, it } from "vitest";
import { fallbackRecommendation } from "../app/api/routine-chat/route.js";

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
