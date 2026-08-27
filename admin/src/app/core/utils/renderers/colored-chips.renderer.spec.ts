import { DomSanitizer } from "@angular/platform-browser";
import { ColoredChipItem, buildColoredChipsCellRenderer } from "./colored-chips.renderer";

const FALLBACK_COLOR = "#6B7280";
const CHIP_PREFIX =
  '<span style="display:inline-flex;align-items:center;padding:2px 10px;border-radius:12px;background:';
const CHIP_MID = ';color:#fff;font-size:0.85em;">';
const CHIP_SUFFIX = "</span>";

function chipHtml(color: string, escapedLabel: string): string {
  return `${CHIP_PREFIX}${color}${CHIP_MID}${escapedLabel}${CHIP_SUFFIX}`;
}

function mockSanitizer(): {
  sanitizer: DomSanitizer;
  bypassSecurityTrustHtml: ReturnType<typeof vi.fn>;
} {
  const bypassSecurityTrustHtml = vi.fn((html: string) => html);
  return {
    sanitizer: { bypassSecurityTrustHtml } as unknown as DomSanitizer,
    bypassSecurityTrustHtml,
  };
}

describe("buildColoredChipsCellRenderer", () => {
  it("renders ordinary lookup labels and hex colors from a comma-separated string", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const lookup = vi.fn((name: string): ColoredChipItem | undefined => {
      if (name === "alpha") return { label: "Alpha", color: "#0f0" };
      if (name === "bravo") return { label: "Bravo", color: "#11223344" };
      return undefined;
    });
    const render = buildColoredChipsCellRenderer(sanitizer, lookup);

    const result = render(" alpha , bravo ");

    const expected =
      chipHtml("#0f0", "Alpha") + " " + chipHtml("#11223344", "Bravo");
    expect(bypassSecurityTrustHtml).toHaveBeenCalledTimes(1);
    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(expected);
    expect(result).toBe(expected);
    expect(lookup).toHaveBeenCalledWith("alpha");
    expect(lookup).toHaveBeenCalledWith("bravo");
  });

  it("renders chips from an array of names", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const lookup = vi.fn(
      (): ColoredChipItem => ({ label: "Ok", color: "#abc" }),
    );
    const render = buildColoredChipsCellRenderer(sanitizer, lookup);

    render(["one", "two"]);

    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(
      chipHtml("#abc", "Ok") + " " + chipHtml("#abc", "Ok"),
    );
  });

  it("falls back to the default color when the lookup color is missing or not hex", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const colors: Record<string, string | null> = {
      none: null,
      empty: "",
      named: "red",
      rgb: "rgb(255,0,0)",
      short: "#ff",
      long: "#123456789",
      spaced: "  #00ff00  ",
    };
    const lookup = (name: string): ColoredChipItem => ({
      label: name,
      color: colors[name] ?? null,
    });
    const render = buildColoredChipsCellRenderer(sanitizer, lookup);

    render("none,empty,named,rgb,short,long,spaced");

    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(
      [
        chipHtml(FALLBACK_COLOR, "none"),
        chipHtml(FALLBACK_COLOR, "empty"),
        chipHtml(FALLBACK_COLOR, "named"),
        chipHtml(FALLBACK_COLOR, "rgb"),
        chipHtml(FALLBACK_COLOR, "short"),
        chipHtml(FALLBACK_COLOR, "long"),
        chipHtml("#00ff00", "spaced"),
      ].join(" "),
    );
  });

  it("uses the raw name and fallback color when lookup returns nothing", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const render = buildColoredChipsCellRenderer(sanitizer, () => undefined);

    render("orphan");

    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(
      chipHtml(FALLBACK_COLOR, "orphan"),
    );
  });

  it("treats non-primitive cell values as empty", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const lookup = vi.fn();
    const render = buildColoredChipsCellRenderer(sanitizer, lookup);

    expect(render(null)).toBe("");
    expect(render(undefined)).toBe("");
    expect(render({})).toBe("");
    expect(render({ label: "nope" })).toBe("");
    expect(bypassSecurityTrustHtml).toHaveBeenCalledTimes(4);
    expect(bypassSecurityTrustHtml).toHaveBeenNthCalledWith(1, "");
    expect(lookup).not.toHaveBeenCalled();
  });

  it("keeps primitive non-strings and drops non-primitives from arrays", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const render = buildColoredChipsCellRenderer(sanitizer, () => undefined);

    render([0, false, "", null, { x: 1 }, "kept", true]);

    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(
      [
        chipHtml(FALLBACK_COLOR, "0"),
        chipHtml(FALLBACK_COLOR, "false"),
        chipHtml(FALLBACK_COLOR, "kept"),
        chipHtml(FALLBACK_COLOR, "true"),
      ].join(" "),
    );
  });

  it("HTML-escapes malicious lookup labels before bypassSecurityTrustHtml", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const malicious = `<script>alert("xss")</script> & 'quotes'`;
    const render = buildColoredChipsCellRenderer(sanitizer, () => ({
      label: malicious,
      color: "#ff0000",
    }));

    render("safe-name");

    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(
      chipHtml(
        "#ff0000",
        "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt; &amp; &#39;quotes&#39;",
      ),
    );
    const html = bypassSecurityTrustHtml.mock.calls[0][0] as string;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain(`alert("xss")`);
  });

  it("HTML-escapes malicious fallback names used as labels", () => {
    const { sanitizer, bypassSecurityTrustHtml } = mockSanitizer();
    const render = buildColoredChipsCellRenderer(sanitizer, () => undefined);
    const payload = `<img src=x onerror="steal()"> & "q"`;

    render(payload);

    expect(bypassSecurityTrustHtml).toHaveBeenCalledWith(
      chipHtml(
        FALLBACK_COLOR,
        "&lt;img src=x onerror=&quot;steal()&quot;&gt; &amp; &quot;q&quot;",
      ),
    );
    const html = bypassSecurityTrustHtml.mock.calls[0][0] as string;
    expect(html).not.toContain("<img");
    expect(html).not.toContain('onerror="steal()"');
  });
});
