import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import { ID_SORTED_CONFIG } from "@core/utils/field-config/id-sorted.config";
import {
  ConditionFn,
  CONTROL_TYPES,
  INPUT_TYPES,
  maxlength,
  minlength,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { Branding } from "app/passwords/data-access/branding/branding.model";

// logoSource is a UI-only form field, absent from the Branding type
const hiddenUnlessLogoSource =
  (source: "url" | "file"): ConditionFn<Branding> =>
  ({ model }) =>
    (model as unknown as { logoSource: string }).logoSource !== source;

export const BRANDING_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<Branding>[] = (acls) =>
  withAclConditions(
    [
      ID_SORTED_CONFIG,
      {
        key: "name",
        label: "Company name",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, minlength(1), maxlength(80)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        key: "tagline",
        label: "Tagline",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(160)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        // UI-only switch: not sent to the backend
        // SELECT_BUTTON instead of RADIO: the library's radio ignores the control's initial value
        key: "logoSource",
        label: "Logo source",
        controlType: CONTROL_TYPES.SELECT_BUTTON,
        options: [
          { label: "URL", value: "url" },
          { label: "Uploaded image", value: "file" },
        ],
      },
      {
        key: "logoUrl",
        label: "Logo URL",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2048)],
          nonNullable: true,
          defaultValue: "",
        },
        conditions: {
          controlOptions: {
            hidden: hiddenUnlessLogoSource("url"),
          },
        },
      },
      {
        key: "logoFile",
        label: "Logo image",
        controlType: CONTROL_TYPES.FILES,
        controlOptions: {
          mediaType: "image",
          isPreviewEnabled: true,
          multiple: false,
          maxFileSize: 10 * 1024 * 1024,
          uploadSize: "small",
        },
      },
      {
        key: "logoAlt",
        label: "Logo alt text",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(120)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        key: "mark",
        label: "Fallback mark (shown when no logo)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        key: "primaryColor",
        label: "Primary color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "primaryHoverColor",
        label: "Primary color (hover)",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "secondaryColor",
        label: "Secondary color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "backgroundColor",
        label: "Background color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "fontFamily",
        label: "Font (system, serif or mono)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, maxlength(20)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        key: "radius",
        label: "Corner radius (e.g. 12px)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, maxlength(6)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        key: "footerText",
        label: "Footer text",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(240)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      {
        key: "footerUrl",
        label: "Footer link",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2048)],
          nonNullable: true,
          defaultValue: "",
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Branding>[],
    acls,
  ).map((col) =>
    // logoFile is not an UPDATE field of the entity (the generic PUT must not write it), so the
    // schema-derived allow-list always excludes it: gate it on the upload route permission instead.
    col.key === "logoFile"
      ? {
          ...col,
          conditions: {
            controlOptions: {
              disabled: () => !!acls && !acls.updateFiles?.allowed,
              hidden: hiddenUnlessLogoSource("file"),
            },
          },
        }
      : (col.key as string) === "logoSource"
        ? { ...col, conditions: undefined }
        : col,
  );
