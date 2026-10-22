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
            "Default text. Seeded questions also have per-language translations that take precedence over it on the recovery pages.",
        },
        controlOptions: {
          validators: [required, minlength(1), maxlength(255)],
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
