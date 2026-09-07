#!/usr/bin/env node
import process from "node:process";
import { run } from "../src/cli.mjs";

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code || 0;
  })
  .catch((err) => {
    console.error(`devia: ${err?.message || err}`);
    if (process.env.DEVIA_DEBUG) console.error(err);
    process.exitCode = 1;
  });
