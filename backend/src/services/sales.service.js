const { Op, fn, col, literal } = require("sequelize");
const sequelize = require("../config/database"); // ✅ Necesario para transacciones
const Sales = require("../models/Sales");
const SalesItem = require("../models/SalesItem");
const Products = require("../models/Products");
const cashRegisterServices = require("./cashRegister.service");

const createSale = async (userid, items, paymentmethod = "cash") => {
  const transaction = await sequelize.transaction(); // ✅ Transacción explícita

  try {
    console.log(
      `🛒 Iniciando venta para usuario: ${userid}, items: ${items.length}`
    );

    // Verificar caja abierta
    const cashRegister = await cashRegisterServices.getOpenByUser(userid);
    if (!cashRegister) {
      throw new Error("There is no open box for this user");
    }
    const cashid = cashRegister.id;

    // Validar items
    if (!items || items.length === 0) {
      throw new Error("Sale must have at least one item");
    }

    let total = 0;
    let profit = 0;
    const salesItemsData = [];

    // Calcular total, ganancia y preparar items
    for (const item of items) {
      if (!item.productid || !item.quantity || !item.unitprice) {
        throw new Error(
          "Each item must have productid, quantity and unitprice"
        );
      }

      const product = await Products.findByPk(item.productid, { transaction });
      if (!product) {
        throw new Error(`Product ${item.productid} not found`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        );
      }

      const totalprice = item.quantity * item.unitprice;
      const itemProfit = (item.unitprice - product.cost) * item.quantity;

      total += totalprice;
      profit += itemProfit;

      salesItemsData.push({
        productid: item.productid,
        quantity: item.quantity,
        unitprice: item.unitprice,
        totalprice,
        product, // Guardamos la referencia para actualizar stock
      });
    }

    // Crear la venta
    const sale = await Sales.create(
      {
        userid,
        cashid,
        total,
        profit,
        paymentmethod,
        status: "paid",
        date: new Date(),
      },
      { transaction }
    );

    console.log(`✅ Venta creada ID: ${sale.id}, Total: $${total}`);

    // Crear items y actualizar stock
    for (const itemData of salesItemsData) {
      await SalesItem.create(
        {
          saleid: sale.id,
          productid: itemData.productid,
          quantity: itemData.quantity,
          unitprice: itemData.unitprice,
          totalprice: itemData.totalprice,
        },
        { transaction }
      );

      // Actualizar stock
      itemData.product.stock -= itemData.quantity;
      await itemData.product.save({ transaction });

      console.log(
        `📦 Producto ${itemData.productid} - Stock actualizado: ${itemData.product.stock}`
      );
    }

    // Commit de la transacción
    await transaction.commit();
    console.log(`✅ Venta ${sale.id} completada exitosamente`);

    // Obtener venta completa con items para retornar
    const completeSale = await Sales.findByPk(sale.id, {
      include: [{ model: SalesItem, include: [Products] }],
    });

    return completeSale;
  } catch (error) {
    // Rollback en caso de error
    await transaction.rollback();
    console.error(`❌ Error en createSale: ${error.message}`);
    throw error; // Relanzar el error para que el controlador lo maneje
  }
};

const getAllSales = async (filters = {}) => {
  const whereClause = {};

  // Filtros opcionales
  if (filters.userid) whereClause.userid = filters.userid;
  if (filters.status) whereClause.status = filters.status;
  if (filters.paymentmethod) whereClause.paymentmethod = filters.paymentmethod;
  if (filters.startDate && filters.endDate) {
    whereClause.date = {
      [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
    };
  }

  return await Sales.findAll({
    where: whereClause,
    include: [{ model: SalesItem, include: [Products] }],
    order: [["date", "DESC"]],
  });
};

const getSaleById = async (id) => {
  if (!id || isNaN(id)) {
    throw new Error("Invalid sale ID");
  }

  const sale = await Sales.findByPk(id, {
    include: [{ model: SalesItem, include: [Products] }],
  });

  if (!sale) {
    throw new Error(`Sale with ID ${id} not found`);
  }

  return sale;
};

const getByUser = async (userid, limit = null) => {
  if (!userid || isNaN(userid)) {
    throw new Error("Invalid user ID");
  }

  const options = {
    where: { userid },
    include: [{ model: SalesItem, include: [Products] }],
    order: [["date", "DESC"]],
  };

  if (limit) {
    options.limit = parseInt(limit);
  }

  return await Sales.findAll(options);
};

const getDailyReport = async (startDate, endDate) => {
  const whereClause = {};

  if (startDate && endDate) {
    whereClause.date = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  return await Sales.findAll({
    where: whereClause,
    attributes: [
      [fn("DATE", col("date")), "day"],
      [fn("SUM", col("total")), "totalsales"],
      [fn("SUM", col("profit")), "totalprofit"],
      [fn("COUNT", col("id")), "numsales"],
    ],
    group: [fn("DATE", col("date"))],
    order: [[literal("day"), "DESC"]],
  });
};

const getSalesSummary = async (period = "today") => {
  let dateFilter = {};
  const now = new Date();

  switch (period) {
    case "today":
      dateFilter = {
        [Op.gte]: new Date(now.setHours(0, 0, 0, 0)),
        [Op.lte]: new Date(now.setHours(23, 59, 59, 999)),
      };
      break;
    case "week":
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { [Op.gte]: weekAgo };
      break;
    case "month":
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { [Op.gte]: monthAgo };
      break;
    default:
      dateFilter = { [Op.gte]: new Date(now.setHours(0, 0, 0, 0)) };
  }

  const result = await Sales.findOne({
    where: { date: dateFilter },
    attributes: [
      [fn("SUM", col("total")), "totalSales"],
      [fn("SUM", col("profit")), "totalProfit"],
      [fn("COUNT", col("id")), "totalTransactions"],
    ],
  });

  return {
    totalSales: parseFloat(result?.dataValues.totalSales) || 0,
    totalProfit: parseFloat(result?.dataValues.totalProfit) || 0,
    totalTransactions: parseInt(result?.dataValues.totalTransactions) || 0,
  };
};

const applyDiscount = (items, discountRate = 0.1) => {
  if (!items || !Array.isArray(items)) {
    throw new Error("Items must be an array");
  }

  let total = 0;
  const discounted = items.map((item) => {
    const subtotal = item.unitprice * item.quantity;
    const discount = subtotal * discountRate;
    const finalPrice = subtotal - discount;
    total += finalPrice;

    return {
      ...item,
      discount,
      totalprice: finalPrice,
      originalSubtotal: subtotal,
    };
  });

  return {
    items: discounted,
    total,
    totalDiscount: items.reduce(
      (sum, item) => sum + item.unitprice * item.quantity * discountRate,
      0
    ),
  };
};

const cancelSale = async (id) => {
  const transaction = await sequelize.transaction();

  try {
    const sale = await Sales.findByPk(id, {
      include: [SalesItem],
      transaction,
    });

    if (!sale) {
      throw new Error(`Sale with ID ${id} not found`);
    }

    if (sale.status === "canceled") {
      throw new Error("Sale is already canceled");
    }

    // Revertir stock de cada item
    for (const item of sale.SalesItems) {
      const product = await Products.findByPk(item.productid, { transaction });
      if (product) {
        product.stock += item.quantity;
        await product.save({ transaction });
        console.log(
          `↩️ Stock revertido - Producto: ${product.name}, Cantidad: ${item.quantity}`
        );
      }
    }

    // Marcar venta como cancelada
    const updatedSale = await sale.update(
      { status: "canceled" },
      { transaction }
    );

    await transaction.commit();
    console.log(`❌ Venta ${id} cancelada exitosamente`);

    return updatedSale;
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error cancelando venta ${id}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  getByUser,
  getDailyReport,
  getSalesSummary,
  applyDiscount,
  cancelSale,
};
