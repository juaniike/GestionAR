const CashRegister = require("../../models/CashRegister");

//Valido que no haya otra caja abierta
const preventOpen = async (req, res, next) => {
  try {
    const openCash = await CashRegister.findOne({
      where: { userid: req.user.id, status: "open" },
    });
    if (openCash)
      return next({
        error: 400,
        message:
          "You already have one box open. Close it before opening another.",
      });
    next();
  } catch (error) {
    next(error);
  }
};

//Valido que solo el dueño pueda acceder a determinadas rutas
const onlyOwner = async (req, res, next) => {
  if (req.user.role !== "owner") {
    return next({ error: 403, message: "Access denied. Only owner" });
  }
  next();
};

//Valido que solo el dueño o empleado que cerró la caja pueda verla
const ownerOrCloser = async (req, res, next) => {
  try {
    const cash = await CashRegister.findByPk(req.params.id);
    if (!cash)
      return next({ error: 404, message: "Cash register not founded" });

    if (req.user.role === "owner" || cash.userid === req.user.id) {
      req.cash = cash;
      return next();
    }
    return next({
      error: 403,
      message:
        "Access denied. Only the owner or the person who closed the box.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  preventOpen,
  onlyOwner,
  ownerOrCloser,
};
