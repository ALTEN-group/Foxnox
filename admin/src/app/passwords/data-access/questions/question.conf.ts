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

// Keys of security_question.trans. Adding a language is a single entry here:
// the API stores the map as it is sent.
const TRANSLATION_LANGS = [
  { lang: "en", label: "English" },
  { lang: "fr", label: "French" },
  { lang: "es", label: "Spanish" },
  { lang: "de", label: "German" },
  { lang: "it", label: "Italian" },
  { lang: "pt", label: "Portuguese" },
] as const;

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
          },
        })),
        columnOptions: {
          sortable: false,
          filterable: false,
          defaultWidth: "120px",
          headerTooltip:
            "Languages this question is translated into. Texts are edited in the form.",
          customCellRenderer: (value) =>
            Object.entries((value ?? {}) as Record<string, string>)
              .filter(([, text]) => text)
              .map(([lang]) => lang)
              .join(", "),
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
