const { test, expect } = require("@playwright/test");

const FIXED_TIME = "2026-06-20T08:00:00+09:00";

function sseBody(events) {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

async function freezeTime(page) {
  await page.addInitScript((fixedTime) => {
    const fixed = new Date(fixedTime).valueOf();
    const OriginalDate = Date;

    class MockDate extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixed);
          return;
        }
        super(...args);
      }

      static now() {
        return fixed;
      }
    }

    MockDate.UTC = OriginalDate.UTC;
    MockDate.parse = OriginalDate.parse;
    globalThis.Date = MockDate;
  }, FIXED_TIME);
}

test.describe("Copilot SDK browser integration", () => {
  test("setup flow posts selected hobby context to the SDK-backed setup route", async ({
    page,
  }) => {
    const setupRequests = [];

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.route("**/api/setup-chat", async (route) => {
      const request = route.request();
      setupRequests.push({
        method: request.method(),
        headers: request.headers(),
        body: JSON.parse(request.postData() || "{}"),
      });

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody([
          {
            type: "delta",
            content:
              "좋아요! 기타 루틴부터 정리해볼게요.\n\n[크로매틱 연습] [코드 연습]",
          },
          { type: "done" },
        ]),
      });
    });

    await page.goto("/setup");
    await page.getByRole("button", { name: "기타", exact: true }).click();

    await expect(
      page.getByText("좋아요! 기타 루틴부터 정리해볼게요."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "크로매틱 연습" }),
    ).toBeVisible();
    expect(setupRequests).toHaveLength(1);
    expect(setupRequests[0].method).toBe("POST");
    expect(setupRequests[0].headers["content-type"]).toContain(
      "application/json",
    );
    expect(setupRequests[0].body).toEqual(
      expect.objectContaining({
        message: "기타",
        context: expect.objectContaining({
          stage: "select-hobby",
          currentHobby: "🎸 기타 연습",
          selectedHobbies: expect.arrayContaining([
            expect.objectContaining({
              id: "guitar",
              name: "🎸 기타 연습",
              tasks: ["크로매틱 연습"],
              bgmQueries: ["60fps 메트로놈"],
            }),
          ]),
        }),
      }),
    );
  });

  test("main routine flow posts free-time and hobby context to the SDK-backed routine route", async ({
    page,
  }) => {
    const routineRequests = [];

    await freezeTime(page);
    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.route("**/api/routine-chat", async (route) => {
      const request = route.request();
      routineRequests.push({
        method: request.method(),
        headers: request.headers(),
        body: JSON.parse(request.postData() || "{}"),
      });

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody([
          {
            type: "delta",
            content: "퇴근 후 3시간 30분 안에서 기타 연습을 가볍게 해보세요.",
          },
          { type: "done" },
        ]),
      });
    });

    await page.goto("/");
    await page.getByRole("button", { name: /하루 시작/i }).click();
    await page.getByRole("button", { name: /아니, 안 가/i }).click();
    await page.getByRole("button", { name: "19시 30분 보통 마무리" }).click();
    await page.getByRole("button", { name: /재택이야/i }).click();

    await expect(page.getByText("AI 루틴 추천")).toBeVisible();
    await expect(page.getByText(/기타 연습을 가볍게/)).toBeVisible();
    expect(routineRequests).toHaveLength(1);
    expect(routineRequests[0].method).toBe("POST");
    expect(routineRequests[0].headers["content-type"]).toContain(
      "application/json",
    );
    expect(routineRequests[0].body).toEqual(
      expect.objectContaining({
        message: expect.stringContaining("출근 전 자유시간 0분"),
        context: expect.objectContaining({
          preMin: 0,
          postMin: 270,
          workEnd: "19:30",
          remote: true,
          swimming: false,
          hobbies: expect.arrayContaining([
            expect.objectContaining({
              id: "guitar",
              name: "🎸 기타 연습",
              bgmQueries: ["60fps 메트로놈"],
            }),
          ]),
        }),
      }),
    );
  });
});
