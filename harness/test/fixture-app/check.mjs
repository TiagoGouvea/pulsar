// Minimal stand-in for the app toolchain, used to validate the harness gates.
import { readdirSync, readFileSync } from "node:fs";

const files = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${d}/${e.name}`) : [`${d}/${e.name}`]));
const src = files("src").filter((f) => !f.includes("__tests__")).map((f) => [f, readFileSync(f, "utf8")]);
const fail = (m) => { console.error(m); process.exit(1); };
const cmd = process.argv[2];

if (cmd === "lint") for (const [f, c] of src) if (c.includes("console.log")) fail(`${f}: console.log proibido`);
if (cmd === "typecheck") for (const [f, c] of src) if (/:\s*any\b/.test(c)) fail(`${f}: any proibido`);
if (cmd === "unit") {
  const { sum } = await import("./src/sum.js");
  if (sum(2, 3) !== 5) fail("sum(2, 3) !== 5");
}
console.log(`${cmd} ok`);
