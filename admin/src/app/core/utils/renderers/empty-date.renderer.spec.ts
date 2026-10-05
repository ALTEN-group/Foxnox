import { EMPTY_DATE_CELL, emptyDateCellRenderer } from "./empty-date.renderer";

vi.mock("@dwtechs/ngx-crud-builder", () => ({
  formatDate: vi.fn((v: unknown) => `formatted(${String(v)})`),
}));

describe("emptyDateCellRenderer", () => {
  it.each([null, undefined, "", 0])(
    "renders a red cross for empty value %j",
    (value) => {
      expect(emptyDateCellRenderer(value)).toBe(EMPTY_DATE_CELL);
    },
  );

  it("uses the red cross icon", () => {
    expect(EMPTY_DATE_CELL).toBe('<i class="pi pi-times red"></i>');
  });

  it.each([
    ["ISO string", "2030-01-01T00:00:00.000Z"],
    ["timestamp", 1893456000000],
    ["Date", new Date("2030-01-01T00:00:00.000Z")],
  ])("delegates a set %s to formatDate", (_label, value) => {
    expect(emptyDateCellRenderer(value)).toBe(`formatted(${String(value)})`);
  });

  it("renders nothing for a non-date object", () => {
    expect(emptyDateCellRenderer({})).toBe("");
  });
});
