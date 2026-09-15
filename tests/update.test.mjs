import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { packageRoot } from "../src/lib/fs.mjs";
import { detectLanguage, messages, LANGUAGES } from "../src/lib/i18n.mjs";
import {
  compareVersions,
  isNewer,
  checkingAllowed,
  isStale,
  sanitizeRelease,
  releaseFor,
  localRelease,
  isVersionLike,
  installCommand,
  npmBin,
  parseViewOutput,
  lookupLatest,
  CACHE_FILE,
  MAX_AGE_MS,
} from "../src/lib/update.mjs";
import { noticeLines } from "../src/commands/update.mjs";

const bin = path.join(packageRoot, "bin", "devia.mjs");
const { FORCE_COLOR, ...parentEnv } = process.env;
// The fixtures set their own answers; a real CI variable would switch checking off underneath.
const { CI, DEVIA_NO_UPDATE_CHECK, NO_UPDATE_NOTIFIER, DEVIA_LANG, ...cleanEnv } = parentEnv;

function devia(args, cwd, { allowFailure = false, env = {} } = {}) {
  const options = { cwd, encoding: "utf8", env: { ...cleanEnv, NO_COLOR: "1", ...env } };
  try {
    return { code: 0, out: execFileSync(process.execPath, [bin, ...args], options), err: "" };
  } catch (e) {
    if (!allowFailure) throw e;
    return { code: e.status ?? 1, out: e.stdout || "", err: e.stderr || "" };
  }
}

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devia-update-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "u" }, null, 2));
  return dir;
}

/** A repository that already knows a newer devia exists, without reaching any registry. */
function seedCache(dir, value) {
  fs.writeFileSync(path.join(dir, ".devia", CACHE_FILE), JSON.stringify(value, null, 2));
}

const RELEASE = {
  en: { headline: "A much newer devia.", added: ["a thing"], fixed: ["a bug"], changed: [] },
  fr: { headline: "Un devia bien plus récent.", added: ["une chose"], fixed: ["un bug"], changed: [] },
};

/* ---------------------------------------------------------------- versions */

test("versions compare numerically, so 0.10.0 is above 0.9.0", () => {
  assert.equal(compareVersions("0.10.0", "0.9.0"), 1, "a string compare gets this backwards");
  assert.equal(compareVersions("0.9.0", "0.9.0"), 0);
  assert.equal(compareVersions("1.0.0", "0.99.99"), 1);
  assert.equal(compareVersions("0.9", "0.9.0"), 0);
});

test("a pre-release is never offered to somebody on the stable version", () => {
  assert.equal(isNewer("1.0.0-rc.1", "0.9.0"), true, "it is still newer than 0.9.0");
  assert.equal(isNewer("1.0.0-rc.1", "1.0.0"), false, "but never newer than its own release");
  assert.equal(isNewer("1.0.0", "1.0.0-rc.1"), true);
});

test("the install command names an exact version, and only a version-shaped one", () => {
  assert.ok(isVersionLike("1.2.3"));
  assert.ok(isVersionLike("1.2.3-rc.1"));
  assert.ok(!isVersionLike("latest"));
  assert.ok(!isVersionLike("1.2.3 && rm -rf /"));
  assert.match(installCommand("1.2.3"), /@schneiderjoseph\/devia@1\.2\.3$/);
});

test("npm is named correctly for the platform, so no shell is needed to reach it", () => {
  assert.equal(npmBin(), process.platform === "win32" ? "npm.cmd" : "npm");
});

/* ------------------------------------------------------------- npm's answer */

/**
 * The shape of `npm view` depends on how many of the asked-for fields resolve, and every test
 * above this block seeds a cache instead of parsing one — which is how a dead lookup passed a
 * full suite. These are the three shapes npm actually produces.
 */
test("npm's answer is read in every shape npm produces", () => {
  // Both fields present.
  assert.deepEqual(
    parseViewOutput(JSON.stringify({ version: "1.0.0", devia: { release: RELEASE } })).latest,
    "1.0.0"
  );

  // Only `version` resolved — npm drops the key and prints the bare value. This is every release
  // published before the release field existed, which is to say the normal case on release day.
  const bare = parseViewOutput('"0.8.0"');
  assert.equal(bare.latest, "0.8.0", "a bare scalar is an answer, not a failure");
  assert.equal(bare.release, null);

  // A spec that resolved to several versions: the last is the newest npm listed.
  assert.equal(parseViewOutput(JSON.stringify([{ version: "0.9.0" }, { version: "1.0.0" }])).latest, "1.0.0");

  // And nothing that is not an answer becomes one.
  assert.equal(parseViewOutput("not json"), null);
  assert.equal(parseViewOutput('"not-a-version"'), null);
  assert.equal(parseViewOutput("null"), null);
  assert.equal(parseViewOutput(JSON.stringify({ devia: { release: RELEASE } })), null);
});

test("a real lookup reaches npm, or says nothing — but never prints into the terminal", () => {
  // The Windows path needs a shell, and a shell with an args array warns on stderr (DEP0190).
  // A version check does not get to print a warning into somebody's session.
  const probe = path.join(os.tmpdir(), `devia-probe-${process.pid}.mjs`);
  // `G:\\...` is not a URL scheme an ESM import accepts; only a file:// URL is.
  const lib = pathToFileURL(path.join(packageRoot, "src", "lib", "update.mjs")).href;
  fs.writeFileSync(
    probe,
    `import { lookupLatest } from ${JSON.stringify(lib)};\n` +
      "const r = lookupLatest({ timeout: 20000 });\n" +
      "process.stdout.write(JSON.stringify(r));\n"
  );
  try {
    let stdout = "";
    let stderr = "";
    try {
      const res = execFileSync(process.execPath, [probe], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      stdout = res;
    } catch (e) {
      stdout = e.stdout || "";
      stderr = e.stderr || "";
    }
    assert.equal(stderr.trim(), "", `the lookup wrote to stderr: ${stderr}`);
    const answer = JSON.parse(stdout || "null");
    // Offline is a legitimate outcome; a crash or a half-answer is not.
    if (answer !== null) {
      assert.ok(isVersionLike(answer.latest), `not a version: ${answer.latest}`);
    }
  } finally {
    fs.rmSync(probe, { force: true });
  }
});

/* ------------------------------------------------------------------ switch */

test("checking is off wherever somebody said it should be off", () => {
  assert.equal(checkingAllowed(null, {}), true);
  assert.equal(checkingAllowed(null, { CI: "true" }), false, "a build must not reach a registry");
  assert.equal(checkingAllowed(null, { DEVIA_NO_UPDATE_CHECK: "1" }), false);
  assert.equal(checkingAllowed(null, { NO_UPDATE_NOTIFIER: "1" }), false);
  assert.equal(checkingAllowed({ update: { check: false } }, {}), false);
});

test("a cached answer goes stale after a day", () => {
  const now = Date.parse("2026-09-15T12:00:00.000Z");
  assert.equal(isStale(null, now), true);
  assert.equal(isStale({ checkedAt: "not a date" }, now), true);
  assert.equal(isStale({ checkedAt: new Date(now - 1000).toISOString() }, now), false);
  assert.equal(isStale({ checkedAt: new Date(now - MAX_AGE_MS - 1000).toISOString() }, now), true);
});

/* -------------------------------------------------------------- the notes */

test("release notes from a registry are data, not something that can paint the terminal", () => {
  const hostile = {
    en: {
      headline: `boom${String.fromCharCode(27)}[2J${String.fromCharCode(7)} cleared your screen`,
      added: Array.from({ length: 40 }, (_, i) => `bullet ${i}`),
      fixed: ["x".repeat(500)],
    },
  };
  const clean = sanitizeRelease(hostile);
  const CONTROL = new RegExp("[\\u0000-\\u001f]");
  assert.ok(!CONTROL.test(clean.en.headline), "no escape sequences survive");
  assert.match(clean.en.headline, /boom \[2J cleared your screen/);
  assert.ok(clean.en.added.length <= 5, "a release cannot fill the terminal with bullets");
  assert.ok(clean.en.fixed[0].length <= 200, "every string is capped");
});

test("nonsense in the release field produces nothing rather than half a notice", () => {
  assert.equal(sanitizeRelease(null), null);
  assert.equal(sanitizeRelease("a string"), null);
  assert.equal(sanitizeRelease([1, 2]), null);
  assert.equal(sanitizeRelease({ "not-a-lang": { headline: "x" } }), null);
  assert.equal(sanitizeRelease({ en: { headline: "   " } }), null);
});

test("notes fall back to English rather than to silence", () => {
  assert.equal(releaseFor(RELEASE, "fr").headline, "Un devia bien plus récent.");
  assert.equal(releaseFor(RELEASE, "de").headline, "A much newer devia.");
  assert.equal(releaseFor(null, "fr"), null);
});

test("this release publishes its own summary, in every language devia speaks", () => {
  const notes = localRelease();
  assert.ok(notes, "package.json carries devia.release, which is how npm view can serve it");
  for (const lang of LANGUAGES) {
    assert.ok(notes[lang], `no ${lang} summary`);
    assert.ok(notes[lang].headline, `no ${lang} headline`);
  }
});

/* ----------------------------------------------------------------- locale */

test("the language comes from the most explicit source that names one", () => {
  assert.equal(detectLanguage({ DEVIA_LANG: "fr" }), "fr");
  assert.equal(detectLanguage({ DEVIA_LANG: "fr", LANG: "de_DE.UTF-8" }), "fr");
  assert.equal(detectLanguage({ LC_ALL: "pt_BR.UTF-8" }), "pt");
  assert.equal(detectLanguage({ LANGUAGE: "it:en" }), "it");
  assert.equal(detectLanguage({ LANG: "ja_JP.UTF-8" }), "en", "a language devia cannot write");
});

test("every language answers every message, falling back key by key", () => {
  const english = messages("en");
  for (const lang of LANGUAGES) {
    const said = messages(lang);
    for (const key of Object.keys(english)) {
      assert.ok(said[key], `${lang} is missing ${key}`);
    }
  }
});

/* ---------------------------------------------------------------- the CLI */

test("update reports a newer version in the reader's language, and installs nothing", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    seedCache(dir, { checkedAt: new Date().toISOString(), latest: "99.0.0", release: RELEASE });

    const res = devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "fr" } });
    assert.match(res.out, /devia 99\.0\.0 est disponible/);
    assert.match(res.out, /Un devia bien plus récent/);
    assert.match(res.out, /une chose/);
    assert.match(res.out, /npm install -D @schneiderjoseph\/devia@99\.0\.0/);
    assert.match(res.out, /devia n'installe rien de lui-même/);
    assert.equal(res.code, 0, "being out of date is not a failure");

    // Nothing was installed and nothing in the project was touched.
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    assert.equal(pkg.devDependencies, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a command carries the notice, and --json never does", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    seedCache(dir, { checkedAt: new Date().toISOString(), latest: "99.0.0", release: RELEASE });

    const plain = devia(["validate", "--root", dir], dir, { env: { DEVIA_LANG: "fr" } });
    assert.match(plain.out, /devia 99\.0\.0 est disponible/);
    assert.match(plain.out, /Un devia bien plus récent/, "the headline is in the same language");

    // `--json` is a contract: prose on stdout breaks whatever is parsing it.
    const json = devia(["validate", "--root", dir, "--json"], dir, { allowFailure: true });
    assert.doesNotThrow(() => JSON.parse(json.out));
    assert.ok(!json.out.includes("99.0.0"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the notice never changes what a command decided", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    seedCache(dir, { checkedAt: new Date().toISOString(), latest: "99.0.0", release: RELEASE });
    // A bare fixture has no CI and no tests, so `check` fails P0 gates — with or without a notice.
    const res = devia(["check", "--root", dir], dir, { allowFailure: true });
    assert.equal(res.code, 1);
    assert.match(res.out, /devia 99\.0\.0 is available/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("switching the check off silences it everywhere, without reaching a registry", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    seedCache(dir, { checkedAt: new Date().toISOString(), latest: "99.0.0", release: RELEASE });

    for (const env of [{ DEVIA_NO_UPDATE_CHECK: "1" }, { CI: "true" }, { NO_UPDATE_NOTIFIER: "1" }]) {
      const res = devia(["validate", "--root", dir], dir, { env });
      assert.ok(!res.out.includes("99.0.0"), `notice leaked with ${JSON.stringify(env)}`);
    }

    const config = path.join(dir, ".devia", "devia.json");
    const json = JSON.parse(fs.readFileSync(config, "utf8"));
    fs.writeFileSync(config, JSON.stringify({ ...json, update: { check: false } }, null, 2));
    const off = devia(["update", "--root", dir], dir);
    assert.match(off.out, /off/i);
    assert.ok(!off.out.includes("99.0.0"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a cache that is current says so rather than pretending it just looked", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    seedCache(dir, {
      checkedAt: "2026-09-14T08:00:00.000Z",
      latest: pkg.version,
      release: RELEASE,
      announced: pkg.version,
    });
    const res = devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "en" } });
    assert.match(res.out, /newest published version/);
    assert.match(res.out, /Last checked 2026-09-14/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the version you are on announces itself once, from the package on disk", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    // No `announced`: this is the first run after an upgrade.
    seedCache(dir, { checkedAt: new Date().toISOString(), latest: pkg.version, release: null });

    const first = devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "fr" } });
    assert.match(first.out, /Ce qu'apporte la version/);
    assert.match(first.out, /permission implicite/);

    const second = devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "fr" } });
    assert.ok(!second.out.includes("Ce qu'apporte la version"), "announced once, not every day");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("the cache is generated, so init tells git to ignore it", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const ignore = fs.readFileSync(path.join(dir, ".devia", ".gitignore"), "utf8");
    assert.match(ignore, /\.update-check\.json/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("noticeLines says nothing at all when there is nothing to say", () => {
  assert.deepEqual(noticeLines({ updateAvailable: false }, "fr"), []);
  const lines = noticeLines(
    { updateAvailable: true, latest: "99.0.0", current: "0.9.0", release: RELEASE },
    "fr"
  );
  assert.equal(lines.length, 3, "three lines under a command, never more");
  assert.match(lines.join("\n"), /Un devia bien plus récent/);
});

/* -------------------------------------------------------- what the run leaves */

test("a run that answers from the cache does not throw the timestamp away", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const checkedAt = "2026-09-14T08:00:00.000Z";
    seedCache(dir, { checkedAt, latest: "99.0.0", release: RELEASE, announced: "0.9.0" });

    devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "en" } });

    const after = JSON.parse(fs.readFileSync(path.join(dir, ".devia", CACHE_FILE), "utf8"));
    // Dropping it made every answer permanently stale, so init and doctor re-looked-up every run.
    assert.equal(after.checkedAt, checkedAt);
    assert.equal(after.latest, "99.0.0");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("announcing a release records that it was announced, and keeps the timestamp", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    const checkedAt = "2026-09-14T08:00:00.000Z";
    seedCache(dir, { checkedAt, latest: pkg.version, release: null, announced: null });

    devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "en" } });
    const after = JSON.parse(fs.readFileSync(path.join(dir, ".devia", CACHE_FILE), "utf8"));
    assert.equal(after.announced, pkg.version);
    assert.equal(after.checkedAt, checkedAt);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a build ahead of the registry is told so, not told it is current", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    // The published version is behind the one running: true for every unreleased build.
    seedCache(dir, {
      checkedAt: new Date().toISOString(),
      latest: "0.0.1",
      release: null,
      announced: pkg.version,
    });
    const res = devia(["update", "--offline", "--root", dir], dir, { env: { DEVIA_LANG: "en" } });
    assert.match(res.out, /ahead of the newest published version \(0\.0\.1\)/);
    assert.ok(!res.out.includes("is the newest published version"));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("nothing is written when there was nothing to write", () => {
  const dir = scratch();
  try {
    devia(["init", "--root", dir, "--no-agents"], dir);
    const cache = path.join(dir, ".devia", CACHE_FILE);
    fs.rmSync(cache, { force: true });
    // Offline with no cache: no answer, so no file claiming one was checked.
    devia(["update", "--offline", "--root", dir], dir);
    assert.ok(!fs.existsSync(cache), "an empty cache would read as a check that happened");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
