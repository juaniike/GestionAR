const Users = require("../models/Users");

const get = async (id) => {
  return await Users.findByPk(id);
};

const getAll = async () => {
  return await Users.findAll();
};

const getByUsername = async (username) => {
  return await Users.findOne({ where: { username } });
};

const getByRole = async (role) => {
  return await Users.findOne({ where: { role } });
};

const create = async (body) => {
  return await Users.create(body);
};

const update = async (body, options) => {
  const [numUpdated] = await Users.update(body, options);
  if (numUpdated === 0) return null;
  return await Users.findOne(options);
};

const destroy = async (options) => {
  return await Users.destroy(options);
};

module.exports = {
  get,
  getAll,
  getByUsername,
  getByRole,
  create,
  update,
  destroy,
};
