import { Acls } from '@core/acl/acls.model';
import { withAclConditions } from '@core/utils/field-config/acl-conditions.utils';
import { buildArchivedConfig } from '@core/utils/field-config/archived.config';
import { buildAuditConfig } from '@core/utils/field-config/audit.config';
import { pwdExpiryDateMin } from '@core/utils/pwd-expiry/pwd-expiry.utils';
import { emptyDateCellRenderer } from '@core/utils/renderers/empty-date.renderer';
import { ID_SORTED_CONFIG } from '@core/utils/field-config/id-sorted.config';
import {
  CONTROL_TYPES,
  INPUT_TYPES,
  min,
  required,
  StrictCrudItemOptions,
} from '@dwtechs/ngx-crud-builder';
import { Password } from 'app/passwords/data-access/passwords/password.model';

export const PASSWORD_COLUMNS: (
  acls: Acls | undefined,
  storedExpiry?: (id: number) => Date | string | null | undefined,
) => StrictCrudItemOptions<Password>[] = (acls, storedExpiry) =>
  withAclConditions(
    [
      ID_SORTED_CONFIG,
      {
        key: 'userId',
        label: 'User ID',
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        columnOptions: {
          defaultWidth: '80px',
        },
        controlOptions: {
          validators: [required, min(1)],
        },
      },
      {
        key: 'pwdUpdatedAt',
        label: 'Password updated at',
        controlType: CONTROL_TYPES.DATE,
        controlOptions: {
          disabled: true,
          hidden: true,
        },
      },
      {
        key: 'pwdExpiry',
        label: 'Password expiry',
        controlType: CONTROL_TYPES.DATE,
        columnOptions: {
          customCellRenderer: emptyDateCellRenderer,
        },
        controlOptions: {
          dateMin: pwdExpiryDateMin(),
        },
        conditions: {
          controlOptions: {
            // set expiry can only be postponed: earliest pick is its own day
            dateMin: ({ model }: { model: Password }) =>
              pwdExpiryDateMin(
                undefined,
                model.id == null ? undefined : storedExpiry?.(model.id),
              ),
          },
        },
      },
      {
        key: 'failedAttempts',
        label: 'Failed attempts',
        controlType: CONTROL_TYPES.INPUT,
        type: INPUT_TYPES.NUMBER,
        controlOptions: {
          disabled: true,
          // hidden also removes it from the history, where hidden system writes
          // (logins) would otherwise show up as a change of the edited entry
          hidden: true,
          validators: [min(0)],
        },
      },
      {
        key: 'lockedUntil',
        label: 'Locked until',
        controlType: CONTROL_TYPES.DATE,
        columnOptions: {
          customCellRenderer: emptyDateCellRenderer,
        },
        controlOptions: {
          disabled: true,
          hidden: true,
        },
      },
      {
        key: 'lastLoginAt',
        label: 'Last login at',
        controlType: CONTROL_TYPES.DATE,
        columnOptions: {
          customCellRenderer: emptyDateCellRenderer,
        },
        controlOptions: {
          dateShowTime: true,
          disabled: true,
          hidden: true,
        },
      },
      {
        key: 'twoFactorEnabled',
        label: 'Two-factor enabled',
        controlType: CONTROL_TYPES.CHECKBOX,
        controlOptions: {
          disabled: true,
          hidden: true,
        },
      },
      ...buildArchivedConfig(),
      ...buildAuditConfig(),
    ] as StrictCrudItemOptions<Password>[],
    acls,
  );
