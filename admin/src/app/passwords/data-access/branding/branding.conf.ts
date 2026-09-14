import { Acls } from "@core/acl/acls.model";
import { withAclConditions } from "@core/utils/field-config/acl-conditions.utils";
import { buildArchivedConfig } from "@core/utils/field-config/archived.config";
import { buildAuditConfig } from "@core/utils/field-config/audit.config";
import {
  CONTROL_TYPES,
  ID_CONFIG,
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
      ID_CONFIG,
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
        label: "Logo URL",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2048)],
        },
      },
      {
        key: "logoAlt",
        label: "Logo alt text",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(120)],
        },
      },
      {
        key: "mark",
        label: "Fallback mark (shown when no logo)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(2)],
        },
      },
      {
        key: "primaryColor",
        label: "Primary color",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "primaryHoverColor",
        label: "Primary color (hover)",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "secondaryColor",
        label: "Secondary color",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [required, minlength(4), maxlength(7)],
        },
      },
      {
        key: "backgroundColor",
        label: "Background color",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
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
  );
