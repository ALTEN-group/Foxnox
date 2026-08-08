import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { PoliciesService } from "app/passwords/data-access/policies/policies.service";

/**
 * Component to display and manage password policies
 */
@Component({
  selector: "adm-policies",
  templateUrl: "./policies.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PoliciesComponent {
  private readonly policiesService = inject(PoliciesService);

  public readonly config = this.policiesService.config;

  public readonly entityFactory = this.policiesService.entityFactory;

  public readonly httpCalls = this.policiesService.httpCalls;

  public readonly tableInformation = TABLES.policies;
}
