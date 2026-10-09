import {
  CONTROL_TYPES,
  INPUT_TYPES,
  StrictCrudItemOptions,
} from "@dwtechs/ngx-crud-builder";
import { AuditLog } from "app/audit/data-access/audit-logs/audit-log.model";

const DEFAULT_PERIOD_DAYS = 7;

// log.history.tableName values of the audited tables (db/liquibase/foxnox/versions/05-trig).
const AUDITED_TABLES = [
  { label: "Password", value: "pwd" },
  { label: "Password policy", value: "pwd_policy" },
  { label: "Token", value: "token" },
  { label: "Token type", value: "token_type" },
  { label: "Trusted device", value: "user_trusted_device" },
  { label: "Branding", value: "branding" },
  { label: "Preference", value: "preference" },
  { label: "Security question category", value: "security_question_category" },
  { label: "Security question", value: "security_question" },
  { label: "Security answer", value: "user_security_answer" },
];

const ACTIONS = ["INSERT", "UPDATE", "ARCHIVE", "RESTORE", "DELETE"].map(
  (value) => ({ label: value, value }),
);

// Routine = automatic bookkeeping writes (login counters, device usage...), hidden by default.
const KINDS = [
  { label: "Change", value: "change" },
  { label: "Routine (automatic)", value: "routine" },
];

const startOfPeriod = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - DEFAULT_PERIOD_DAYS);
  return d;
};

const readonlyControl = { disabled: true };

export const AUDIT_LOG_COLUMNS: () => StrictCrudItemOptions<AuditLog>[] =
  () => [
    {
      key: "id",
      label: "ID",
      controlType: CONTROL_TYPES.INPUT,
      type: INPUT_TYPES.TEXT,
      columnOptions: { isHardHidden: true },
      controlOptions: { hidden: true, disabled: true },
    },
    {
      key: "tstamp",
      label: "Date",
      controlType: CONTROL_TYPES.DATE,
      columnOptions: {
        defaultWidth: "170px",
        dateFormat: "yyyy-MM-dd HH:mm:ss",
        defaultSortField: true,
        defaultSortOrder: -1,
        defaultFilter: { value: startOfPeriod(), matchMode: "dateAfter" },
      },
      controlOptions: {
        ...readonlyControl,
        dateShowTime: true,
        dateShowSeconds: true,
      },
    },
    {
      key: "userName",
      label: "User",
      controlType: CONTROL_TYPES.INPUT,
      type: INPUT_TYPES.TEXT,
      columnOptions: { defaultWidth: "140px" },
      controlOptions: readonlyControl,
    },
    {
      key: "userId",
      label: "User ID",
      controlType: CONTROL_TYPES.INPUT,
      type: INPUT_TYPES.NUMBER,
      columnOptions: { defaultWidth: "90px", isSoftHidden: true },
      controlOptions: readonlyControl,
    },
    {
      key: "action",
      label: "Action",
      controlType: CONTROL_TYPES.SELECT,
      options: ACTIONS,
      columnOptions: { defaultWidth: "110px" },
      controlOptions: readonlyControl,
    },
    {
      key: "tableName",
      label: "Entity",
      controlType: CONTROL_TYPES.SELECT,
      options: AUDITED_TABLES,
      columnOptions: { defaultWidth: "170px" },
      controlOptions: readonlyControl,
    },
    {
      key: "recordId",
      label: "Record ID",
      controlType: CONTROL_TYPES.INPUT,
      type: INPUT_TYPES.NUMBER,
      columnOptions: { defaultWidth: "100px" },
      controlOptions: readonlyControl,
    },
    {
      key: "kind",
      label: "Kind",
      controlType: CONTROL_TYPES.SELECT,
      options: KINDS,
      columnOptions: {
        defaultWidth: "150px",
        isSoftHidden: true,
        defaultFilter: { value: ["change"], matchMode: "in" },
      },
      controlOptions: readonlyControl,
    },
    {
      key: "changes",
      label: "Changes",
      controlType: CONTROL_TYPES.TEXTAREA,
      columnOptions: {
        defaultWidth: "420px",
        filterable: false,
        sortable: false,
      },
      controlOptions: readonlyControl,
    },
  ];
