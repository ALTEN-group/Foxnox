// @ts-check
import { SQLEntity } from "@dwtechs/antity-pgsql";

/**
 * Read-only entity over the enrolled_security_answer view
 * (db/liquibase/foxnox/versions/04-view/03-security-answer.sql).
 * `answerHash` is private: the service selects it to verify answers while
 * `send` strips it from any response.
 */
export default new SQLEntity("enrolled_security_answer", [
  {
    key: "id",
    type: "integer",
    isTypeChecked: true,
    isFilterable: true,
    requiredFor: [],
    operations: ["SELECT"],
    isPrivate: false,
    readOnly: true,
  },
  {
    key: "userId",
    type: "integer",
    min: 1,
    isTypeChecked: true,
    isFilterable: true,
    requiredFor: [],
    operations: ["SELECT"],
    isPrivate: false,
    readOnly: true,
  },
  {
    key: "questionId",
    type: "integer",
    min: 1,
    isTypeChecked: true,
    isFilterable: true,
    requiredFor: [],
    operations: ["SELECT"],
    isPrivate: false,
    readOnly: true,
  },
  {
    key: "answerHash",
    type: "string",
    min: 0,
    max: 255,
    isTypeChecked: false,
    isFilterable: false,
    requiredFor: [],
    operations: ["SELECT"],
    isPrivate: true,
    readOnly: true,
  },
  {
    key: "question",
    type: "string",
    min: 1,
    max: 255,
    isTypeChecked: true,
    isFilterable: false,
    requiredFor: [],
    operations: ["SELECT"],
    isPrivate: false,
    readOnly: true,
  },
  {
    key: "trans",
    type: "json",
    isTypeChecked: true,
    isFilterable: false,
    requiredFor: [],
    operations: ["SELECT"],
    isPrivate: false,
    readOnly: true,
  },
]);
