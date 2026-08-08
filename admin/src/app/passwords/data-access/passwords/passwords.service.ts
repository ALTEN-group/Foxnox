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
import { PASSWORD_COLUMNS } from "app/passwords/data-access/passwords/password.conf";
import {
  Password,
  passwordFactory,
} from "app/passwords/data-access/passwords/password.model";

const passwordsEndpoint: AdminEntity = "passwords";

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
    this.aclsService.getEntityAcls(passwordsEndpoint),
  );
  private readonly crud = new CrudRepository<Password>().with({
    endpoint: passwordsEndpoint,
  });

  public readonly httpCalls: Calls<Password> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => PASSWORD_COLUMNS(this.acls())),
  );
  public readonly entityFactory = passwordFactory;
}

