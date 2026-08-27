import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ENTITY_API_PATHS } from "@core/app-config/app.api-paths";
import { APP_CONFIG } from "@core/app-config/app-config.token";
import { AdminEntity } from "@core/app-config/app.entities";
import { map, Observable } from "rxjs";

export interface SchemaRow {
  key: string;
  operations: ("INSERT" | "UPDATE" | "SELECT")[];
}

@Injectable({ providedIn: "root" })
export class SchemaService {
  private readonly http = inject(HttpClient);
  private readonly appConfig = inject(APP_CONFIG);

  public get(entityId: AdminEntity): Observable<SchemaRow[]> {
    const entityPath = ENTITY_API_PATHS[entityId];
    const endpoint = `${this.appConfig.foxnoxApi}${entityPath}/schema`;
    return this.http
      .get<{ rows?: SchemaRow[] }>(endpoint)
      .pipe(map((res) => res.rows ?? []));
  }
}
