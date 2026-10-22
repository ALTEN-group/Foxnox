import { HttpClient } from "@angular/common/http";
import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
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
  BrandingPreviewLang,
  BrandingPreviewPage,
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

  // The library's own updateFiles posts to a fixed "/pictures" path, so the logo and favicon routes are called directly.
  private readonly uploadImage =
    (route: "logo" | "favicon") => (files: File[], id: number) => {
      const body = new FormData();
      body.append(route, files[0]);
      return this.http.put<Rows<Branding>>(
        `${this.appConfig.foxnoxApi}${ENTITY_API_PATHS[brandingEntity]}/${id}/${route}`,
        body,
      );
    };

  private readonly deleteImage = (route: "logo" | "favicon") => (id: number) =>
    this.http.delete<Rows<Branding>>(
      `${this.appConfig.foxnoxApi}${ENTITY_API_PATHS[brandingEntity]}/${id}/${route}`,
      { body: { rows: [{ id, [`${route}File`]: "" }] } },
    );

  private readonly uploadLogo = this.uploadImage("logo");
  public readonly uploadFavicon = this.uploadImage("favicon");
  public readonly deleteLogo = this.deleteImage("logo");
  public readonly deleteFavicon = this.deleteImage("favicon");

  /** Server-rendered workflow page (HTML) with the given unsaved branding laid over the stored one. */
  public readonly preview = (
    page: BrandingPreviewPage,
    lang: BrandingPreviewLang,
    branding: Partial<Record<keyof Branding, string>>,
  ) =>
    this.http.post<{ html: string }>(
      `${this.appConfig.foxnoxApi}${ENTITY_API_PATHS[brandingEntity]}/preview`,
      { page, lang, branding },
    );

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

  /** Form value of an image control: the stored file as a server-side FileInfo, if any. */
  public logoFiles(file: string): FileInfo[] {
    if (!file) return [];
    return [
      new FileInfo({
        type: "server",
        src: `${this.appConfig.webBase}/assets/branding/${file}`,
      }),
    ];
  }
}
