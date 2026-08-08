import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { PasswordsService } from "app/passwords/data-access/passwords/passwords.service";

/**
 * Component to display and manage user passwords
 */
@Component({
  selector: "adm-passwords",
  templateUrl: "./passwords.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordsComponent {
  private readonly passwordsService = inject(PasswordsService);

  public readonly config = this.passwordsService.config;

  public readonly entityFactory = this.passwordsService.entityFactory;

  public readonly httpCalls = this.passwordsService.httpCalls;

  public readonly tableInformation = TABLES.passwords;
}
