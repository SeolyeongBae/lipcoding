const { test, expect } = require("@playwright/test");

function sseBody(events) {
  return events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
}

test.describe("/setup page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test("Page loads and shows initial greeting", async ({ page }) => {
    await page.goto("/setup");

    await expect(
      page.getByText("안녕하세요! 같이 취미 루틴을 다듬어볼게요 😊"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "기타", exact: true }),
    ).toBeVisible();
    await page.route("**/api/setup-chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody([
          {
            type: "delta",
            content:
              "좋아요! 기타 루틴부터 정리해볼게요. 먼저 어떤 세부 할 일을 하나요?\n\n[크로매틱 연습] [코드 연습]",
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
      page.getByRole("button", { name: "크로매틱 연습", exact: true }),
    ).toBeVisible();
  });

  test("Clicking a tag sends a message", async ({ page }) => {
    await page.route("**/api/setup-chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      const reply =
        body.message === "기타"
          ? [
              {
                type: "delta",
                content:
                  "좋아요! 기타 루틴부터 정리해볼게요.\n\n[크로매틱 연습] [코드 연습]",
              },
              { type: "done" },
            ]
          : [
              { type: "delta", content: "좋아요, 그렇게 저장할게요." },
              { type: "done" },
            ];

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody(reply),
      });
    });

    await page.goto("/setup");
    await page.getByRole("button", { name: "기타", exact: true }).click();
    await expect(page.getByText("기타").first()).toBeVisible();
    await page
      .getByRole("button", { name: "크로매틱 연습", exact: true })
      .click();
    await expect(page.getByText("크로매틱 연습").first()).toBeVisible();
  });

  test("localStorage hobbies is updated after interaction", async ({
    page,
  }) => {
    await page.route("**/api/setup-chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      let reply;

      if (body.message === "기타") {
        reply = [
          {
            type: "delta",
            content:
              "좋아요! 어떤 세부 할 일을 할까요?\n\n[크로매틱 연습] [코드 연습]",
          },
          { type: "done" },
        ];
      } else if (body.context?.stage === "collect-tasks") {
        reply = [
          {
            type: "delta",
            content:
              "좋아요! 이제 BGM이나 유튜브 검색어도 알려주세요.\n\n[60fps 메트로놈] [빗소리]",
          },
          { type: "done" },
        ];
      } else {
        reply = [
          {
            type: "delta",
            content: "완료됐어요. 저장 버튼을 눌러 시작해봐요!",
          },
          { type: "done" },
        ];
      }

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody(reply),
      });
    });

    await page.goto("/setup");
    await page.getByRole("button", { name: "기타", exact: true }).click();
    await page
      .getByRole("button", { name: "크로매틱 연습", exact: true })
      .click();
    await page
      .getByRole("button", { name: "60fps 메트로놈", exact: true })
      .click();

    await expect(
      page.getByText("완료됐어요. 저장 버튼을 눌러 시작해봐요!"),
    ).toBeVisible();

    const hobbies = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("hobbies") || "[]"),
    );
    expect(hobbies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "guitar",
          tasks: ["크로매틱 연습"],
          bgmQueries: ["60fps 메트로놈"],
        }),
      ]),
    );
  });

  test("저장하고 시작하기 button navigates to /", async ({ page }) => {
    await page.route("**/api/setup-chat", async (route) => {
      const body = JSON.parse(route.request().postData() || "{}");
      let reply;

      if (body.message === "기타") {
        reply = [
          {
            type: "delta",
            content: "좋아요! 어떤 세부 할 일을 할까요?\n\n[크로매틱 연습]",
          },
          { type: "done" },
        ];
      } else if (body.context?.stage === "collect-tasks") {
        reply = [
          {
            type: "delta",
            content: "좋아요! 어떤 BGM을 들을까요?\n\n[60fps 메트로놈]",
          },
          { type: "done" },
        ];
      } else {
        reply = [
          {
            type: "delta",
            content: "정리가 끝났어요. 이제 저장하고 시작해볼까요?",
          },
          { type: "done" },
        ];
      }

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody(reply),
      });
    });

    await page.goto("/setup");
    await page.getByRole("button", { name: "기타", exact: true }).click();
    await page
      .getByRole("button", { name: "크로매틱 연습", exact: true })
      .click();
    await page
      .getByRole("button", { name: "60fps 메트로놈", exact: true })
      .click();
    await page.getByRole("button", { name: "저장하고 시작하기" }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("manual task and BGM edits do not require AI chat", async ({ page }) => {
    let setupRequests = 0;

    await page.route("**/api/setup-chat", async (route) => {
      setupRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sseBody([
          {
            type: "delta",
            content: "좋아요! 어떤 세부 할 일을 할까요?",
          },
          { type: "done" },
        ]),
      });
    });

    await page.goto("/setup");
    await page.getByRole("button", { name: "기타", exact: true }).click();
    await page.getByLabel("🎸 기타 연습 할 일 직접 추가").fill("코드 전환 5분");
    await page.getByLabel("🎸 기타 연습 할 일 직접 추가").press("Enter");
    await page.getByLabel("🎸 기타 연습 BGM 직접 추가").fill("잔잔한 메트로놈");
    await page.getByLabel("🎸 기타 연습 BGM 직접 추가").press("Enter");

    await expect(page.getByText("코드 전환 5분 ×")).toBeVisible();
    await expect(page.getByText("잔잔한 메트로놈 ×")).toBeVisible();
    expect(setupRequests).toBe(1);
  });
});
