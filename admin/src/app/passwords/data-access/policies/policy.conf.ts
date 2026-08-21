import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import {
  CONTROL_TYPES,
  ID_CONFIG,
  INPUT_TYPES,
  maxlength,
  min,
  minlength,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { Policy } from "app/passwords/data-access/policies/policy.model";

export const POLICY_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<Policy>[] = (acls) =>
  withAclConditions(
    [
      ID_CONFIG,
      {
        key: "name",
        label: "Name",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, minlength(1), maxlength(50)],
        },
      },
      {
        key: "description",
        label: "Description",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(100)],
        },
      },
      {
        key: "length",
        label: "Minimum length",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        columnOptions: {
          defaultWidth: "80px",
        },
        controlOptions: {
          validators: [required, min(6)],
        },
      },
      {
        key: "number",
        label: "Requires a number",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "symbol",
        label: "Requires a symbol",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "lowerCase",
        label: "Requires a lowercase letter",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "upperCase",
        label: "Requires an uppercase letter",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "strict",
        label: "Strict mode",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "symbols",
        label: "Allowed symbols",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(50)],
        },
        conditions: {
          controlOptions: {
            disabled: ({ model }) => !model.symbol,
          },
        },
      },
      {
        key: "expiryDays",
        label: "Expiry (days)",
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
        key: "maxFailedAttempts",
        label: "Max failed attempts",
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
        key: "lockoutMinutes",
        label: "Lockout duration (minutes)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        columnOptions: {
          defaultWidth: "80px",
        },
        controlOptions: {
          validators: [required, min(0)],
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Policy>[],
    acls,
  );
