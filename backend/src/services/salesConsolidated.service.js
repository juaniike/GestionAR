const SalesConsolidated = require("../models/views/SalesConsolidated");

const getConsolidated = async () => {
  // Devuelve todos los registros de la vista
  return await SalesConsolidated.findAll();
};

module.exports = { getConsolidated };
