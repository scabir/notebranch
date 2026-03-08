const { _electron: electron, expect } = require("@playwright/test");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

const TUTORIAL_SLUG = "create-repo-on-notegit";
const TUTORIAL_TITLE = "How to Create a Repo on notegit";
const OUTPUT_ROOT = path.resolve(process.cwd(), "tutorials");
const OUTPUT_SCENARIOS_DIR = path.join(OUTPUT_ROOT, "scenarios");
const OUTPUT_SCENARIO_DIR = path.join(OUTPUT_SCENARIOS_DIR, TUTORIAL_SLUG);
const OUTPUT_MARKDOWN_PATH = path.join(OUTPUT_SCENARIO_DIR, "README.md");
const OUTPUT_IMAGE_DIR = path.join(OUTPUT_SCENARIO_DIR, "images");

const DEFAULT_REMOTE_URL = "https://github.com/mock/notegit-integration.git";
const DEFAULT_BRANCH = "main";
const DEFAULT_PAT = "integration-token";

const stepEntries = [];

const assertBuildExists = async () => {
  const electronEntry = path.resolve(
    process.cwd(),
    "dist/electron/electron/main.js",
  );

  try {
    await fs.access(electronEntry);
  } catch {
    throw new Error(
      "Build output not found at dist/electron/electron/main.js. Run 'pnpm run build' first.",
    );
  }
};

const captureStep = async ({ page, fileName, title, explanation }) => {
  const filePath = path.join(OUTPUT_IMAGE_DIR, fileName);
  await page.screenshot({ path: filePath, fullPage: true });

  stepEntries.push({
    title,
    explanation,
    imagePath: `images/${fileName}`,
  });
};

const createMarkdown = () => {
  const lines = [
    `# ${TUTORIAL_TITLE}`,
    "",
    "This tutorial was generated automatically with Playwright using the local notegit app in mock Git mode.",
    "",
  ];

  stepEntries.forEach((entry, index) => {
    lines.push(`## Step ${index + 1}: ${entry.title}`);
    lines.push("");
    lines.push(entry.explanation);
    lines.push("");
    lines.push(`![${entry.title}](${entry.imagePath})`);
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
};

const run = async () => {
  await assertBuildExists();
  await fs.mkdir(OUTPUT_IMAGE_DIR, { recursive: true });

  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "notegit-tutorial-"),
  );

  /** @type {import('@playwright/test').ElectronApplication | null} */
  let app = null;

  try {
    const launchEnv = {
      ...process.env,
      NODE_ENV: "test",
      NOTEGIT_INTEGRATION_TEST: "1",
      NOTEGIT_INTEGRATION_GIT_MOCK: "1",
      NOTEGIT_INTEGRATION_USER_DATA_DIR: userDataDir,
    };
    delete launchEnv.ELECTRON_RUN_AS_NODE;

    app = await electron.launch({
      args: ["."],
      env: launchEnv,
    });

    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await expect(
      page.getByRole("button", { name: "Connect to Repository" }),
    ).toBeVisible();
    await captureStep({
      page,
      fileName: "step-01-welcome-screen.png",
      title: "Open notegit and start setup",
      explanation:
        "When you open notegit for the first time, use the 'Connect to Repository' button to start creating your repo connection.",
    });

    await page.getByRole("button", { name: "Connect to Repository" }).click();
    await expect(page.getByLabel("Remote URL")).toBeVisible();
    await captureStep({
      page,
      fileName: "step-02-open-connect-dialog.png",
      title: "Open the repository connection dialog",
      explanation:
        "The dialog asks for your repository details. Stay on the Git tab for a standard Git remote setup.",
    });

    await page.getByLabel("Remote URL").fill(DEFAULT_REMOTE_URL);
    await page.getByLabel("Branch").fill(DEFAULT_BRANCH);
    await page.getByLabel("Personal Access Token").fill(DEFAULT_PAT);
    await captureStep({
      page,
      fileName: "step-03-fill-repository-details.png",
      title: "Fill remote URL, branch, and token",
      explanation:
        "Provide the repository URL, the target branch, and your personal access token, then review values before connecting.",
    });

    await page.getByRole("button", { name: "Connect" }).click();

    await expect(page.getByTestId("status-bar-commit-push-action")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("status-bar-branch-label")).toContainText(
      `Branch: ${DEFAULT_BRANCH}`,
    );
    await expect(page.locator(".tree-container")).toBeVisible();

    await captureStep({
      page,
      fileName: "step-04-repository-connected.png",
      title: "Finish and verify repository is connected",
      explanation:
        "After connecting, the main workspace appears. The status bar and file tree confirm the repo is ready to use.",
    });

    const markdown = createMarkdown();
    await fs.writeFile(OUTPUT_MARKDOWN_PATH, markdown, "utf8");

    process.stdout.write(
      `Tutorial generated:\n- ${OUTPUT_MARKDOWN_PATH}\n- ${OUTPUT_IMAGE_DIR}\n`,
    );
  } finally {
    if (app) {
      await app.close();
    }
    await fs.rm(userDataDir, { recursive: true, force: true });
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to generate tutorial: ${message}\n`);
  process.exitCode = 1;
});
