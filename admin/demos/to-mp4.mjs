// Encodes Playwright raw videos (WebM) into streamable H.264 MP4 + JPG poster for the website,
// trimmed at the start described by `<name>.json`.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const videos = join(here, "videos");
const website = join(here, "..", "..", "website", "docs", "public", "videos");
if (!existsSync(videos)) process.exit(0);
mkdirSync(website, { recursive: true });

function ffmpeg(args) {
  const result = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
  if (result.error) throw new Error(`ffmpeg not found: ${result.error.message}`);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const meta of readdirSync(videos).filter((f) => f.endsWith(".json"))) {
  const name = meta.replace(/\.json$/, "");
  const { start } = JSON.parse(readFileSync(join(videos, meta), "utf8"));
  const output = join(website, `${name}.mp4`);
  ffmpeg([
    "-ss", String(start),
    "-i", join(videos, `${name}.webm`),
    "-an",
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    output,
  ]);
  ffmpeg(["-ss", "1", "-i", output, "-frames:v", "1", "-q:v", "3", join(website, `${name}.jpg`)]);
  console.log(`✓ ${output}`);
}
