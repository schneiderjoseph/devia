import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { exists, readJSON, writeJSON, packageRoot } from "./fs.mjs";
import { cliVersion } from "./version.mjs";

/**
 * "There is a newer devia, and here is what it brings" — said in the reader's language, and
 * never acted on without them.
 *
 * Three constraints shaped every line of this file, and they are not negotiable later:
 *
 * 1. **devia installs nothing.** Not on a timer, not helpfully, not "while we were here". The
 *    command is printed; running it is a human's decision. `--yes` exists so that decision can
 *    be expressed in one keystroke, not so it can be skipped.
 * 2. **No runtime dependency, and no HTTP client of its own.** The lookup is handed to `npm`,
 *    which the user already has, already trusts and has already configured with their registry,
 *    proxy and credentials — exactly as `contribute` hands publishing to `gh`.
 * 3. **It never costs a command anything.** Only `init`, `doctor` and `update` refresh; every
 *    other command reads a cached answer or says nothing at all. A version check that adds a
 *    second to `devia check` is a version check somebody disables.
 *
 * What it sends: the package name, to the registry the user's own npm is pointed at. Nothing
 * about the repository ever leaves the machine — that promise is `contribute`'s and it is
 * untouched here.
 */

export const PACKAGE = "@schneiderjoseph/devia";
export const CHANGELOG_URL = "https://github.com/schneiderjoseph/devia/blob/main/CHANGELOG.md";

/** Cached beside the memory, because a command may not write outside `--root`. */
export const CACHE_FILE = ".update-check.json";

/** A day. Long enough that nobody notices the lookup, short enough to be worth trusting. */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Hard ceiling on the lookup. A slow registry must not hold a command open. */
const TIMEOUT_MS = 7000;

/**
 * npm is `npm.cmd` on Windows, and `execFile` there will not run a `.cmd` without a shell.
 * Naming the right executable is how this stays off `shell: true`, which would put a package
 * specifier through a command-line parser for no benefit.
 */
export function npmBin() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

/**
 * Compare two versions the way npm does, without npm.
 *
 * Numeric segments compare as numbers — `0.10.0` is above `0.9.0`, which a string compare gets
 * backwards. A pre-release (`1.0.0-rc.1`) sorts below its release, so an adopter on a stable
 * version is never told a release candidate is "newer".
 */
export function compareVersions(a, b) {
  const split = (v) => {
    const [core, pre = ""] = String(v ?? "").trim().split("-", 2);
    return { nums: core.split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const x = split(a);
  const y = split(b);
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] || 0) - (y.nums[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1; // a release outranks its own pre-release
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

export function isNewer(candidate, current) {
  return compareVersions(candidate, current) > 0;
}

/* --------------------------------------------------------------- the switch */

/**
 * Whether devia may look. Off is respected from four places, because somebody who has turned
 * this off in one of them has said what they mean.
 */
export function checkingAllowed(config, env = process.env) {
  if (env.DEVIA_NO_UPDATE_CHECK || env.NO_UPDATE_NOTIFIER) return false;
  // CI builds a thousand times a day and nobody reads the notice. A build that reaches the
  // network because a linter ran is a build that fails when the registry does.
  if (env.CI) return false;
  if (config?.update?.check === false) return false;
  return true;
}

/* ------------------------------------------------------------------- cache */

export function cachePath(deviaDir) {
  return path.join(deviaDir, CACHE_FILE);
}

export function readCache(deviaDir) {
  const raw = readJSON(cachePath(deviaDir));
  if (!raw || typeof raw !== "object") return null;
  return {
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : null,
    latest: typeof raw.latest === "string" ? raw.latest : null,
    release: raw.release && typeof raw.release === "object" ? raw.release : null,
    // The version whose notes have already been shown, so an upgrade is announced once.
    announced: typeof raw.announced === "string" ? raw.announced : null,
  };
}

export function writeCache(deviaDir, value) {
  writeJSON(cachePath(deviaDir), value);
}

export function isStale(cache, now = Date.now()) {
  if (!cache?.checkedAt) return true;
  const at = Date.parse(cache.checkedAt);
  return !Number.isFinite(at) || now - at > MAX_AGE_MS;
}

/* ------------------------------------------------------------------ lookup */

/**
 * Ask npm what the newest published version is, and for the summary the release published
 * alongside itself.
 *
 * The summary lives in the package's own `devia.release` field, which is why this can describe a
 * version that is not installed: the registry serves the manifest, and `npm view` reads any field
 * out of it. The alternative was to describe a release devia does not have — which is inventing,
 * and the whole of 0.9.0 is an argument against that (`AGT-004`).
 */
export function lookupLatest({ npm = npmBin(), timeout = TIMEOUT_MS } = {}) {
  let raw;
  try {
    raw = execFileSync(npm, ["view", `${PACKAGE}@latest`, "version", "devia", "--json"], {
      encoding: "utf8",
      timeout,
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch {
    return null; // offline, no npm, a private registry that 404s: all the same answer here
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const doc = Array.isArray(json) ? json[json.length - 1] : json;
  const latest = typeof doc?.version === "string" ? doc.version : null;
  if (!latest) return null;
  return { latest, release: sanitizeRelease(doc?.devia?.release) };
}

/**
 * Built from a string rather than written as a literal: a source file that carries real control
 * bytes is a source file every editor, diff and terminal renders differently.
 */
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]+", "g");

/**
 * Release notes arrive from a registry, and are printed into somebody's terminal.
 *
 * So they are treated as data, not as something devia wrote: control characters and escape
 * sequences are stripped, every string is capped, and the number of bullets is capped. Remote
 * text that can move the cursor or repaint the screen is remote text that can lie about what
 * just happened (`AI-001`).
 */
export function sanitizeRelease(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const clean = (s) =>
    String(s ?? "")
      .replace(CONTROL_CHARS, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200);
  const bullets = (v) =>
    [].concat(v || []).map(clean).filter(Boolean).slice(0, 5);

  const out = {};
  for (const [lang, body] of Object.entries(value)) {
    if (!/^[a-z]{2}$/.test(lang) || !body || typeof body !== "object") continue;
    const entry = {
      headline: clean(body.headline),
      added: bullets(body.added),
      fixed: bullets(body.fixed),
      changed: bullets(body.changed),
    };
    if (entry.headline || entry.added.length || entry.fixed.length || entry.changed.length) {
      out[lang] = entry;
    }
    if (Object.keys(out).length >= 20) break;
  }
  return Object.keys(out).length ? out : null;
}

/** The notes this installed copy publishes about itself, for the first run after an upgrade. */
export function localRelease() {
  const pkg = readJSON(path.join(packageRoot, "package.json"));
  return sanitizeRelease(pkg?.devia?.release);
}

/** The notes for a language, falling back to English and then to whatever was published. */
export function releaseFor(release, lang) {
  if (!release) return null;
  return release[lang] || release.en || release[Object.keys(release)[0]] || null;
}

/* ------------------------------------------------------------------ report */

/**
 * What the caller should say, as data rather than as printed lines — so `--json`, the one-line
 * notice and the full `devia update` page all answer from the same decision.
 */
export function status(deviaDir, { config = null, env = process.env, now = Date.now() } = {}) {
  const current = cliVersion();
  const allowed = checkingAllowed(config, env);
  const cache = exists(deviaDir) ? readCache(deviaDir) : null;
  const latest = cache?.latest || null;
  return {
    current,
    latest,
    allowed,
    stale: isStale(cache, now),
    checkedAt: cache?.checkedAt || null,
    updateAvailable: Boolean(latest && isNewer(latest, current)),
    release: cache?.release || null,
    announced: cache?.announced || null,
  };
}

/** The exact command a human runs, printed before it is ever executed. */
export function installCommand(version = "latest") {
  return `npm install -D ${PACKAGE}@${version}`;
}

/** Is `raw` a version string npm would accept? Guards what reaches the install command. */
export function isVersionLike(raw) {
  return /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(raw ?? ""));
}
