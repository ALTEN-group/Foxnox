import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import { ID_SORTED_CONFIG } from "@core/utils/field-config/id-sorted.config";
import {
  CONTROL_TYPES,
  INPUT_TYPES,
  maxlength,
  minlength,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { SecurityQuestion } from "app/passwords/data-access/questions/question.model";

// Seeded security_question_category rows (db/liquibase/foxnox/versions/06-data/03-question.sql)
const QUESTION_CATEGORIES = [
  { label: "Personal", value: 1 },
  { label: "Family", value: 2 },
  { label: "Work", value: 3 },
  { label: "Favorites", value: 4 },
  { label: "Education", value: 5 },
];

// Keys of security_question.trans, limited to the languages the workflow pages
// serve (web/locales). Adding one is a single entry here, the API stores the map
// as it is sent — but a language missing from this list is dropped from the row
// on the next save, since the form replaces the whole map.
const TRANSLATION_LANGS = [
  { lang: "en", label: "English" },
  { lang: "fr", label: "French" },
] as const;

// The cell renderer output is bound with [innerHTML], so escape the stored texts.
const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const SECURITY_QUESTION_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<SecurityQuestion>[] = (acls) =>
  withAclConditions(
    [
      ID_SORTED_CONFIG,
      {
        key: "question",
        label: "Question",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        columnOptions: {
          headerTooltip:
            "Identifier and fallback text, shown when the user's language has no translation below.",
        },
        controlOptions: {
          validators: [required, minlength(1), maxlength(255)],
        },
      },
      {
        key: "trans",
        label: "Translations",
        controlType: CONTROL_TYPES.GROUP,
        children: TRANSLATION_LANGS.map(({ lang, label }) => ({
          key: lang,
          label,
          controlType: CONTROL_TYPES.INPUT,
          type: INPUT_TYPES.TEXT,
          controlOptions: {
            validators: [maxlength(255)],
            width: "100%",
          },
        })),
        columnOptions: {
          sortable: false,
          filterable: false,
          // One line per language, so the history dialog shows which text changed.
          // Hidden in the grid by default (restore it from the column management)
          // because those lines would make every row six lines tall.
          isSoftHidden: true,
          defaultWidth: "400px",
          headerTooltip: "Texts shown to users, one line per language.",
          customCellRenderer: (value) =>
            Object.entries((value ?? {}) as Record<string, string>)
              .filter(([, text]) => text)
              .map(([lang, text]) => {
                const escaped = escapeHtml(text);
                return `<div title="${escaped}">${lang} : ${escaped}</div>`;
              })
              .join(""),
        },
      },
      {
        key: "categoryId",
        label: "Category",
        controlType: CONTROL_TYPES.SELECT,
        options: QUESTION_CATEGORIES,
        controlOptions: {
          validators: [required],
        },
      },
      {
        key: "active",
        label: "Active",
        controlType: CONTROL_TYPES.CHECKBOX,
        columnOptions: {
          defaultWidth: "60px",
          headerTooltip:
            "Only active questions are offered to users when they set up their recovery answers.",
        },
        controlOptions: {},
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<SecurityQuestion>[],
    acls,
  );
