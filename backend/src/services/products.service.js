const Products = require("../models/Products");

const getById = async (id) => {
  return await Products.findByPk(id);
};

const getByBarcode = async (barcode) => {
  return await Products.findOne({ where: { barcode } });
};

const getAll = async () => {
  return await Products.findAll();
};

const create = async (body) => {
  return await Products.create(body);
};

const update = async (id, body) => {
  const [numUpdated] = await Products.update(body, { where: { id } });
  if (numUpdated === 0) return null;
  return await Products.findByPk(id);
};

const destroy = async (id) => {
  return await Products.destroy({ where: { id } });
};

module.exports = {
  getById,
  getByBarcode,
  getAll,
  create,
  update,
  destroy,
};
