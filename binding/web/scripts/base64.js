import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log("Updating the WASM model");

const sourceDirectory = join(
  __dirname,
  "..",
  "..",
  "..",
  "lib",
  "wasm"
);

const outputDirectory = join(__dirname, "../template/src");

const wasmFile = readFileSync(join(sourceDirectory, "pv_cobra.wasm"));
const strBase64 = Buffer.from(wasmFile).toString("base64");
const jsSourceFileOutput = `export const COBRA_WASM_BASE64 = '${strBase64}';\n`;

writeFileSync(
  join(outputDirectory, "cobra_b64.ts"),
  jsSourceFileOutput
);

console.log("... Done!");
