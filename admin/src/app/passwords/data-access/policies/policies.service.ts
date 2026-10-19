import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { ActivatedRouteSnapshot } from "@angular/router";
import { AclService } from "@core/acl/acl.service";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository } from "@dwtechs/ngx-crud-builder";
import { PolicyRole } from "app/passwords/data-access/policies/policy-role.model";
import { POLICY_COLUMNS } from "app/passwords/data-access/policies/policy.conf";
import {
  Policy,
  policyFactory,
} from "app/passwords/data-access/policies/policy.model";

const policiesEntity: AdminEntity = "policies";

/**
 * Service to manage password policies
 */
@Injectable({
  providedIn: "root",
})
export class PoliciesService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(policiesEntity),
  );
  private readonly crud = new CrudRepository<Policy>().with({
    endpoint: ENTITY_API_PATHS[policiesEntity],
  });

  public readonly httpCalls: Calls<Policy> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = (payload: ActivatedRouteSnapshot) =>
    computed(() =>
      runInInjectionContext(this.injector, () =>
        POLICY_COLUMNS(
          this.acls(),
          (payload.data["roles"] as PolicyRole[] | undefined) ?? [],
          this.sanitizer,
        ),
      ),
    );
  public readonly entityFactory = policyFactory;
}
