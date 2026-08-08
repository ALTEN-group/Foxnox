import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents a password policy
 * Maps to the pwd_policy entity in src/entities/pwd-policy.js
 */
export interface Policy extends ArchiveInfo {
  id: number | null;
  name: string;
  description: string;
  length: number;
  number: boolean;
  symbol: boolean;
  lowerCase: boolean;
  upperCase: boolean;
  strict: boolean;
  symbols: string;
  expiryDays: number;
  active: boolean;
}

/**
 * Creates a new Policy entity with default values
 * @returns {Policy} A new Policy object with null/default values
 * @example
 * const newPolicy = policyFactory();
 */
export const policyFactory = (): Policy => ({
  id: null,
  name: "",
  description: "",
  length: 8,
  number: false,
  symbol: false,
  lowerCase: false,
  upperCase: false,
  strict: false,
  symbols: "",
  expiryDays: 0,
  active: true,
  ...new ArchiveInfo(),
});
