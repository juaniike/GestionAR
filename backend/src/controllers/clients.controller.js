const clientsServices = require("../services/clients.service");

const createClient = async (req, res, next) => {
  try {
    const body = req.body;
    const client = await clientsServices.createClient(body);
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
};

const getAllClients = async (req, res, next) => {
  try {
    const clients = await clientsServices.getAllClients();
    res.json(clients);
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const client = await clientsServices.getClientById(id);
    if (!client) return next({ error: 404, message: "Client not found" });
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const client = await clientsServices.updateClient(id, body);
    res.json(client);
  } catch (error) {
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    await clientsServices.deleteClient(id);
    res.json({ message: "Client deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
};
