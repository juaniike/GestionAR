function authRole(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next({ error: 403, message: "Forbidden" });
    }
    next();
  };
}

module.exports = authRole;
