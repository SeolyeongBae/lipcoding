import { describe, expect, it } from "vitest";
import { fallbackSetupReply } from "../app/api/setup-chat/route.js";

describe("setup-chat fallback reply", () => {
  it("suggests task tags after a hobby is selected", () => {
    const text = fallbackSetupReply("기타", {
      stage: "select-hobby",
      currentHobby: "🎸 기타 연습",
      selectedHobbies: [
        {
          name: "🎸 기타 연습",
          tasks: ["크로매틱 연습", "코드 연습"],
        },
      ],
    });

    expect(text).toContain("🎸 기타 연습 루틴부터");
    expect(text).toContain("[크로매틱 연습] [코드 연습]");
  });

  it("suggests BGM tags after tasks are collected", () => {
    const text = fallbackSetupReply("크로매틱 연습", {
      stage: "collect-tasks",
      currentHobby: "🎸 기타 연습",
      latestTasks: ["크로매틱 연습"],
      selectedHobbies: [
        {
          name: "🎸 기타 연습",
          bgmQueries: ["60fps 메트로놈"],
        },
      ],
    });

    expect(text).toContain("할 일은 크로매틱 연습");
    expect(text).toContain("[60fps 메트로놈]");
  });
});
