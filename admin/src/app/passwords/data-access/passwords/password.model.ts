import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents a user's password entry
 * Maps to the pwd entity in src/entities/pwd.js
 */
export interface Password extends ArchiveInfo {
  id: number | null;
  userId: number;
  pwdHash: string;
  pwdUpdatedAt: Date | null;
  pwdExpiry: Date | null;
  failedAttempts: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
}

/**
 * Creates a new Password entity with default values
 * @returns {Password} A new Password object with null/default values
 * @example
 * const newPassword = passwordFactory();
 */
export const passwordFactory = (): Password => ({
  id: null,
  userId: 0,
  pwdHash: "",
  pwdUpdatedAt: null,
  pwdExpiry: null,
  failedAttempts: 0,
  lockedUntil: null,
  lastLoginAt: null,
  twoFactorEnabled: false,
  twoFactorSecret: "",
  ...new ArchiveInfo(),
});
