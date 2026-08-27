import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { TrustedDevicesService } from "app/passwords/data-access/trusted-devices/trusted-devices.service";

/**
 * Component to display and manage trusted devices
 */
@Component({
  selector: "adm-trusted-devices",
  templateUrl: "./trusted-devices.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrustedDevicesComponent {
  private readonly trustedDevicesService = inject(TrustedDevicesService);

  public readonly config = this.trustedDevicesService.config;

  public readonly entityFactory = this.trustedDevicesService.entityFactory;

  public readonly httpCalls = this.trustedDevicesService.httpCalls;

  public readonly tableInformation = TABLES.trustedDevices;
}
