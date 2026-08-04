// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";

export default new SQLEntity("pwd", [
    {
    key: "id",
    type: "integer",
    min: 0,
    max: 999999999,
    typeCheck: true,
    filter: true,
    methods: ["GET", "POST"],
    operations: ["SELECT"],
    required: true,
    safe: true,
    sanitize: true,
    normalize: false,
    validate: true,
    sanitizer: null,
    normalizer: null,
    validator: null
  },
  {
    key: "userId",
    type: "integer",
    min: 0,
    max: 999999999,
    typeCheck: true,
    filter: true,
    methods: ["GET", "POST"],
    operations: ["SELECT"],
    required: true,
    safe: true,
    sanitize: true,
    normalize: false,
    validate: true,
    sanitizer: null,
    normalizer: null,
    validator: null
  },
  {
    key: "pwdHash",
    type: "password",
    min: null,
    max: null,
    typeCheck: false,
    filter: false,
    methods: ["POST"],
    operations: ["SELECT"],
    required: true,
    safe: false,
    sanitize: true,
    normalize: false,
    validate: true,
    sanitizer: null,
    normalizer: null,
    validator: null
  },
]);
