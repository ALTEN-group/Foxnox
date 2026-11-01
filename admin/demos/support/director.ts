import type { BrowserContext, Locator, Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const VIDEOS_DIR = join(__dirname, "..", "videos");

/**
 * Fake cursor: Playwright videos do not film the mouse. It follows the real events sent by
 * `page.mouse`, and marks each click with a ring.
 */
const CURSOR_SCRIPT = `
window.addEventListener("DOMContentLoaded", () => {
  const style = document.createElement("style");
  style.textContent = \`
    #demo-cursor { position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;
      width: 28px; height: 28px; transform: translate(-4px, -2px);
      filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); }
    .demo-click { position: fixed; z-index: 2147483646; pointer-events: none; width: 44px; height: 44px;
      margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid #f97316;
      animation: demo-click 500ms ease-out forwards; }
    @keyframes demo-click { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.4); opacity: 0; } }
  \`;
  document.head.append(style);
  const cursor = document.createElement("div");
  cursor.id = "demo-cursor";
  cursor.style.left = "-100px";
  cursor.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.9L4 20z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
  document.body.append(cursor);
  document.addEventListener("mousemove", (e) => {
    cursor.style.left = e.clientX + "px";
    cursor.style.top = e.clientY + "px";
  }, true);
  document.addEventListener("mousedown", (e) => {
    const ring = document.createElement("div");
    ring.className = "demo-click";
    ring.style.left = e.clientX + "px";
    ring.style.top = e.clientY + "px";
    document.body.append(ring);
    setTimeout(() => ring.remove(), 600);
  }, true);
});
`;

/** Drives a filmed scenario: slow gestures, pauses, and an edit point. */
export class Director {
  private x: number;
  private y: number;
  private readonly openedAt = Date.now();
  /** Seconds since the page opened: everything before is cut when encoding. */
  private start = 0;

  private constructor(private readonly page: Page) {
    const viewport = page.viewportSize() ?? { width: 1440, height: 900 };
    this.x = viewport.width / 2;
    this.y = viewport.height / 2;
  }

  static async on(context: BrowserContext, page: Page): Promise<Director> {
    await context.addInitScript(CURSOR_SCRIPT);
    return new Director(page);
  }

  /** Everything before (blank page, app loading, off-camera setup) is cut when encoding. */
  async action(): Promise<void> {
    await this.page.mouse.move(this.x, this.y);
    await this.pause(300);
    this.start = (Date.now() - this.openedAt) / 1000;
  }

  pause(ms: number): Promise<void> {
    return this.page.waitForTimeout(ms);
  }

  /** Human-speed move: duration follows distance. */
  async moveTo(x: number, y: number): Promise<void> {
    const distance = Math.hypot(x - this.x, y - this.y);
    const steps = Math.max(8, Math.round(distance / 12));
    await this.page.mouse.move(x, y, { steps });
    this.x = x;
    this.y = y;
  }

  async hover(target: Locator): Promise<void> {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("Element not displayed");
    await this.moveTo(box.x + box.width / 2, box.y + box.height / 2);
  }

  async click(target: Locator, pauseAfter = 700): Promise<void> {
    await this.hover(target);
    await this.pause(250);
    await this.page.mouse.down();
    await this.page.mouse.up();
    await this.pause(pauseAfter);
  }

  /** Clicks the field, clears it, then types at human speed. */
  async type(target: Locator, text: string, pauseAfter = 500): Promise<void> {
    await this.click(target, 200);
    await target.press("ControlOrMeta+a");
    await target.pressSequentially(text, { delay: 80 });
    await this.pause(pauseAfter);
  }

  /** Closes the page to finalize the video, stores it as `videos/<name>.webm` plus its cut in `<name>.json`. */
  async save(name: string): Promise<void> {
    const video = this.page.video();
    await this.page.close();
    if (!video) throw new Error("Video recording is off");
    await mkdir(VIDEOS_DIR, { recursive: true });
    await video.saveAs(join(VIDEOS_DIR, `${name}.webm`));
    await writeFile(
      join(VIDEOS_DIR, `${name}.json`),
      JSON.stringify({ start: this.start }),
    );
  }
}
