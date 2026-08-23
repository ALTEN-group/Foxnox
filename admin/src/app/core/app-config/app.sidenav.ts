import { AppPaths } from "app/app.routes";
import { MenuItem } from "@openng/optimus-ui/api";

export const SIDENAV: MenuItem[] = [
  {
    id: "passwords",
    label: $localize`:@@Admin_PasswordsNav:Passwords`,
    routerLink: `/${AppPaths.PASSWORDS}`,
    icon: "pi pi-lock",
    data: {
      functionality: "passwords",
    },
  },
  {
    id: "policies",
    label: $localize`:@@Admin_PoliciesNav:Policies`,
    routerLink: `/${AppPaths.POLICIES}`,
    icon: "pi pi-shield",
    data: {
      functionality: "policies",
    },
  },
  {
    id: "tokens",
    label: $localize`:@@Admin_TokensNav:Tokens`,
    routerLink: `/${AppPaths.TOKENS}`,
    icon: "pi pi-key",
    data: {
      functionality: "tokens",
    },
  },
  {
    id: "trustedDevices",
    label: $localize`:@@Admin_TrustedDevicesNav:Trusted devices`,
    routerLink: `/${AppPaths.TRUSTEDDEVICES}`,
    icon: "pi pi-mobile",
    data: {
      functionality: "trustedDevices",
    },
  },
];
