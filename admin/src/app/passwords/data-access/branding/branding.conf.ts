import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import { ID_SORTED_CONFIG } from "@core/utils/field-config/id-sorted.config";
import {
  ConditionFn,
  CONTROL_TYPES,
  INPUT_TYPES,
  max,
  maxlength,
  min,
  minlength,
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { Branding } from "app/passwords/data-access/branding/branding.model";

// Keys accepted by the backend (src/web/branding.js FONT_FAMILIES).
const FONT_FAMILIES = [
  { label: "System", value: "system" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "mono" },
];

// logoSource and faviconSource are UI-only form fields, absent from the Branding type
const hiddenUnlessSource =
  (
    field: "logoSource" | "faviconSource",
    source: "url" | "file",
  ): ConditionFn<Branding> =>
  ({ model }) =>
    (model as unknown as Record<string, string>)[field] !== source;

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
            hidden: hiddenUnlessSource("logoSource", "url"),
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
        // UI-only switch: not sent to the backend
        key: "faviconSource",
        label: "Favicon source",
        controlType: CONTROL_TYPES.SELECT_BUTTON,
        options: [
          { label: "URL", value: "url" },
          { label: "Uploaded image", value: "file" },
        ],
      },
      {
        key: "faviconUrl",
        label: "Favicon URL",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2048)],
          nonNullable: true,
          defaultValue: "",
        },
        conditions: {
          controlOptions: {
            hidden: hiddenUnlessSource("faviconSource", "url"),
          },
        },
      },
      {
        key: "faviconFile",
        label: "Favicon image",
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
        key: "brandNameColor",
        label: "Brand name color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "cardTitleColor",
        label: "Card title color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "labelColor",
        label: "Field label color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "buttonTextColor",
        label: "Button text color",
        controlType: CONTROL_TYPES.COLOR,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "fontFamily",
        label: "Font",
        controlType: CONTROL_TYPES.SELECT,
        options: FONT_FAMILIES,
        controlOptions: {
          validators: [required],
        },
      },
      {
        // Held as a number in the form; the component maps it to the stored "<n>px" string
        key: "radius",
        label: "Corner radius (px)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        controlOptions: {
          validators: [required, min(0), max(24)],
          min: 0,
          max: 24,
          step: 1,
          maxFractionDigits: 0,
          nonNullable: true,
          defaultValue: 12,
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
  ).map((col) => {
    const key = col.key as string;
    // The file fields are not UPDATE fields of the entity (the generic PUT must not write them), so the
    // schema-derived allow-list always excludes them: gate them on the upload route permission instead.
    if (key === "logoFile" || key === "faviconFile")
      return {
        ...col,
        conditions: {
          controlOptions: {
            disabled: () => !!acls && !acls.updateFiles?.allowed,
            hidden: hiddenUnlessSource(
              key === "logoFile" ? "logoSource" : "faviconSource",
              "file",
            ),
          },
        },
      };
    if (key === "logoSource" || key === "faviconSource")
      return { ...col, conditions: undefined };
    return col;
  });
