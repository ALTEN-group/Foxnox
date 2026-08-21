
# 0.1.1 (Aug 15th 2026)

  - Upgrade `@dwtechs/antity-pgsql` to 0.23.0 (`get()` pagination uses `limit` instead of `rows`)
  - Upgrade `@dwtechs/healix-express` to 0.2.0 (named `healix()` export + `/health/ready` with DB probe)
  - Upgrade `@dwtechs/winstan-plugin-express-perf` to 0.3.0 (`startTimer` owns finish logging; drop `endTimer`)
  - Align history middleware errors with `statusCode` / `message`
  - Bump mock `ms_user` healix/servpico/winstan stack to match

# 0.1.0 (Aug 12th 2025)

  - Initial release
