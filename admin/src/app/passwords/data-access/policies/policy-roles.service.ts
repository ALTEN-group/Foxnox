import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { readAdminRuntimeConfig } from "@core/app-config/runtime-config";
import { PolicyRole } from "app/passwords/data-access/policies/policy-role.model";
import { catchError, map, Observable, of, shareReplay } from "rxjs";

/**
 * Lists the Gatelin roles a password policy can be attached to.
 */
@Injectable({
  providedIn: "root",
})
export class PolicyRolesService {
  private readonly http = inject(HttpClient);
  private readonly searchUrl =
    readAdminRuntimeConfig().rolesSearchUrl?.trim() ||
    `${inject(APP_CONFIG).gatelinApi}roles/search`;
  private all$: Observable<PolicyRole[]> | null = null;

  public getAndCacheAll(): Observable<PolicyRole[]> {
    this.all$ ??= this.http
      .post<{ rows?: PolicyRole[] }>(this.searchUrl, {})
      .pipe(
        map((res) => (res.rows ?? []).filter((role) => !role.archived)),
        // The roles are optional metadata: a failing lookup must not block the policies page.
        catchError(() => {
          this.all$ = null;
          return of([]);
        }),
        shareReplay(1),
      );
    return this.all$;
  }
}
