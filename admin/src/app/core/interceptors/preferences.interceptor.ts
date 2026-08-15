import { HttpInterceptorFn, HttpResponse } from "@angular/common/http";
import { isArray } from "@dwtechs/checkard";
import { Rows, TableConfig } from "@dwtechs/ngx-crud-builder";
import { map } from "rxjs";

/**
 * CRUD apiPrefix is `/api/` (Foxnox entity paths). Table preferences still live
 * on Gatelin at `/api/gateway/preferences/…`, so rewrite those requests here.
 */
export const preferencesInterceptor: HttpInterceptorFn = (req, next) => {
  if (/\/preferences\//.test(req.url) && !/\/gateway\/preferences\//.test(req.url)) {
    req = req.clone({
      url: req.url.replace(/\/preferences\//, "/gateway/preferences/"),
    });
  }

  const isPreferenceRequest =
    req.method === "GET" && /\/preferences\//.test(req.url);

  return next(req).pipe(
    map((event) => {
      if (!isPreferenceRequest || !(event instanceof HttpResponse)) {
        return event;
      }

      const body: Rows<TableConfig> = event.body as Rows<TableConfig>;
      const rows = body?.rows;
      if (!isArray(rows)) {
        return event;
      }

      if (rows.some((row) => row.isActive === true)) {
        return event;
      }

      const defaultPreference = rows.find((row) => row.name === "Default");
      if (defaultPreference) {
        defaultPreference.isActive = true;
      }

      return event.clone({ body: { rows } });
    }),
  );
};
