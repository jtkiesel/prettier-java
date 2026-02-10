import { parser } from "@lezer/java";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, "../src/java-node-types.d.ts");

const nodeNames = [
  ...new Set(parser.nodeSet.types.filter(t => !t.isSkipped).map(t => t.name))
]
  .filter(n => /^[A-Z]/.test(n))
  .toSorted();

const out = `export type JavaNodeType =
${nodeNames.map(n => `  | "${n}"`).join("\n")};
`;

fs.writeFileSync(file, out);
