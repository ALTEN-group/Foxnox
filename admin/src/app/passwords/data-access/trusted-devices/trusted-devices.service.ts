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
import { TRUSTED_DEVICE_COLUMNS } from "app/passwords/data-access/trusted-devices/trusted-device.conf";
import {
  TrustedDevice,
  trustedDeviceFactory,
} from "app/passwords/data-access/trusted-devices/trusted-device.model";

const trustedDevicesEntity: AdminEntity = "trustedDevices";

/**
 * Service to manage trusted devices
 */
@Injectable({
  providedIn: "root",
})
export class TrustedDevicesService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(trustedDevicesEntity),
  );
  private readonly crud = new CrudRepository<TrustedDevice>().with({
    endpoint: ENTITY_API_PATHS[trustedDevicesEntity],
  });

  // create intentionally omitted: deviceTokenHash is INSERT-only server-side, never settable from the admin UI
  public readonly httpCalls: Calls<TrustedDevice> = {
    get: this.crud.get,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () =>
      TRUSTED_DEVICE_COLUMNS(this.acls()),
    ),
  );
  public readonly entityFactory = trustedDeviceFactory;
}
