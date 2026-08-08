import { Routes } from "@angular/router";
import { aclGuard } from "@core/acl/acl.guard";
import { ADMIN_ENTITIES, AdminEntity } from "@core/app-config/app.entities";
import { loginGuard } from "@core/auth/login.guard";
import { NotFoundComponent } from "@core/pages/not-found/not-found.component";

type EntityPaths = { readonly [K in AdminEntity as Uppercase<K>]: K };

const ENTITY_PATHS = Object.fromEntries(
  ADMIN_ENTITIES.map((e) => [e.toUpperCase(), e]),
) as EntityPaths;

/**
 * Application Paths
 */
export const AppPaths = {
  LOGIN: "login",
  NOT_FOUND: "not-found",
  UNAUTHORIZED: "unauthorized",
  ...ENTITY_PATHS,
} as const;

export const ROUTES: Routes = [
  {
    path: AppPaths.LOGIN,
    loadChildren: () =>
      import("./login/login.routes").then((m) => m.AUTH_ROUTES),
    title: "Connexion",
    canActivate: [loginGuard()],
  },
  {
    path: AppPaths.PASSWORDS,
    loadComponent: () =>
      import("./passwords/features/passwords/passwords.component").then(
        (m) => m.PasswordsComponent,
      ),
    title: "Passwords",
    canActivate: [aclGuard()],
    data: {
      breadcrumb: $localize`:@@Admin_PasswordsNav:Passwords`,
      functionality: AppPaths.PASSWORDS,
    },
  },
  {
    path: AppPaths.POLICIES,
    loadComponent: () =>
      import("./passwords/features/policies/policies.component").then(
        (m) => m.PoliciesComponent,
      ),
    title: "Policies",
    canActivate: [aclGuard()],
    data: {
      breadcrumb: $localize`:@@Admin_PoliciesNav:Policies`,
      functionality: AppPaths.POLICIES,
    },
  },
  {
    path: AppPaths.TOKENS,
    loadComponent: () =>
      import("./passwords/features/tokens/tokens.component").then(
        (m) => m.TokensComponent,
      ),
    title: "Tokens",
    canActivate: [aclGuard()],
    data: {
      breadcrumb: $localize`:@@Admin_TokensNav:Tokens`,
      functionality: AppPaths.TOKENS,
    },
  },
  {
    path: AppPaths.TRUSTEDDEVICES,
    loadComponent: () =>
      import(
        "./passwords/features/trusted-devices/trusted-devices.component"
      ).then((m) => m.TrustedDevicesComponent),
    title: "Trusted devices",
    canActivate: [aclGuard()],
    data: {
      breadcrumb: $localize`:@@Admin_TrustedDevicesNav:Trusted devices`,
      functionality: AppPaths.TRUSTEDDEVICES,
    },
  },
  {
    path: AppPaths.UNAUTHORIZED,
    loadComponent: () =>
      import("./core/pages/unauthorized/unauthorized.component").then(
        (m) => m.UnauthorizedComponent,
      ),
    title: "Unauthorized",
    data: {
      breadcrumb: $localize`:@@Unauthorized_unauthorizedNav:Unauthorized`,
    },
  },
  {
    path: AppPaths.NOT_FOUND,
    component: NotFoundComponent,
    title: "Non trouvé",
    data: {
      breadcrumb: $localize`:@@NotFound_notFoundNav:Non trouvé`,
    },
  },
  {
    path: "",
    redirectTo: `/${AppPaths.PASSWORDS}`,
    pathMatch: "full",
  },
  {
    path: "**",
    redirectTo: `/${AppPaths.NOT_FOUND}`,
    pathMatch: "full",
  },
];
