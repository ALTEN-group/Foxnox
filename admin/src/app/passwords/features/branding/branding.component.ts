import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { BrandingService } from "app/passwords/data-access/branding/branding.service";

/**
 * Component to display and manage workflow-page/email branding
 */
@Component({
  selector: "adm-branding",
  templateUrl: "./branding.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandingComponent {
  private readonly brandingService = inject(BrandingService);

  public readonly config = this.brandingService.config;

  public readonly entityFactory = this.brandingService.entityFactory;

  public readonly httpCalls = this.brandingService.httpCalls;

  public readonly tableInformation = TABLES.branding;
}
