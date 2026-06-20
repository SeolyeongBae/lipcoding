const { test, expect } = require("@playwright/test");

const FIXED_TIME = "2026-06-20T08:00:00+09:00";

test.describe("main page routine flow", () => {
  test.beforeEach(async ({ page }) => {
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

    await page.route("**/api/routine-chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      if (body.action === "plan") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            source: "copilot-sdk-tool",
            tool: "routine_plan",
            plan: {
              source: "copilot-sdk-tool",
              toolName: "routine_plan",
              status: "ok",
              totalMin: 40,
              availableMin: 270,
              feedback:
                "업무 후 4시간 30분 안에서 선택한 활동 뒤에 스트레칭까지 더하면 남는 시간이 애매하지 않아요.",
              entries: [
                {
                  hobbyId: "guitar",
                  hobbyName: "🎸 기타 연습",
                  taskLabels: ["크로매틱 연습"],
                  durationMin: 30,
                  startLabel: "19:30",
                  endLabel: "20:00",
                  isSuggested: false,
                  reason: "기타 연습 활동은 30분 안에 끝낼 수 있어 오늘 선택과 잘 맞아요.",
                },
                {
                  hobbyId: "stretching",
                  hobbyName: "🧘 스트레칭",
                  taskLabels: ["허벅지/골반/어깨 스트레칭"],
                  durationMin: 10,
                  startLabel: "20:00",
                  endLabel: "20:10",
                  isSuggested: true,
                  reason: "남는 시간이 있어 바로 이어 하기 쉬운 스트레칭도 더했어요.",
                },
              ],
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          videos: [
            {
              id: "abc123",
              title: "60fps 메트로놈 120bpm",
              thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
              channel: "Routine Picks",
              url: "https://www.youtube.com/watch?v=abc123",
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test("loads, builds a timetable, picks videos, and shows the current-time main screen", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "myroutine" })).toBeVisible();
    await expect(
      page.getByText("오늘 루틴에 맞는 영상을 골라볼게요"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "⚙️ 취미 설정" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /하루 시작/i }).click();
    await page.getByRole("button", { name: /아니, 안 가/i }).click();
    await page.getByRole("button", { name: "19시 30분 보통 마무리" }).click();
    await page.getByRole("button", { name: /재택이야/i }).click();

    const guitarButtons = page.getByRole("button", { name: /🎸 기타 연습/ });
    await expect(guitarButtons.first()).toBeVisible();
    await guitarButtons.first().click();

    await expect(page.getByText("이번에 해볼 것")).toBeVisible();
    await expect(page.getByLabel("크로매틱 연습")).toBeChecked();
    await expect(page.getByRole("button", { name: "추천 시간표 만들기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "60fps 메트로놈", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "추천 시간표 만들기" }).click();
    await expect(page.getByText("스크립트 추천")).toBeVisible();
    await expect(page.getByText("Copilot SDK tool · routine_plan")).toBeVisible();
    await expect(page.getByText("이 시간표로 해볼까요?")).toBeVisible();
    await page.getByRole("button", { name: /Yes, 이대로 할래요/ }).click();

    await expect(
      page.getByText("각 활동에 맞는 YouTube를 하나씩 골라주세요"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /60fps 메트로놈 120bpm/ }),
    ).toHaveCount(0);

    await expect(page.getByLabel("60fps 메트로놈 120bpm")).toBeVisible();
    await page.getByLabel("60fps 메트로놈 120bpm").check();
    await page
      .getByRole("button", { name: /스트레칭/ })
      .filter({ hasText: "영상 1개를 골라주세요" })
      .click();
    await page.getByLabel("60fps 메트로놈 120bpm").check();

    await expect(page.getByText("이렇게 하시겠습니까?")).toBeVisible();
    await page.getByRole("button", { name: "네, 오늘은 이렇게 할래요" }).click();

    await expect(page.getByText("지금은 일하고 있는 시간이에요")).toBeVisible();
    await expect(page.getByText("오늘 확정한 시간표")).toBeVisible();
    await expect(
      page
        .locator(".ds-today-log__item")
        .filter({ hasText: "🎸 기타 연습" })
        .getByText("60fps 메트로놈 120bpm"),
    ).toBeVisible();

    const storedLog = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("todayLog")),
    );
    expect(storedLog.date).toBe("2026-06-20");
    expect(storedLog.confirmedAt).toBeTruthy();
    expect(storedLog.entries).toHaveLength(2);
    const guitarEntry = storedLog.entries.find(
      (entry) => entry.hobbyId === "guitar",
    );
    const suggestedEntry = storedLog.entries.find(
      (entry) => entry.source === "script-suggested",
    );
    expect(guitarEntry.taskLabels).toEqual(["크로매틱 연습"]);
    expect(guitarEntry.videoId).toBe("abc123");
    expect(guitarEntry.durationMin).toBe(30);
    expect(suggestedEntry.hobbyId).toBe("stretching");
    expect(suggestedEntry.videoId).toBe("abc123");
  });
});
