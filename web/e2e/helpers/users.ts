export type E2eUser = { id: number; email: string };

/**
 * One account per spec so specs never depend on each other's 2FA / lockout state.
 * Keep in sync with mocks/ms_user/src/data/users.js and scripts/e2e-web.sh.
 */
export const USERS = {
  passwords: { id: 6, email: "e2e-passwords@example.com" },
  twofa: { id: 7, email: "e2e-twofa@example.com" },
  devices: { id: 8, email: "e2e-devices@example.com" },
  recover: { id: 9, email: "e2e-recover@example.com" },
} as const satisfies Record<string, E2eUser>;
