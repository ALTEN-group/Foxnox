/**
 * A Gatelin role, as listed by the roles search route (ADMIN_ROLES_SEARCH_URL).
 * Roles live in Gatelin: Foxnox only stores their ids on a policy (`roleIds`).
 */
export interface PolicyRole {
  id: number;
  name: string;
  color?: string | null;
  archived?: boolean;
}
