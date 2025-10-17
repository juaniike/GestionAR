const Clients = require("../models/Clients");

const createClient = async (data) => {
  return await Clients.create(data);
};

const getAllClients = async () => {
  return await Clients.findAll();
};

const getClientById = async (id) => {
  return await Clients.findByPk(id);
};

const updateClient = async (id, data) => {
  const client = await Clients.findByPk(id);
  if (!client) throw new Error("Client not found");
  return await client.update(data);
};

const deleteClient = async (id) => {
  const client = await Clients.findByPk(id);
  if (!client) throw new Error("Client not found");
  return await client.destroy();
};

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
};
