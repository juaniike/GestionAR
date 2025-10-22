const { where } = require("sequelize");
const cashRegisterServices = require("../services/cashRegister.service");

const getById = async (req, res, next) => {
  try {
    const register = await cashRegisterServices.getById(req.params.id);
    if (!register)
      return next({ error: 404, message: "Cash register not founded" });
    res.json(register);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const registers = await cashRegisterServices.getAll();
    res.json(registers);
  } catch (error) {
    next(error);
  }
};

const open = async (req, res, next) => {
  try {
    const { startingcash } = req.body;
    const register = await cashRegisterServices.open(req.user.id, startingcash);
    res.status(201).json(register);
  } catch (error) {
    next(error);
  }
};

const close = async (req, res, next) => {
  try {
    const { endingcash } = req.body;
    const register = await cashRegisterServices.close(
      req.params.id,
      endingcash
    );
    if (!register)
      return next({
        error: 400,
        message: "The cash register could not be closed",
      });
    res.json(register);
  } catch (error) {
    next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const openCash = await cashRegisterServices.getOpenByUser(req.user.id);
    res.json(openCash || null);
  } catch (error) {
    next({ error: 500, message: "Error al obtener estado de la caja" });
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedRegister = await cashRegisterServices.update(req.body, {
      where: { id: req.params.id },
    });
    if (!updatedRegister)
      return next({ error: 404, message: "Cash register not found" });
    res.json(updatedRegister);
  } catch (error) {
    next(error);
  }
};

const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await cashRegisterServices.destroy({ where: { id } });
    if (!deleted)
      return next({ error: 404, message: "Cash register not found" });
    res.json({ message: "Cash register deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getById,
  getAll,
  open,
  close,
  getStatus,
  update,
  destroy,
};
