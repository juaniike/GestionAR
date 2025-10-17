const salesConsolidatedServices = require("../services/salesConsolidated.service");

const getConsolidated = async (req, res, next) => {
  try {
    const data = await salesConsolidatedServices.getConsolidated();
    res.json(data[0]); // Primer registro de la vista
  } catch (error) {
    next(error);
  }
};

module.exports = { getConsolidated };
