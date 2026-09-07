import process from "node:process";

const useColor =
  process.stdout.isTTY && !process.env.NO_COLOR && process.env.TERM !== "dumb";

const ESC = String.fromCharCode(27);
const wrap = (code) => (s) =>
  useColor ? `${ESC}[${code}m${s}${ESC}[0m` : String(s);

export const color = {
  bold: wrap("1"),
  dim: wrap("2"),
  red: wrap("31"),
  green: wrap("32"),
  yellow: wrap("33"),
  blue: wrap("34"),
  gray: wrap("90"),
};

export function heading(text) {
  console.log("\n" + color.bold(text));
}

export function line(text = "") {
  console.log(text);
}

export const STATUS = {
  PASS: color.green("PASS"),
  WARN: color.yellow("WARN"),
  FAIL: color.red("FAIL"),
  SKIP: color.gray("SKIP"),
  INFO: color.blue("INFO"),
};

export function status(kind, label, detail = "") {
  const tag = STATUS[kind] ?? kind;
  console.log(`  ${tag}  ${label}${detail ? color.dim(" — " + detail) : ""}`);
}

export function summary(counts) {
  const parts = [];
  for (const [k, v] of Object.entries(counts)) {
    if (v) parts.push(`${v} ${k.toLowerCase()}`);
  }
  return parts.length ? parts.join(" · ") : "nothing to report";
}

export function fail(message) {
  console.error(color.red("error: ") + message);
  process.exitCode = 1;
}
