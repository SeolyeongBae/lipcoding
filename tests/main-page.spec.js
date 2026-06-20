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
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body:
          'data: {"type":"delta","content":"오늘 출근 전 1시간 30분이 있네요! 기타 연습(30분)하고 책 읽기(1시간) 어때요? 퇴근 후엔 드라마 한 편 보는 것도 좋겠어요 😊"}\n\n' +
          'data: {"type":"done"}\n\n',
      });
    });

    await page.route("**/api/youtube**", async (route) => {
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

  test("loads, recommends, and adds a selected video to today's plan", async ({ page }) => {
    await expect(page.getByText("좋은 아침이에요!")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "⚙️ 취미 설정" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /하루 시작/i }).click();
    await page.getByRole("button", { name: /아니, 안 가/i }).click();
    await page.getByRole("button", { name: "19시 30분 보통 마무리" }).click();
    await page.getByRole("button", { name: /재택이야/i }).click();

    await expect(page.getByText("AI 루틴 추천")).toBeVisible();
    await expect(page.getByText(/기타 연습\(30분\)하고 책 읽기/)).toBeVisible();

    const guitarButtons = page.getByRole("button", { name: /🎸 기타 연습/ });
    await expect(guitarButtons.first()).toBeVisible();
    await guitarButtons.first().click();

    await expect(page.getByText("이번에 해볼 것")).toBeVisible();
    await expect(page.getByLabel("크로매틱 연습")).toBeChecked();
    await expect(page.getByRole("button", { name: /\+ 선택한 1개 활동/ })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "60fps 메트로놈", exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /60fps 메트로놈 120bpm/ }),
    ).toBeVisible();
    await expect(page.getByTestId("today-log")).toBeVisible();

    await page.getByRole("button", { name: /60fps 메트로놈 120bpm/ }).click();
    const videoDialog = page.getByRole("dialog", { name: /기타 연습/ });
    await expect(videoDialog).toBeVisible();
    await videoDialog.getByRole("button", { name: /오늘 플랜에 담기/ }).click();

    await expect(page.getByTestId("today-log").getByText("60fps 메트로놈 120bpm")).toBeVisible();
    await expect(page.getByTestId("today-log").getByText("🎸 기타 연습")).toBeVisible();
    await expect(page.getByText("오늘 담은 시간")).toBeVisible();
    await expect(
      page.getByTestId("today-log").getByText("30분", { exact: true }),
    ).toBeVisible();
    await expect(guitarButtons.first()).toBeVisible();

    const storedLog = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("todayLog")),
    );
    expect(storedLog.date).toBe("2026-06-20");
    expect(storedLog.entries).toHaveLength(1);
    expect(storedLog.entries[0].hobbyId).toBe("guitar");
    expect(storedLog.entries[0].taskLabels).toEqual(["크로매틱 연습"]);
    expect(storedLog.entries[0].videoId).toBe("abc123");
    expect(storedLog.entries[0].durationMin).toBe(30);
  });
});
