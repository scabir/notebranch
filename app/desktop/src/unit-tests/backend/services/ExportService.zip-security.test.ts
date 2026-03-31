import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import AdmZip from "adm-zip";
import { ExportService } from "../../../backend/services/ExportService";
import { FsAdapter } from "../../../backend/adapters/FsAdapter";
import { ConfigService } from "../../../backend/services/ConfigService";

describe("ExportService zip security", () => {
  it("excludes .git and .NoteBranch internal metadata from exported zip", async () => {
    const tempRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "notebranch-zip-"),
    );
    const sourcePath = path.join(tempRoot, "repo");
    const zipPath = path.join(tempRoot, "repo-export.zip");
    const exportService = new ExportService(
      {} as FsAdapter,
      { getRepoSettings: jest.fn() } as unknown as ConfigService,
    );

    try {
      await fs.mkdir(path.join(sourcePath, "notes"), { recursive: true });
      await fs.mkdir(path.join(sourcePath, ".git"), { recursive: true });
      await fs.mkdir(path.join(sourcePath, ".NoteBranch"), {
        recursive: true,
      });
      await fs.mkdir(path.join(sourcePath, "node_modules", "pkg"), {
        recursive: true,
      });

      await fs.writeFile(path.join(sourcePath, "notes", "note.md"), "# note");
      await fs.writeFile(path.join(sourcePath, ".gitignore"), "node_modules");
      await fs.writeFile(
        path.join(sourcePath, ".git", "config"),
        '[remote "origin"]\nurl=https://token@example.com/repo.git',
      );
      await fs.writeFile(
        path.join(sourcePath, ".NoteBranch", "s3-sync.json"),
        '{"bucket":"private"}',
      );
      await fs.writeFile(
        path.join(sourcePath, "node_modules", "pkg", "index.js"),
        "module.exports = {};",
      );

      await (exportService as any).createZipArchive(sourcePath, zipPath);

      const zip = new AdmZip(zipPath);
      const entryNames = zip.getEntries().map((entry) => entry.entryName);

      expect(entryNames).toContain("notes/note.md");
      expect(entryNames).toContain(".gitignore");
      expect(
        entryNames.some(
          (entry) => entry === ".git" || entry.startsWith(".git/"),
        ),
      ).toBe(false);
      expect(
        entryNames.some(
          (entry) =>
            entry === ".NoteBranch" || entry.startsWith(".NoteBranch/"),
        ),
      ).toBe(false);
      expect(
        entryNames.some(
          (entry) =>
            entry === "node_modules" || entry.startsWith("node_modules/"),
        ),
      ).toBe(false);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
