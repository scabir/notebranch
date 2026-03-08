const { _electron: electron, expect } = require("@playwright/test");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const SCENARIO_SLUG = "create-file-markdown-preview-split";
const SCENARIO_TITLE =
  "Create a New Markdown File and Review in Preview + Split Mode";

const OUTPUT_ROOT = path.resolve(process.cwd(), "tutorials");
const OUTPUT_SCENARIO_DIR = path.join(OUTPUT_ROOT, "scenarios", SCENARIO_SLUG);
const OUTPUT_MARKDOWN_PATH = path.join(OUTPUT_SCENARIO_DIR, "README.md");
const OUTPUT_IMAGE_DIR = path.join(OUTPUT_SCENARIO_DIR, "images");

const DEFAULT_REMOTE_URL = "https://github.com/mock/notegit-integration.git";
const DEFAULT_BRANCH = "main";
const DEFAULT_PAT = "integration-token";
const FILE_NAME = "markdown-preview-demo.md";

const MARKDOWN_CONTENT = [
  "# Markdown Preview Demo",
  "",
  "## Section: Formatting",
  "",
  "This line has **bold**, *italic*, and `inline code`.",
  "",
  "> This is a blockquote used for preview testing.",
  "",
  "- Bullet item one",
  "- Bullet item two",
  "",
  "1. Ordered item one",
  "2. Ordered item two",
  "",
  "[Open notegit docs](https://example.com)",
  "",
  "| Syntax | Example |",
  "| --- | --- |",
  "| Bold | **text** |",
].join("\n");

const stepEntries = [];
const previewOnlyToggleSelector = 'button[aria-label="preview only"]';
const splitViewToggleSelector = 'button[aria-label="split view"]';

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
  const screenshotPath = path.join(OUTPUT_IMAGE_DIR, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  stepEntries.push({
    title,
    explanation,
    imagePath: `images/${fileName}`,
  });
};

const createMarkdownDoc = () => {
  const lines = [
    `# ${SCENARIO_TITLE}`,
    "",
    "This scenario skips repository setup screenshots and starts from an already connected workspace.",
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

const connectRepoWithoutScreenshots = async (page) => {
  await page.getByRole("button", { name: "Connect to Repository" }).click();
  await page.getByLabel("Remote URL").fill(DEFAULT_REMOTE_URL);
  await page.getByLabel("Branch").fill(DEFAULT_BRANCH);
  await page.getByLabel("Personal Access Token").fill(DEFAULT_PAT);
  await page.getByRole("button", { name: "Connect" }).click();

  await expect(page.getByTestId("status-bar-commit-push-action")).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByTestId("status-bar-branch-label")).toContainText(
    `Branch: ${DEFAULT_BRANCH}`,
  );
  await expect(page.locator(".tree-container")).toBeVisible();
};

const createFileWithContextMenu = async (page, fileName) => {
  const treeContainer = page.locator(".tree-container");
  await expect(treeContainer).toBeVisible();

  await treeContainer.click({ button: "right" });
  await page.getByRole("menuitem", { name: "New File" }).click();

  const createDialog = page.getByTestId("create-file-dialog");
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel("File Name").fill(fileName);
  return createDialog;
};

const run = async () => {
  await assertBuildExists();
  await fs.mkdir(OUTPUT_IMAGE_DIR, { recursive: true });

  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "notegit-tutorial-markdown-preview-"),
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

    await connectRepoWithoutScreenshots(page);

    await captureStep({
      page,
      fileName: "step-01-workspace-ready.png",
      title: "Start from connected workspace",
      explanation:
        "Repository creation/login is already completed. Begin this scenario from the connected workspace.",
    });

    const createDialog = await createFileWithContextMenu(page, FILE_NAME);
    await captureStep({
      page,
      fileName: "step-02-create-file-dialog.png",
      title: "Create a new markdown file",
      explanation:
        "Use the file tree context menu, choose New File, and enter your markdown file name.",
    });

    await createDialog.getByRole("button", { name: "Create" }).click();
    await expect(createDialog).toHaveCount(0);

    const fileInTree = page
      .locator(".tree-container")
      .getByText(FILE_NAME, { exact: true })
      .first();
    await expect(fileInTree).toBeVisible();
    await fileInTree.click();

    const editor = page.locator(".cm-content").first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type(MARKDOWN_CONTENT);

    await captureStep({
      page,
      fileName: "step-03-markdown-in-editor.png",
      title: "Add markdown content with multiple tags",
      explanation:
        "This file includes at least five markdown patterns: headings, bold, italic, inline code, blockquote, list types, link, and table.",
    });

    await page.locator(previewOnlyToggleSelector).click();
    await expect(page.locator(splitViewToggleSelector)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Markdown Preview Demo" }),
    ).toBeVisible();

    await captureStep({
      page,
      fileName: "step-04-preview-only-mode.png",
      title: "Check rendered result in preview mode",
      explanation:
        "Switch to Preview Only to inspect how the markdown is rendered without the editor pane.",
    });

    await page.locator(splitViewToggleSelector).click();
    await expect(page.locator(".cm-content").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Markdown Preview Demo" }),
    ).toBeVisible();

    await captureStep({
      page,
      fileName: "step-05-split-mode.png",
      title: "Review source and output in split mode",
      explanation:
        "Switch back to Split View to compare raw markdown and rendered preview side by side.",
    });

    const markdown = createMarkdownDoc();
    await fs.writeFile(OUTPUT_MARKDOWN_PATH, markdown, "utf8");

    process.stdout.write(
      `Scenario generated:\n- ${OUTPUT_MARKDOWN_PATH}\n- ${OUTPUT_IMAGE_DIR}\n`,
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
  process.stderr.write(`Failed to generate scenario: ${message}\n`);
  process.exitCode = 1;
});
