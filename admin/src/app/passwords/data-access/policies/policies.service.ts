import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository } from "@dwtechs/ngx-crud-builder";
import { POLICY_COLUMNS } from "app/passwords/data-access/policies/policy.conf";
import {
  Policy,
  policyFactory,
} from "app/passwords/data-access/policies/policy.model";

const policiesEndpoint: AdminEntity = "policies";

/**
 * Service to manage password policies
 */
@Injectable({
  providedIn: "root",
})
export class PoliciesService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(policiesEndpoint),
  );
  private readonly crud = new CrudRepository<Policy>().with({
    endpoint: policiesEndpoint,
  });

  public readonly httpCalls: Calls<Policy> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => POLICY_COLUMNS(this.acls())),
  );
  public readonly entityFactory = policyFactory;
}
