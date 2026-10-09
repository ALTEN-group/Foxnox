import {
  computed,
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { AclService } from '@core/acl/acl.service';
import { ENTITY_API_PATHS } from '@core/app-config/app.api-paths';
import { AdminEntity } from '@core/app-config/app.entities';
import { pwdExpiryForUpdate } from '@core/utils/pwd-expiry/pwd-expiry.utils';
import { Calls, CrudRepository } from '@dwtechs/ngx-crud-builder';
import { tap } from 'rxjs';
import { PASSWORD_COLUMNS } from 'app/passwords/data-access/passwords/password.conf';
import {
  Password,
  passwordFactory,
} from 'app/passwords/data-access/passwords/password.model';

const passwordsEntity: AdminEntity = 'passwords';

/**
 * Service to manage user passwords
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordsService {
  private readonly aclsService = inject(AclService);
  private readonly injector = inject(Injector);
  private readonly acls = computed(() =>
    this.aclsService.getEntityAcls(passwordsEntity),
  );
  private readonly crud = new CrudRepository<Password>().with({
    endpoint: ENTITY_API_PATHS[passwordsEntity],
  });

  // create intentionally omitted: passwords can never be added from the admin UI
  // Stored expiry per row, read from the server: once set it can only be postponed
  private readonly storedExpiry = new Map<number, Date | string | null>();

  private remember(rows: Password[] | undefined) {
    for (const r of rows ?? [])
      if (r.id != null) this.storedExpiry.set(r.id, r.pwdExpiry);
  }

  public readonly httpCalls: Calls<Password> = {
    get: (e) => this.crud.get(e).pipe(tap(({ rows }) => this.remember(rows))),
    update: (item) => {
      const { pwdExpiry, ...rest } = item;
      const expiry = pwdExpiryForUpdate(
        pwdExpiry,
        new Date(),
        item.id == null ? undefined : this.storedExpiry.get(item.id),
      );
      // pwdExpiry omitted when unchanged and already expired (see util)
      return this.crud
        .update(
          (expiry === undefined
            ? rest
            : { ...rest, pwdExpiry: expiry }) as Password,
        )
        .pipe(tap(({ rows }) => this.remember(rows)));
    },
    getHistory: this.crud.getHistory,
  };

  public readonly config = computed(() =>
    runInInjectionContext(this.injector, () =>
      PASSWORD_COLUMNS(this.acls(), (id) => this.storedExpiry.get(id)),
    ),
  );
  public readonly entityFactory = passwordFactory;
}
