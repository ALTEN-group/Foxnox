import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents an authentication/verification token
 * Maps to the token entity in src/entities/token.js
 */
export interface Token extends ArchiveInfo {
  id: number | null;
  hash: string;
  typeId: number | null;
  userId: number;
  attempts: number;
  expiresAt: Date | null;
  verifiedAt: Date | null;
}

/**
 * Creates a new Token entity with default values
 * @returns {Token} A new Token object with null/default values
 * @example
 * const newToken = tokenFactory();
 */
export const tokenFactory = (): Token => ({
  id: null,
  hash: "",
  typeId: null,
  userId: 0,
  attempts: 0,
  expiresAt: null,
  verifiedAt: null,
  ...new ArchiveInfo(),
});
