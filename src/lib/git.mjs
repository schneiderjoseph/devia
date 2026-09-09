import { execFileSync } from "node:child_process";

/** Run git in `root`. Returns trimmed stdout, or null when git is absent or the command fails. */
export function git(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  } catch {
    return null;
  }
}

export function isRepo(root) {
  return git(root, ["rev-parse", "--is-inside-work-tree"]) === "true";
}

/**
 * What the repository actually carries under `root`: tracked files plus untracked ones that are
 * not ignored. Ignored paths are local artefacts, not the repository's content — scanning them
 * turns a build cache into a P0 failure. Returns null when git cannot answer, so the caller
 * falls back to walking the tree rather than scanning nothing.
 */
export function trackedFiles(root) {
  const out = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
  if (out === null) return null;
  return out.split("\0").filter(Boolean);
}
