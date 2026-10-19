import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
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
  private readonly route = inject(ActivatedRoute);

  public readonly config = this.policiesService.config(this.route.snapshot);

  public readonly entityFactory = this.policiesService.entityFactory;

  public readonly httpCalls = this.policiesService.httpCalls;

  public readonly tableInformation = TABLES.policies;
}
