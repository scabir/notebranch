import * as path from "path";

export function validateRepoPath(repoPath: string, userPath: string): string {
  const resolvedRepoPath = path.resolve(repoPath);
  const resolvedPath = path.resolve(resolvedRepoPath, userPath);
  const repoRootWithSep = `${resolvedRepoPath}${path.sep}`;

  if (
    resolvedPath !== resolvedRepoPath &&
    !resolvedPath.startsWith(repoRootWithSep)
  ) {
    throw new Error(
      `Path traversal detected: ${userPath} escapes repository root`,
    );
  }

  return resolvedPath;
}
