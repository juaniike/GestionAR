// controllers/movements.controller.js
const movementsServices = require("../services/movement.service");

const getById = async (req, res, next) => {
  try {
    const movement = await movementsServices.getById(req.params.id);
    if (!movement) {
      return next({ error: 404, message: "Movement not found" });
    }
    res.json(movement);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { cash_register_id, type, category, date } = req.query;
    const filters = { cash_register_id, type, category, date };

    const movements = await movementsServices.getAll(filters);
    res.json(movements);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const movementData = {
      ...req.body,
      user_id: req.user.id, // Del middleware de autenticación
    };

    const movement = await movementsServices.create(movementData);
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedMovement = await movementsServices.update(req.body, {
      where: { id },
    });

    if (!updatedMovement) {
      return next({ error: 404, message: "Movement not found" });
    }

    res.json(updatedMovement);
  } catch (error) {
    next(error);
  }
};

const destroy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await movementsServices.destroy({ where: { id } });

    if (!deleted) {
      return next({ error: 404, message: "Movement not found" });
    }

    res.json({ message: "Movement deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Endpoints adicionales
const getByCashRegister = async (req, res, next) => {
  try {
    const { cash_register_id } = req.params;
    const movements = await movementsServices.getByCashRegister(
      cash_register_id
    );
    res.json(movements);
  } catch (error) {
    next(error);
  }
};

const getToday = async (req, res, next) => {
  try {
    const { cash_register_id } = req.query;
    const movements = await movementsServices.getTodayMovements(
      cash_register_id
    );
    res.json(movements);
  } catch (error) {
    next(error);
  }
};

const getTotals = async (req, res, next) => {
  try {
    const { cash_register_id, date } = req.query;
    const totals = await movementsServices.getTotalsByType(
      cash_register_id,
      date
    );
    res.json(totals);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getById,
  getAll,
  create,
  update,
  destroy,
  getByCashRegister,
  getToday,
  getTotals,
};
