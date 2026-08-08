import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthenticationService } from "@core/auth/auth.service";
import { AppPaths } from "app/app.routes";

// ACL route-id gating is disabled (Gatelin has no routes/permissions registered for
// Foxnox's endpoints yet) — every authenticated user has access to every page.
export function aclGuard(): CanActivateFn {
  return () => {
    const router = inject(Router);
    const authService = inject(AuthenticationService);

    if (!authService.isAuthenticated()) {
      router.navigate([`/${AppPaths.LOGIN}`]);
      return false;
    }

    return true;
  };
}
