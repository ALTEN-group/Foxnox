import { DomSanitizer } from "@angular/platform-browser";
import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import { ID_SORTED_CONFIG } from "@core/utils/field-config/id-sorted.config";
import { toSelectItems } from "@core/utils/primeng/to-select-items";
import { buildColoredChipsCellRenderer } from "@core/utils/renderers/colored-chips.renderer";
import {
  CONTROL_TYPES,
  INPUT_TYPES,
  maxlength,
  min,
  minlength,
  patternValidator,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { PolicyRole } from "app/passwords/data-access/policies/policy-role.model";
import { Policy } from "app/passwords/data-access/policies/policy.model";

export const POLICY_COLUMNS: (
  acls: Acls | undefined,
  roles: PolicyRole[],
  sanitizer: DomSanitizer,
) => StrictCrudItemOptions<Policy>[] = (acls, roles, sanitizer) =>
  withAclConditions(
    [
      ID_SORTED_CONFIG,
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
        label: "Min len",
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
        label: "Number",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "symbol",
        label: "Symbol",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "lowerCase",
        label: "Lowercase",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "upperCase",
        label: "Uppercase",
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {},
      },
      {
        key: "strict",
        label: "Strict mode",
        controlType: CONTROL_TYPES.CHECKBOX,
        columnOptions: {
          headerTooltip:
            "Applies to generated passwords only. On: each required character type (number, symbol, lowercase, uppercase) appears at least once. Off: characters are picked at random, so a required type may be missing.",
        },
        controlOptions: {},
      },
      {
        key: "symbols",
        label: "Allowed symbols",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [
            maxlength(50),
            patternValidator({
              pattern: /^[!-/:-@[-`{-~]*$/,
              message: "Symbols only (no letters, numbers or spaces)",
            }),
          ],
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
      {
        key: "roleIds",
        label: "Roles",
        controlType: CONTROL_TYPES.MULTISELECT,
        options: toSelectItems(roles, "name"),
        columnOptions: {
          headerTooltip:
            "Gatelin roles this policy applies to. A user with several roles must satisfy all their policies: the strictest rules are combined (longest length, every required character class, shortest expiry, fewest failed attempts, longest lockout). Users with no mapped role get the first policy.",
          customCellRenderer: buildColoredChipsCellRenderer(
            sanitizer,
            (value: unknown) => {
              const role = roles.find((r) => r.id === Number(value));
              return role
                ? { label: role.name, color: role.color || null }
                : undefined;
            },
          ),
        },
        controlOptions: {
          width: "100%",
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Policy>[],
    acls,
  );
