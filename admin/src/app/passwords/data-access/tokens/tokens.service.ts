import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { AclService } from "@core/acl/acl.service";
import { AdminEntity } from "@core/app-config/app.entities";
import { Calls, CrudRepository } from "@dwtechs/ngx-crud-builder";
import { TOKEN_COLUMNS } from "app/passwords/data-access/tokens/token.conf";
import {
  Token,
  tokenFactory,
} from "app/passwords/data-access/tokens/token.model";

const tokensEndpoint: AdminEntity = "tokens";

/**
 * Service to manage authentication/verification tokens
 */
@Injectable({
  providedIn: "root",
})
export class TokensService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(tokensEndpoint),
  );
  private readonly crud = new CrudRepository<Token>().with({
    endpoint: tokensEndpoint,
  });

  public readonly httpCalls: Calls<Token> = {
    get: this.crud.get,
    create: this.crud.create,
    update: this.crud.update,
    archive: this.crud.archive,
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () => TOKEN_COLUMNS(this.acls())),
  );
  public readonly entityFactory = tokenFactory;
}
