import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const source = readFileSync(join(__dirname, "icon-source.svg"));
const maskable = readFileSync(join(__dirname, "icon-source-maskable.svg"));

const sizes = [
  { file: "icon-192.png", size: 192, input: source },
  { file: "icon-512.png", size: 512, input: source },
  { file: "icon-512-maskable.png", size: 512, input: maskable },
  { file: "apple-touch-icon.png", size: 180, input: source },
];

for (const { file, size, input } of sizes) {
  await sharp(input).resize(size, size).png().toFile(join(publicDir, file));
  console.log(`Generated ${file} (${size}x${size})`);
}
