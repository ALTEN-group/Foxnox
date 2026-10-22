import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { TABLES } from "@core/app-config/app.tables";
import { TableComponent } from "@dwtechs/ngx-crud-builder";
import { SecurityQuestionsService } from "app/passwords/data-access/questions/questions.service";

/**
 * Component to display and manage security questions
 */
@Component({
  selector: "adm-questions",
  templateUrl: "./questions.component.html",
  imports: [TableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityQuestionsComponent {
  private readonly securityQuestionsService = inject(SecurityQuestionsService);

  public readonly config = this.securityQuestionsService.config;

  public readonly entityFactory = this.securityQuestionsService.entityFactory;

  public readonly httpCalls = this.securityQuestionsService.httpCalls;

  public readonly tableInformation = TABLES.securityQuestions;
}
