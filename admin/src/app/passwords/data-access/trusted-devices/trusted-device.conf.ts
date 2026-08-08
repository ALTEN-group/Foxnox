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
  required,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { TrustedDevice } from "app/passwords/data-access/trusted-devices/trusted-device.model";

export const TRUSTED_DEVICE_COLUMNS: (
  acls: Acls | undefined,
) => StrictCrudItemOptions<TrustedDevice>[] = (acls) =>
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
        key: "deviceTokenHash",
        label: "Device token hash",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        columnOptions: {
          isHardHidden: true,
        },
        controlOptions: {
          validators: [required],
        },
      },
      {
        key: "deviceName",
        label: "Device name",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(100)],
        },
      },
      {
        key: "ipAddress",
        label: "IP address",
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.TEXT,
        controlOptions: {
          validators: [maxlength(45)],
        },
      },
      {
        key: "userAgent",
        label: "User agent",
        controlType: CONTROL_TYPES.TEXTAREA,
        columnOptions: {
          isSoftHidden: true,
        },
        controlOptions: {},
      },
      {
        key: "expiresAt",
        label: "Expires at",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {
          validators: [required],
          dateShowTime: true,
        },
      },
      {
        key: "lastUsedAt",
        label: "Last used at",
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {
          dateShowTime: true,
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<TrustedDevice>[],
    acls,
  );
