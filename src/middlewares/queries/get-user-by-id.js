

export default function getUserByEmail(req, res, next) {
  const { id } = req.body.rows[0];
  const matchMode = "equals";
  req.body.filters = {
    id: { value: id, matchMode }
  };
  next();
}
