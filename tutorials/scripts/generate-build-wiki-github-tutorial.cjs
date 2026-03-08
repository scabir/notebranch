const { _electron: electron, expect } = require("@playwright/test");
const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const SCENARIO_SLUG = "build-wiki-and-host-on-github";
const SCENARIO_TITLE =
  "Build a Linked Wiki in notegit and Host It Free on GitHub";

const OUTPUT_ROOT = path.resolve(process.cwd(), "tutorials");
const OUTPUT_SCENARIO_DIR = path.join(OUTPUT_ROOT, "scenarios", SCENARIO_SLUG);
const OUTPUT_MARKDOWN_PATH = path.join(OUTPUT_SCENARIO_DIR, "README.md");
const OUTPUT_IMAGE_DIR = path.join(OUTPUT_SCENARIO_DIR, "images");

const DEFAULT_REMOTE_URL = "https://github.com/mock/notegit-integration.git";
const DEFAULT_BRANCH = "main";
const DEFAULT_PAT = "integration-token";

const WIKI_FOLDER = "wiki";
const ASSETS_FOLDER = "assets";
const INDEX_FILE = "index.md";
const GETTING_STARTED_FILE = "getting-started.md";
const WORKFLOWS_FILE = "workflows.md";
const IMPORTED_IMAGE_NAME = "wiki-map.svg";

const MOD_KEY = process.platform === "darwin" ? "Meta" : "Control";
const PREVIEW_ONLY_SELECTOR = 'button[aria-label="preview only"]';
const SPLIT_VIEW_SELECTOR = 'button[aria-label="split view"]';

const stepEntries = [];

const INDEX_CONTENT = `# notegit Wiki Home

Welcome to the project wiki.

Use these pages:
- [Getting Started](getting-started.md)
- [Workflows](workflows.md)

When pushed to GitHub, these links are easy to follow in both repository view and Pages-based docs.`;

const GETTING_STARTED_CONTENT = `# Getting Started

This page explains the basics.

![Wiki map](./assets/wiki-map.svg)

Next steps:
- Go to [Workflows](workflows.md)
- Return to [Home](index.md)`;

const WORKFLOWS_CONTENT = `# Workflows

Typical wiki workflow:
1. Add or update a page.
2. Link it from another page.
3. Commit and push.

Back to [Home](index.md).`;

const SVG_IMAGE = `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="360" viewBox="0 0 820 360">
  <rect width="820" height="360" fill="#f8fafc"/>
  <rect x="40" y="40" width="220" height="90" rx="10" fill="#1d4ed8"/>
  <text x="150" y="92" text-anchor="middle" fill="white" font-size="24" font-family="Arial">Home</text>
  <rect x="300" y="40" width="220" height="90" rx="10" fill="#0f766e"/>
  <text x="410" y="92" text-anchor="middle" fill="white" font-size="24" font-family="Arial">Getting Started</text>
  <rect x="560" y="40" width="220" height="90" rx="10" fill="#7c3aed"/>
  <text x="670" y="92" text-anchor="middle" fill="white" font-size="24" font-family="Arial">Workflows</text>
  <line x1="260" y1="85" x2="300" y2="85" stroke="#334155" stroke-width="4"/>
  <line x1="520" y1="85" x2="560" y2="85" stroke="#334155" stroke-width="4"/>
  <rect x="120" y="200" width="580" height="100" rx="12" fill="#e2e8f0"/>
  <text x="410" y="250" text-anchor="middle" fill="#0f172a" font-size="22" font-family="Arial">Links + Images + Markdown render together</text>
</svg>`;

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
    "This scenario starts after repository setup and login. It focuses on wiki structure, linking, images, and publish flow.",
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

  lines.push("## Publish on GitHub (Free)");
  lines.push("");
  lines.push("Use one of these paths:");
  lines.push("");
  lines.push("1. Repository-hosted docs (fastest)");
  lines.push("   Keep wiki files in the repo (for example under `wiki/`) and push normally. GitHub renders markdown pages with working relative links and images when browsed in the repo.");
  lines.push("");
  lines.push("2. GitHub Pages (public static docs)");
  lines.push("   Push your markdown pages and configure Pages from your default branch. For a clean multi-page wiki site, pair this with a static-site setup (for example Jekyll/MkDocs) so linked markdown pages are published as HTML routes.");
  lines.push("");
  lines.push("Typical publish commands:");
  lines.push("");
  lines.push("```bash");
  lines.push("git add wiki");
  lines.push("git commit -m \"docs: build wiki pages\"");
  lines.push("git push origin main");
  lines.push("```");

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

const openEmptyTreeContextMenu = async (page) => {
  const treeContainer = page.locator(".tree-container");
  await expect(treeContainer).toBeVisible();

  await treeContainer.evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 18,
        clientY: 18,
      }),
    );
  });

  await expect(page.getByTestId("tree-context-menu-empty")).toBeVisible();
};

const openNodeContextMenu = async (page, nodeName) => {
  const node = page
    .locator(".tree-container")
    .getByText(nodeName, { exact: true })
    .first();
  await expect(node).toBeVisible();
  await node.click({ button: "right" });
  await expect(page.getByTestId("tree-context-menu")).toBeVisible();
};

const createRootFolderViaDialog = async (page, folderName) => {
  await openEmptyTreeContextMenu(page);
  await page.getByTestId("tree-context-new-folder").click();

  const createDialog = page.getByTestId("create-folder-dialog");
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel("Folder Name").fill(folderName);
  return createDialog;
};

const createFileInsideFolderViaDialog = async (page, folderName, fileName) => {
  await openNodeContextMenu(page, folderName);
  await page.getByTestId("tree-context-node-new-file").click();

  const createDialog = page.getByTestId("create-file-dialog");
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel("File Name").fill(fileName);
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(createDialog).toHaveCount(0);
};

const createFolderInsideFolderViaDialog = async (
  page,
  folderName,
  newFolderName,
) => {
  await openNodeContextMenu(page, folderName);
  await page.getByTestId("tree-context-node-new-folder").click();

  const createDialog = page.getByTestId("create-folder-dialog");
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel("Folder Name").fill(newFolderName);
  await createDialog.getByRole("button", { name: "Create" }).click();
  await expect(createDialog).toHaveCount(0);
};

const selectFileFromTree = async (page, fileName) => {
  const fileNode = page
    .locator(".tree-container")
    .getByText(fileName, { exact: true })
    .first();
  await expect(fileNode).toBeVisible();
  await fileNode.click();
};

const replaceEditorContent = async (page, content) => {
  const editor = page.locator(".cm-content").first();
  await expect(editor).toBeVisible();
  await editor.click();
  await page.keyboard.press(`${MOD_KEY}+A`);
  await page.keyboard.press("Backspace");
  await page.keyboard.type(content);
  await page.keyboard.press(`${MOD_KEY}+S`);
  await expect(page.getByTestId("status-bar-save-status-saved")).toBeVisible();
};

const importFileViaSelectedFolder = async (page, sourcePath) => {
  const response = await page.evaluate(
    async ({ source, target }) => {
      return await window.notegitApi.files.import(source, target);
    },
    {
      source: sourcePath,
      target: `${WIKI_FOLDER}/${ASSETS_FOLDER}/${IMPORTED_IMAGE_NAME}`,
    },
  );

  if (!response?.ok) {
    throw new Error(response?.error?.message || "Failed to import image file");
  }

  await expect
    .poll(async () => {
      const verifyResponse = await page.evaluate(async (targetPath) => {
        const result = await window.notegitApi.files.listTree();
        if (!result?.ok || !Array.isArray(result.data)) {
          return false;
        }
        const walk = (nodes) => {
          for (const node of nodes) {
            if (node.path === targetPath) {
              return true;
            }
            if (Array.isArray(node.children) && walk(node.children)) {
              return true;
            }
          }
          return false;
        };
        return walk(result.data);
      }, `${WIKI_FOLDER}/${ASSETS_FOLDER}/${IMPORTED_IMAGE_NAME}`);
      return Boolean(verifyResponse);
    })
    .toBe(true);
};

const run = async () => {
  await assertBuildExists();
  await fs.mkdir(OUTPUT_IMAGE_DIR, { recursive: true });

  const userDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "notegit-tutorial-wiki-github-"),
  );

  const importTmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "notegit-tutorial-import-"),
  );
  const sourceImagePath = path.join(importTmpDir, IMPORTED_IMAGE_NAME);
  await fs.writeFile(sourceImagePath, SVG_IMAGE, "utf8");

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
      fileName: "step-01-connected-workspace.png",
      title: "Start from a connected repository",
      explanation:
        "This scenario begins after setup/login so you can focus directly on building wiki content.",
    });

    const createWikiDialog = await createRootFolderViaDialog(page, WIKI_FOLDER);
    await captureStep({
      page,
      fileName: "step-02-create-wiki-folder.png",
      title: "Create a top-level wiki folder",
      explanation:
        "Create a dedicated `wiki/` folder to keep linked docs and assets organized.",
    });
    await createWikiDialog.getByRole("button", { name: "Create" }).click();
    await expect(createWikiDialog).toHaveCount(0);

    await createFileInsideFolderViaDialog(page, WIKI_FOLDER, INDEX_FILE);
    await captureStep({
      page,
      fileName: "step-03-create-index-page.png",
      title: "Create the home page",
      explanation:
        "Add `index.md` inside `wiki/` to serve as the wiki entry point.",
    });

    await createFileInsideFolderViaDialog(page, WIKI_FOLDER, GETTING_STARTED_FILE);
    await createFileInsideFolderViaDialog(page, WIKI_FOLDER, WORKFLOWS_FILE);
    await createFolderInsideFolderViaDialog(page, WIKI_FOLDER, ASSETS_FOLDER);

    await importFileViaSelectedFolder(page, sourceImagePath);

    await selectFileFromTree(page, INDEX_FILE);
    await replaceEditorContent(page, INDEX_CONTENT);

    await selectFileFromTree(page, GETTING_STARTED_FILE);
    await replaceEditorContent(page, GETTING_STARTED_CONTENT);

    await selectFileFromTree(page, WORKFLOWS_FILE);
    await replaceEditorContent(page, WORKFLOWS_CONTENT);

    await selectFileFromTree(page, INDEX_FILE);
    await page.locator(SPLIT_VIEW_SELECTOR).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "notegit Wiki Home" }),
    ).toBeVisible();

    await captureStep({
      page,
      fileName: "step-04-linked-home-page.png",
      title: "Write and preview linked wiki pages",
      explanation:
        "Use relative links between markdown pages so wiki navigation works naturally.",
    });

    await page.locator(PREVIEW_ONLY_SELECTOR).click();
    await page.getByRole("link", { name: "Getting Started" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Getting Started" }),
    ).toBeVisible();

    await captureStep({
      page,
      fileName: "step-05-open-linked-page-from-preview.png",
      title: "Navigate by clicking links in preview",
      explanation:
        "Clicking an internal markdown link in preview opens the linked page in-place.",
    });

    const wikiImage = page.locator('img[alt="Wiki map"]');
    await expect.poll(async () => {
      try {
        return await wikiImage.evaluate((img) => {
          const element = img;
          return element.complete && element.naturalWidth > 0;
        });
      } catch {
        return false;
      }
    }).toBe(true);

    await captureStep({
      page,
      fileName: "step-06-embedded-image-rendered.png",
      title: "Embed and render an imported image",
      explanation:
        "After importing an image into `wiki/assets/`, embed it with a relative markdown image path.",
    });

    await page.getByRole("link", { name: "Workflows" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Workflows" }),
    ).toBeVisible();

    await captureStep({
      page,
      fileName: "step-07-navigate-to-another-linked-page.png",
      title: "Follow cross-links across the wiki",
      explanation:
        "Cross-page links make the wiki browseable, similar to how readers move across docs on GitHub.",
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
    await fs.rm(importTmpDir, { recursive: true, force: true });
  }
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Failed to generate scenario: ${message}\n`);
  process.exitCode = 1;
});
