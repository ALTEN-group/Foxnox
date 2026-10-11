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
import { Branding } from "app/passwords/data-access/branding/branding.model";

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
        },
      },
      {
        key: "tagline",
        label: "Tagline",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(160)],
        },
      },
      {
        key: "logoUrl",
        label: "Logo URL (takes priority over the uploaded image)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2048)],
          width: "33%",
        },
      },
      {
        key: "logoAlt",
        label: "Logo alt text",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(120)],
          width: "33%",
        },
      },
      {
        key: "mark",
        label: "Fallback mark (shown when no logo)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2)],
          width: "33%",
        },
      },
      {
        key: "logoFile",
        label: "Logo image (uploading it clears the logo URL)",
        controlType: CONTROL_TYPES.FILES,
        controlOptions: {
          mediaType: "image",
          isPreviewEnabled: true,
          multiple: false,
          maxFileSize: 10 * 1024 * 1024,
          width: "100%",
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
        },
      },
      {
        key: "radius",
        label: "Corner radius (e.g. 12px)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, maxlength(6)],
        },
      },
      {
        key: "footerText",
        label: "Footer text",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(240)],
        },
      },
      {
        key: "footerUrl",
        label: "Footer link",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2048)],
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
            },
          },
        }
      : col,
  );
