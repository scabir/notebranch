import { expect, test } from "@playwright/test";
import type { ElectronApplication, Page } from "@playwright/test";
import {
  appendToCurrentEditor,
  cleanupUserDataDir,
  closeAppIfOpen,
  connectGitRepo,
  createIsolatedUserDataDir,
  createMarkdownFile,
  launchIntegrationApp,
} from "../helpers/gitIntegration";

const getModKey = () => (process.platform === "darwin" ? "Meta" : "Control");

test("(git) in-file find uses one working search bar", async ({
  request: _request,
}, testInfo) => {
  const userDataDir = await createIsolatedUserDataDir(testInfo);
  let app: ElectronApplication | null = null;
  try {
    const launched = await launchAndSetup(userDataDir);
    app = launched.app;
    const page = launched.page;

    const editor = page.locator(".cm-content").first();
    await expect(editor).toBeVisible();
    await editor.click();

    await page.keyboard.press(`${getModKey()}+F`);
    await expect(page.getByTestId("find-replace-bar")).toBeVisible();
    await expect(page.locator(".cm-search")).toHaveCount(0);

    await page.keyboard.press(`${getModKey()}+F`);
    await expect(page.getByTestId("find-replace-bar")).toHaveCount(1);
    await expect(page.locator(".cm-search")).toHaveCount(0);

    const queryInput = page.getByTestId("find-replace-query-input");
    await expect(queryInput).toBeVisible();
    await queryInput.fill("beta");
    await queryInput.press("Enter");

    await expect(queryInput).toBeFocused();
    await expect(page.getByText("1/2", { exact: true })).toBeVisible();

    await queryInput.press("Enter");
    await expect(queryInput).toBeFocused();
    await expect(page.getByText("2/2", { exact: true })).toBeVisible();
  } finally {
    await closeAppIfOpen(app);
    await cleanupUserDataDir(userDataDir);
  }
});

const launchAndSetup = async (
  userDataDir: string,
): Promise<{ app: ElectronApplication; page: Page }> => {
  const launched = await launchIntegrationApp(userDataDir);
  const page = launched.page;
  await connectGitRepo(page);
  await createMarkdownFile(page, "find-chaos.txt");
  await appendToCurrentEditor(page, "\nalpha beta alpha beta alpha\n");
  return launched;
};
