function authRole(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 403, message: "Forbidden" });
    }
    next();
  };
}

module.exports = authRole;
