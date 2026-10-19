import { inject } from "@angular/core";
import { ResolveFn } from "@angular/router";
import { PolicyRole } from "app/passwords/data-access/policies/policy-role.model";
import { PolicyRolesService } from "app/passwords/data-access/policies/policy-roles.service";
import { Observable } from "rxjs";

export const policyRolesResolver: ResolveFn<PolicyRole[]> = (
  _route,
  _state,
): Observable<PolicyRole[]> => inject(PolicyRolesService).getAndCacheAll();
