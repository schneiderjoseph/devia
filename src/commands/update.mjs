import path from "node:path";
import process from "node:process";
import { exists, readJSON } from "../lib/fs.mjs";
import { cliVersion } from "../lib/version.mjs";
import { detectLanguage, t, LANGUAGES } from "../lib/i18n.mjs";
import {
  PACKAGE,
  runNpm,
  CHANGELOG_URL,
  checkingAllowed,
  readCache,
  writeCache,
  isStale,
  lookupLatest,
  localRelease,
  releaseFor,
  isNewer,
  isVersionLike,
  installCommand,
} from "../lib/update.mjs";
import { color, heading, status, line } from "../lib/ui.mjs";

/**
 * `devia update` — is there a newer devia, what does it bring, and do you want it?
 *
 * Three answers, in that order, and the third is always the user's. devia prints the command; it
 * runs it only when `--yes` says so, and it prints it before running it either way. A tool that
 * upgrades itself while you were asking it something else is a tool you cannot reason about.
 *
 * The summary is shown in the reader's language because that is the only part of devia addressed
 * to a person rather than to an agent — and an update notice nobody can read is not a notice.
 */

/** A notice short enough to sit under any command's output without becoming the output. */
export function noticeLines(report, lang) {
  if (!report.updateAvailable) return [];
  // Resolved once: passing an undefined language on to `releaseFor` silently selected the English
  // notes under a French heading, which is the one failure a translated notice cannot have.
  const language = lang || detectLanguage();
  const say = t(language);
  const notes = releaseFor(report.release, language);
  const out = [color.bold(say.newer(report.latest, report.current))];
  if (notes?.headline) out.push(color.dim(notes.headline));
  out.push(`${say.howTo} ${color.bold("npx devia update")}`);
  return out;
}

/** Write the cache only where there is a memory to hold it, never outside `--root`. */
function save(deviaDir, value) {
  if (exists(deviaDir) && value.checkedAt) writeCache(deviaDir, value);
}

function printNotes(notes, version, lang) {
  const say = t(lang);
  if (!notes) {
    line(color.dim(`  ${say.noNotes(CHANGELOG_URL)}`));
    return;
  }
  line("");
  line(`  ${color.bold(say.brings(version))}`);
  if (notes.headline) {
    line(`  ${notes.headline}`);
  }
  for (const [key, label] of [["added", say.added], ["fixed", say.fixed], ["changed", say.changed]]) {
    if (!notes[key]?.length) continue;
    line("");
    line(`  ${color.dim(label)}`);
    for (const bullet of notes[key]) line(`    · ${bullet}`);
  }
  line("");
}

/**
 * Run the install the user asked for.
 *
 * Inherited stdio, so npm's own output and its own prompts belong to the user, and the exit code
 * is npm's. devia does not interpret the result beyond reporting it: pretending an install
 * succeeded is the one thing worse than not offering one.
 */
function runInstall(root, version, lang) {
  const say = t(lang);
  const target = isVersionLike(version) ? version : "latest";
  const cmd = installCommand(target);
  line("");
  line(`  ${say.willRun}`);
  line(`    ${color.bold(cmd)}`);
  line("");
  // `target` passed `isVersionLike` above, so nothing a shell could read as syntax reaches it.
  const res = runNpm(["install", "-D", `${PACKAGE}@${target}`], { cwd: root, stdio: "inherit" });
  if (res.status === 0) {
    status("PASS", say.installed(target));
    line("");
    return 0;
  }
  status("FAIL", say.failed);
  line("");
  return 1;
}

export default async function update(ctx) {
  const { root, deviaDir, flags } = ctx;
  const lang = flags.lang && flags.lang !== true ? String(flags.lang) : detectLanguage();
  const say = t(lang);
  const current = cliVersion();

  if (flags.help) {
    line(`
${color.bold("devia update")} — is there a newer devia, and what does it bring?

  devia update              check, and show what a newer version would bring
  devia update --yes        run the install after printing the exact command
  devia update --offline    report from the last check, without reaching the registry
  devia update --json       machine-readable

  --lang <${LANGUAGES.join("|")}>   force the language of the summary
  --root <dir>              repository whose .devia/ holds the cached answer

devia never installs anything on its own. The lookup is handed to your own npm — the same
registry, proxy and credentials you already use — and nothing about this repository is sent.

Turn it off with ${color.bold("DEVIA_NO_UPDATE_CHECK=1")}, or \`"update": { "check": false }\`
in .devia/devia.json. It is off in CI by default.
`.trim());
    return 0;
  }

  const config = exists(deviaDir) ? readJSON(path.join(deviaDir, "devia.json")) : null;
  const allowed = checkingAllowed(config, process.env);
  const cached = exists(deviaDir) ? readCache(deviaDir) : null;
  const offline = Boolean(flags.offline) || !allowed;

  // One object, written once at the end. Two separate writes lost `checkedAt` whenever the
  // second one ran against a cache that did not exist yet — which left every answer permanently
  // stale, so `init` and `doctor` re-looked-up on every single run.
  const next = {
    checkedAt: cached?.checkedAt || null,
    latest: cached?.latest || null,
    release: cached?.release || null,
    announced: cached?.announced || null,
  };
  let reached = false;

  if (!offline) {
    const found = lookupLatest();
    if (found) {
      reached = true;
      next.checkedAt = new Date().toISOString();
      next.latest = found.latest;
      next.release = found.release;
    }
  }
  const latest = next.latest;
  const release = next.release;

  const available = Boolean(latest && isNewer(latest, current));
  const notes = releaseFor(release, lang);

  if (ctx.json) {
    console.log(
      JSON.stringify(
        {
          current,
          latest,
          updateAvailable: available,
          checkingAllowed: allowed,
          reachedRegistry: reached,
          language: lang,
          notes,
          command: available ? installCommand(latest) : null,
          changelog: CHANGELOG_URL,
        },
        null,
        2
      )
    );
    return 0;
  }

  heading(`devia update — ${current}`);

  if (!allowed) {
    status("SKIP", say.disabled);
    line("");
    return 0;
  }
  if (!latest) {
    status("WARN", say.unreachable);
    line(color.dim(`  ${installCommand("latest")}`));
    line("");
    return 0;
  }
  if (!available) {
    // Ahead of the registry is not the same as current, and saying "you have the newest
    // published version" to somebody running an unpublished build is a small lie devia does not
    // get to tell.
    const ahead = latest && isNewer(current, latest);
    status("PASS", ahead ? say.ahead(current, latest) : say.current(current));
    // The version you are on publishes its own summary, so the first run after an upgrade can
    // still answer "what did I just get" — from the package on disk, with nothing fetched.
    // Announced once: a release note that reappears every day is a release note nobody reads.
    if (next.announced !== current) {
      printNotes(releaseFor(localRelease(), lang), current, lang);
      next.announced = current;
    } else if (next.checkedAt && !reached) {
      line(color.dim(`  ${say.checkedAt(next.checkedAt.slice(0, 10))}`));
    }
    save(deviaDir, next);
    line("");
    return 0;
  }

  save(deviaDir, next);
  status("INFO", say.newer(latest, current));
  printNotes(notes, latest, lang);

  if (flags.yes) return runInstall(root, latest, lang);

  line(`  ${say.howTo}`);
  line(`    ${color.bold(installCommand(latest))}`);
  line(`    ${color.bold("npx devia update --yes")}`);
  line("");
  line(color.dim(`  ${say.decide}`));
  line("");
  return 0;
}

/**
 * Refresh the cached answer, for the commands allowed to spend a lookup on it.
 *
 * `doctor` only: it is the command whose whole job is to say whether this setup is stale. Every
 * other command reads what it left behind, so no hot path ever waits on a registry — and `init`
 * is excluded on purpose, because a devia you just installed is the newest one by construction.
 */
export function refreshCache(deviaDir, config) {
  if (!exists(deviaDir) || !checkingAllowed(config, process.env)) return null;
  const cached = readCache(deviaDir);
  if (!isStale(cached)) return cached;
  const found = lookupLatest();
  if (!found) return cached;
  const next = {
    checkedAt: new Date().toISOString(),
    latest: found.latest,
    release: found.release,
    announced: cached?.announced || cliVersion(),
  };
  writeCache(deviaDir, next);
  return next;
}
