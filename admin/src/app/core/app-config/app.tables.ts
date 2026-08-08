import { ExcelExportMode, FilterLevel } from "@dwtechs/ngx-crud-builder";
import { AdminEntity } from "./app.entities";

type TableInfo = {
  label: string;
  title: string;
  entityId: AdminEntity;
  editionDialogSize: "xs" | "s" | "m" | "l";
  filterLevel: FilterLevel;
  isPreferencesModeEnabled: boolean;
  shouldSyncIdWithUrl: boolean;
  shouldSyncPageWithUrl: boolean;
  isExcelExportEnabled: boolean;
  excelExportMode: ExcelExportMode;
  additionalReadonlyProperties: Record<string, boolean>;
};

export const TABLES: Record<AdminEntity, TableInfo> = {
  passwords: {
    label: $localize`:@@TableLabels_Password:Password`,
    title: $localize`:@@TableLabels_Passwords:Passwords`,
    entityId: "passwords",
    editionDialogSize: "m",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
  policies: {
    label: $localize`:@@TableLabels_Policy:Policy`,
    title: $localize`:@@TableLabels_Policies:Password policies`,
    entityId: "policies",
    editionDialogSize: "m",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
  tokens: {
    label: $localize`:@@TableLabels_Token:Token`,
    title: $localize`:@@TableLabels_Tokens:Tokens`,
    entityId: "tokens",
    editionDialogSize: "s",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
  trustedDevices: {
    label: $localize`:@@TableLabels_TrustedDevice:Trusted device`,
    title: $localize`:@@TableLabels_TrustedDevices:Trusted devices`,
    entityId: "trustedDevices",
    editionDialogSize: "s",
    filterLevel: "advanced",
    isPreferencesModeEnabled: true,
    shouldSyncIdWithUrl: true,
    shouldSyncPageWithUrl: true,
    isExcelExportEnabled: true,
    excelExportMode: "local",
    additionalReadonlyProperties: {},
  },
} as const;
