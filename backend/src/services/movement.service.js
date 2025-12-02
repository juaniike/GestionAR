// services/movements.service.js
const Movement = require("../models/Movement");
const CashRegister = require("../models/CashRegister");
const { Op } = require("sequelize");

const getById = async (id) => {
  return await Movement.findByPk(id, {
    include: [
      {
        model: require("../models/Users"),
        attributes: ["id", "username"],
      },
      {
        model: require("../models/CashRegister"),
        attributes: ["id", "startingcash"],
      },
    ],
  });
};

const getAll = async (filters = {}) => {
  const whereClause = {};

  if (filters.cash_register_id) {
    whereClause.cash_register_id = filters.cash_register_id;
  }

  if (filters.type) {
    whereClause.type = filters.type;
  }

  if (filters.category) {
    whereClause.category = filters.category;
  }

  if (filters.date) {
    whereClause.date = {
      [Op.between]: [
        new Date(filters.date + "T00:00:00"),
        new Date(filters.date + "T23:59:59"),
      ],
    };
  }

  return await Movement.findAll({
    where: whereClause,
    include: [
      {
        model: require("../models/Users"),
        attributes: ["id", "username"],
      },
      {
        model: require("../models/CashRegister"),
        attributes: ["id", "startingcash"],
      },
    ],
    order: [["date", "DESC"]],
  });
};

const create = async (movementData) => {
  // Validar que la caja esté abierta
  const cashRegister = await CashRegister.findByPk(
    movementData.cash_register_id
  );
  if (!cashRegister || cashRegister.status !== "open") {
    throw new Error("No se puede registrar movimiento en caja cerrada");
  }

  return await Movement.create(movementData);
};

const update = async (body, options) => {
  const [numUpdated] = await Movement.update(body, options);
  if (numUpdated === 0) return null;
  return await Movement.findOne(options);
};

const destroy = async (options) => {
  return await Movement.destroy(options);
};

// Obtener movimientos por caja registradora
const getByCashRegister = async (cash_register_id) => {
  return await getAll({ cash_register_id });
};

// Obtener movimientos del día actual
const getTodayMovements = async (cash_register_id = null) => {
  const today = new Date().toISOString().split("T")[0];
  const filters = { date: today };

  if (cash_register_id) {
    filters.cash_register_id = cash_register_id;
  }

  return await getAll(filters);
};

// Obtener totales por tipo
const getTotalsByType = async (cash_register_id, date = null) => {
  const whereClause = { cash_register_id };

  if (date) {
    whereClause.date = {
      [Op.between]: [
        new Date(date + "T00:00:00"),
        new Date(date + "T23:59:59"),
      ],
    };
  }

  const movements = await Movement.findAll({
    where: whereClause,
    attributes: [
      "type",
      [Movement.sequelize.fn("SUM", Movement.sequelize.col("amount")), "total"],
    ],
    group: ["type"],
  });

  const totals = {
    ingresos: 0,
    egresos: 0,
  };

  movements.forEach((mov) => {
    if (mov.dataValues.type === "ingreso") {
      totals.ingresos = parseFloat(mov.dataValues.total) || 0;
    } else {
      totals.egresos = parseFloat(mov.dataValues.total) || 0;
    }
  });

  return totals;
};

module.exports = {
  getById,
  getAll,
  create,
  update,
  destroy,
  getByCashRegister,
  getTodayMovements,
  getTotalsByType,
};
