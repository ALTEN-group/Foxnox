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
import { Password } from "app/passwords/data-access/passwords/password.model";

export const PASSWORD_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<Password>[] = (acls) =>
  withAclConditions(
    [
      ID_CONFIG,
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
        key: "pwdHash",
        label: "Password hash",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        columnOptions: {
          isHardHidden: true,
        },
        controlOptions: {
          hidden: true,
          validators: [required],
        },
      },
      {
        key: "pwdUpdatedAt",
        label: "Password updated at",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {
          disabled: true,
        },
      },
      {
        key: "pwdExpiry",
        label: "Password expiry",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {},
      },
      {
        key: "failedAttempts",
        label: "Failed attempts",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        controlOptions: {
          disabled: true,
          validators: [min(0)],
        },
      },
      {
        key: "lockedUntil",
        label: "Locked until",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {},
      },
      {
        key: "lastLoginAt",
        label: "Last login at",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {},
      },
      {
        key: "twoFactorEnabled",
        label: "Two-factor enabled",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "twoFactorSecret",
        label: "Two-factor secret",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        columnOptions: {
          isHardHidden: true,
        },
        controlOptions: {
          hidden: true,
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Password>[],
    acls,
  );
