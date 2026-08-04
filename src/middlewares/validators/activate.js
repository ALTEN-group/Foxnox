import { log } from "@dwtechs/winstan";
import { uEnt } from "../entities/user.js";

export function prepareStatement(req, res, next) {
  const u = res.rows[0];
  req.body.rows = [{
    id: u.id,
    active: true,
  }];
  next();
    // const l = res.locals;
    // const rows = req.body.rows;
    // const dbClient = l.dbClient || null;
    // const cId = l.consumerId;
    // const cName = l.consumerName;
}

export default async function activate(req, res, next) {
  const u = res.rows[0];
  log.debug(`isActive(${!!u.active})`);
  if (!u.active) {
    log.debug(`User ${u.id} first connexion. activating user`);
    try {
      await activate(u);
    } catch (err) {
      log.debug(`Could not activate user ${u.id}`);
      return next(err);
    }
    log.debug(`User ${u.id} has been activated`);
  }
  log.debug(`User ${u.id} is active`);
  next();
}

function activate(u) {
   const rows = [{
    id: u.id,
    active: true,
  }];
  // const query = ["active = $1 WHERE id = $2 AND archived = $3 AND archivedAt IS $4"];
  const query = uEnt.update.query([u.id], req.consumerId, req.consumerName);
  const params = [true, u.id, false, null];
  return uEnt.update.execute(query, params, null);
}
