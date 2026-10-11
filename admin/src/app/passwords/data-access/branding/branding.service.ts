import { HttpClient } from "@angular/common/http";
import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { AdminEntity } from "@core/app-config/app.entities";
import {
  Calls,
  CrudRepository,
  FileInfo,
  Rows,
} from "@dwtechs/ngx-crud-builder";
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
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  // The library's own updateFiles posts to a fixed "/pictures" path, so the logo route is called directly.
  private readonly uploadLogo = (files: File[], id: number) => {
    const body = new FormData();
    body.append("logo", files[0]);
    return this.http.put<Rows<Branding>>(
      `${this.appConfig.foxnoxApi}${ENTITY_API_PATHS[brandingEntity]}/${id}/logo`,
      body,
    );
  };

  public readonly httpCalls: Calls<Branding> = {
    get: this.crud.get,
    getAll: this.crud.getAll,
    create: this.crud.create,
    update: this.crud.update,
    updateFiles: this.uploadLogo,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => BRANDING_COLUMNS(this.acls())),
  );
  public readonly entityFactory = brandingFactory;

  /** Form value of the logo control: the stored file as a server-side FileInfo, if any. */
  public logoFiles(logoFile: string): FileInfo[] {
    if (!logoFile) return [];
    return [
      new FileInfo({
        type: "server",
        src: `${this.appConfig.webBase}/assets/branding/${logoFile}`,
      }),
    ];
  }
}
