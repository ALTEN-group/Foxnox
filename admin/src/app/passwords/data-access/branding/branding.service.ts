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
import { BRANDING_COLUMNS } from "app/passwords/data-access/branding/branding.conf";
import {
  Branding,
  brandingFactory,
} from "app/passwords/data-access/branding/branding.model";

const brandingEntity: AdminEntity = "branding";

/**
 * Service to manage workflow-page/email branding
 */
@Injectable({
  providedIn: "root",
})
export class BrandingService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(brandingEntity),
  );
  private readonly crud = new CrudRepository<Branding>().with({
    endpoint: ENTITY_API_PATHS[brandingEntity],
  });

  public readonly httpCalls: Calls<Branding> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => BRANDING_COLUMNS(this.acls())),
  );
  public readonly entityFactory = brandingFactory;
}
