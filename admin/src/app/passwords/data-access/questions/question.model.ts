import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents a security question offered for account recovery
 * Maps to the security_question entity in src/entities/security-question.js
 */
export interface SecurityQuestion extends ArchiveInfo {
  id: number | null;
  question: string;
  categoryId: number;
  active: boolean;
}

/**
 * Creates a new SecurityQuestion entity with default values
 * @returns {SecurityQuestion} A new SecurityQuestion object with null/default values
 * @example
 * const newQuestion = securityQuestionFactory();
 */
export const securityQuestionFactory = (): SecurityQuestion => ({
  id: null,
  question: "",
  categoryId: 1,
  active: true,
  ...new ArchiveInfo(),
});
