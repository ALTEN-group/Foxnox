// @ts-check
import pEnt from "../../entities/pwd.js";
import { send } from "./send.js";

/**
 * Terminal response handler for `/pwd/` routes.
 * Strips `pwdHash`, `twoFactorSecret`, etc. via the pwd entity's `isPrivate` flags.
 */
export const sendPwd = send(pEnt);
