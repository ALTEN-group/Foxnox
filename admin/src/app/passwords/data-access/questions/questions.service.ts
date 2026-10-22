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
import { SECURITY_QUESTION_COLUMNS } from "app/passwords/data-access/questions/question.conf";
import {
  SecurityQuestion,
  securityQuestionFactory,
} from "app/passwords/data-access/questions/question.model";

const securityQuestionsEntity: AdminEntity = "securityQuestions";

/**
 * Service to manage security questions
 */
@Injectable({
  providedIn: "root",
})
export class SecurityQuestionsService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(securityQuestionsEntity),
  );
  private readonly crud = new CrudRepository<SecurityQuestion>().with({
    endpoint: ENTITY_API_PATHS[securityQuestionsEntity],
  });

  public readonly httpCalls: Calls<SecurityQuestion> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () =>
      SECURITY_QUESTION_COLUMNS(this.acls()),
    ),
  );
  public readonly entityFactory = securityQuestionFactory;
}
