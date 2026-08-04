
export default function activateUser(req, res, next) {
  const u = res.rows[0];
  req.body.rows = [{
    id: u.id,
    active: true,
  }];
  next();
}