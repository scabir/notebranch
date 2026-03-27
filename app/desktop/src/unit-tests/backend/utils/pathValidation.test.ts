import * as path from "path";
import { validateRepoPath } from "../../../backend/utils/pathValidation";

describe("validateRepoPath", () => {
  const repoPath = path.resolve(path.sep, "tmp", "repo");

  it("rejects ../../etc/passwd traversal", () => {
    expect(() => validateRepoPath(repoPath, "../../etc/passwd")).toThrow(
      "Path traversal detected",
    );
  });

  it("rejects ../../../.ssh/id_rsa traversal", () => {
    expect(() => validateRepoPath(repoPath, "../../../.ssh/id_rsa")).toThrow(
      "Path traversal detected",
    );
  });

  it("accepts nested relative paths", () => {
    expect(validateRepoPath(repoPath, "valid/nested/file.md")).toBe(
      path.resolve(repoPath, "valid/nested/file.md"),
    );
  });

  it("accepts dot-prefixed relative paths", () => {
    expect(validateRepoPath(repoPath, "./valid-file.md")).toBe(
      path.resolve(repoPath, "./valid-file.md"),
    );
  });

  it("handles empty path by resolving to the repository root", () => {
    expect(validateRepoPath(repoPath, "")).toBe(path.resolve(repoPath));
  });
});
