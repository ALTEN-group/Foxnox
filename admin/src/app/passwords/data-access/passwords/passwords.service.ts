import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository } from "@dwtechs/ngx-crud-builder";
import { PASSWORD_COLUMNS } from "app/passwords/data-access/passwords/password.conf";
import {
  Password,
  passwordFactory,
} from "app/passwords/data-access/passwords/password.model";

const passwordsEntity: AdminEntity = "passwords";

/**
 * Service to manage user passwords
 */
@Injectable({
  providedIn: "root",
})
export class PasswordsService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(passwordsEntity),
  );
  private readonly crud = new CrudRepository<Password>().with({
    endpoint: ENTITY_API_PATHS[passwordsEntity],
  });

  // create intentionally omitted: passwords can never be added from the admin UI
  public readonly httpCalls: Calls<Password> = {
    get: this.crud.get,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => PASSWORD_COLUMNS(this.acls())),
  );
  public readonly entityFactory = passwordFactory;
}
