import { ArchiveInfo } from "@dwtechs/ngx-crud-builder";

/**
 * Represents a trusted device remembered for a user (skips 2FA challenges)
 * Maps to the user_trusted_device entity in src/entities/user-trusted-device.js
 */
export interface TrustedDevice extends ArchiveInfo {
  id: number | null;
  userId: number;
  deviceTokenHash: string;
  deviceName: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

/**
 * Creates a new TrustedDevice entity with default values
 * @returns {TrustedDevice} A new TrustedDevice object with null/default values
 * @example
 * const newTrustedDevice = trustedDeviceFactory();
 */
export const trustedDeviceFactory = (): TrustedDevice => ({
  id: null,
  userId: 0,
  deviceTokenHash: "",
  deviceName: "",
  ipAddress: "",
  userAgent: "",
  expiresAt: null,
  lastUsedAt: null,
  ...new ArchiveInfo(),
});
