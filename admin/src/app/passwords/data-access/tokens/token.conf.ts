import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import {
  CONTROL_TYPES,
  ID_CONFIG,
  INPUT_TYPES,
  min,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { Token } from "app/passwords/data-access/tokens/token.model";

// Static reference data (db/liquibase/pwd/versions/06-data/03-token-data.sql) —
// token_type has no admin route of its own, so its 4 seeded rows are hardcoded here.
const TOKEN_TYPES = [
  { label: "Email verification", value: 1 },
  { label: "Backup email verification", value: 2 },
  { label: "Password reset", value: 3 },
  { label: "Account recovery", value: 4 },
];

export const TOKEN_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<Token>[] = (acls) =>
  withAclConditions(
    [
      ID_CONFIG,
      {
        key: "typeId",
        label: "Type",
        controlType: CONTROL_TYPES.SELECT,
        options: TOKEN_TYPES,
        controlOptions: {
          validators: [required],
        },
      },
      {
        key: "userId",
        label: "User ID",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        columnOptions: {
          defaultWidth: "80px",
        },
        controlOptions: {
          validators: [required, min(1)],
        },
      },
      {
        key: "attempts",
        label: "Attempts",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        columnOptions: {
          defaultWidth: "80px",
        },
        controlOptions: {
          validators: [min(0)],
        },
      },
      {
        key: "expiresAt",
        label: "Expires at",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {
          dateShowTime: true,
        },
      },
      {
        key: "verifiedAt",
        label: "Verified at",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {
          dateShowTime: true,
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Token>[],
    acls,
  );
