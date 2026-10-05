import { formatDate } from "@dwtechs/ngx-crud-builder";

export const EMPTY_DATE_CELL = `<i class="pi pi-times red"></i>`;

/**
 * Date column renderer that shows a red cross when there is no date, mirroring
 * how checkbox columns display `false`. A custom renderer replaces the grid's
 * built-in date renderer, so set dates are formatted here with the same
 * `formatDate` helper (same `yyyy-MM-dd` output).
 */
export function emptyDateCellRenderer(cellValue: unknown): string {
  if (!cellValue) return EMPTY_DATE_CELL;
  if (
    typeof cellValue === "string" ||
    typeof cellValue === "number" ||
    cellValue instanceof Date
  )
    return formatDate(cellValue);
  return "";
}
