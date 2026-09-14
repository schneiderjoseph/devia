import os from "node:os";
import path from "node:path";

/**
 * What may leave the machine.
 *
 * A contribution to devia is built from inside a user's private repository. That repository
 * stays the user's: everything entering a contribution payload passes through here first, and
 * `residue()` re-reads the finished payload and refuses it when anything survived.
 *
 * Redaction is reported, never silent. A payload cleaned without saying so is a payload nobody
 * can review, and review is the last gate before an upload (`PRIV-005`).
 */

/**
 * Secret shapes. This list is the single source of truth: `devia check` scans a repository with
 * it and the sanitizer scans an outbound payload with it, so a pattern added for one is
 * immediately true for the other.
 *
 * It is a coarse pattern match, not entropy analysis (`12_DEBT.md` D5). A clean result means
 * these shapes were not found — never that nothing sensitive is present, which is why
 * `contribute` also puts the whole payload in front of a human before anything is sent.
 */
export const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key id"],
  [/-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, "private key"],
  [/sk_live_[0-9a-zA-Z]{16,}/, "live secret key"],
  [/gh[pousr]_[0-9A-Za-z]{30,}/, "GitHub token"],
  [/xox[baprs]-[0-9A-Za-z-]{10,}/, "Slack token"],
  [/AIza[0-9A-Za-z_-]{35}/, "Google API key"],
  [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/, "JWT"],
];

const REDACTED = "[redacted]";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/**
 * `API_TOKEN = "..."` in the shapes a config file and a source file actually use.
 *
 * The sensitive word has to be a whole segment of the key, not a substring of it: matching "key"
 * anywhere would redact `monkey: banana` and shred the text it was meant to protect. So the
 * snake pattern requires an underscore boundary or the bare word, and the camel pattern requires
 * a capital — which `monkey` does not have and `accessToken` does.
 *
 * The placeholder is excluded from the value. Without that, sanitizing an already-sanitized file
 * matches its own output and reports a redaction that protected nothing, inflating the count
 * every time the text passes through.
 */
const VALUE = `(?!\\[redacted\\]|"\\[redacted\\]"|'\\[redacted\\]')("[^"\\n]*"|'[^'\\n]*'|[^\\s#,;)]+)`;
const SEP = "(\\s*[=:]\\s*)";

const CREDENTIALS = [
  new RegExp(
    `\\b((?:[A-Za-z][A-Za-z0-9]*_)*(?:token|secret|password|passwd|api_?key|credentials?))${SEP}${VALUE}`,
    "gi"
  ),
  new RegExp(
    `\\b([a-z][A-Za-z0-9]*(?:Token|Secret|Password|Passwd|ApiKey|Key|Credentials?))${SEP}${VALUE}`,
    "g"
  ),
];

/** Keep the quoting the file used, so a redacted fixture still parses as what it was. */
function redactValue(_, key, sep, value) {
  const quote = value[0] === '"' || value[0] === "'" ? value[0] : "";
  return `${key}${sep}${quote}${REDACTED}${quote}`;
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A path, matched with either separator: the same home directory is written both ways. */
function pathRe(dir) {
  if (!dir) return null;
  const source = escapeRe(dir).replace(/\\\\|\//g, "[\\\\/]");
  return new RegExp(source, "gi");
}

function accountRe(home) {
  const account = home ? path.basename(home) : "";
  // Two characters is a word, not an account name. Redacting it would shred the prose.
  if (account.length < 3) return null;
  return new RegExp(`\\b${escapeRe(account)}\\b`, "gi");
}

/**
 * Redact a string. Returns the cleaned text and what was removed, counted by kind, so a report
 * can say "3 absolute paths, 1 email address" instead of "sanitized: true".
 */
export function sanitize(text, { root = null } = {}) {
  let out = String(text ?? "");
  const removed = new Map();
  const note = (kind, n) => {
    if (n) removed.set(kind, (removed.get(kind) || 0) + n);
  };

  const replace = (re, kind, replacer) => {
    if (!re) return;
    const hits = out.match(re);
    if (!hits) return;
    note(kind, hits.length);
    out = out.replace(re, replacer || REDACTED);
  };

  // Secrets first: a token inside a URL must not be reduced to a hostname and then shipped.
  for (const [re, label] of SECRET_PATTERNS) {
    replace(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g"), label);
  }

  for (const re of CREDENTIALS) replace(re, "credential assignment", redactValue);

  // The repository root becomes a stable placeholder rather than a path naming the project.
  if (root) replace(pathRe(path.resolve(root)), "repository path", "<repo>");

  const home = os.homedir();
  replace(EMAIL, "email address");
  replace(pathRe(home), "home directory");
  replace(accountRe(home), "account name");
  replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "ip address");

  return { text: out, removed: [...removed].map(([kind, count]) => ({ kind, count })) };
}

/**
 * What survived. Run against a finished payload: a non-empty result blocks the upload rather
 * than warning about it, because a warning on the last screen before a network call is a
 * warning that gets accepted.
 */
export function residue(text) {
  const s = String(text ?? "");
  const found = [];
  for (const [re, label] of SECRET_PATTERNS) {
    if (re.test(s)) found.push(label);
  }
  const home = pathRe(os.homedir());
  if (home && home.test(s)) found.push("home directory");
  if (new RegExp(EMAIL.source).test(s)) found.push("email address");
  return found;
}
