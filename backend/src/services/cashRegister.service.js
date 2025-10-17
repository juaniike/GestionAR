const CashRegister = require("../models/CashRegister");

const getById = async (id) => {
  return await CashRegister.findByPk(id);
};

const getAll = async () => {
  return await CashRegister.findAll();
};

const open = async (userid, startingcash) => {
  return await CashRegister.create({
    userid: userid,
    startingcash: startingcash,
    starttime: new Date(),
    status: "open",
  });
};

const close = async (id, endingcash) => {
  const [numUpdated] = await CashRegister.update(
    {
      endingcash: endingcash,
      endtime: new Date(),
      status: "closed",
    },
    { where: { id, status: "open" } }
  );
  if (numUpdated === 0) return null;
  return await CashRegister.findByPk(id);
};

const update = async (body, options) => {
  const [numUpdated] = await CashRegister.update(body, options);
  if (numUpdated === 0) return null;
  return await CashRegister.findOne(options);
};

const destroy = async (options) => {
  return await CashRegister.destroy(options);
};

const getOpenByUser = async (userid) => {
  try {
    console.log("🔍 Service getOpenByUser - userid:", userid);

    // Verificar que userid sea válido
    if (!userid || isNaN(userid)) {
      throw new Error(`userid inválido: ${userid}`);
    }

    console.log("🔍 Ejecutando query...");
    const result = await CashRegister.findOne({
      where: {
        userid: parseInt(userid),
        status: "open",
      },
      order: [["starttime", "DESC"]],
    });

    console.log("🔍 Query resultado:", result);
    return result;
  } catch (error) {
    console.error("❌ ERROR en getOpenByUser:");
    console.error("❌ Mensaje:", error.message);
    console.error("❌ Stack:", error.stack);
    throw error;
  }
};

module.exports = {
  getById,
  getAll,
  open,
  close,
  update,
  destroy,
  getOpenByUser,
};
