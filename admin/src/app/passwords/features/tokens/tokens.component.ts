import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { TokensService } from "app/passwords/data-access/tokens/tokens.service";

/**
 * Component to display and manage authentication/verification tokens
 */
@Component({
  selector: "adm-tokens",
  templateUrl: "./tokens.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TokensComponent {
  private readonly tokensService = inject(TokensService);

  public readonly config = this.tokensService.config;

  public readonly entityFactory = this.tokensService.entityFactory;

  public readonly httpCalls = this.tokensService.httpCalls;

  public readonly tableInformation = TABLES.tokens;
}
