const { fn, col } = require("sequelize");
const Sales = require("../models/Sales");
const Products = require("../models/Products");
const SalesItem = require("../models/SalesItem");
const salesServices = require("../services/sales.service");

const createSale = async (req, res, next) => {
  try {
    const {
      items,
      paymentmethod = "cash",
      client_id = null, // ✅ RECIBIR client_id
    } = req.body;

    const userid = req.user.id;

    if (!items || items.length === 0) {
      return next({ error: 400, message: "No hay productos en la venta" });
    }

    // ✅ VALIDAR DATOS
    const saleData = {
      items,
      paymentmethod,
      client_id,
    };

    const sale = await salesServices.createSale(userid, saleData);

    // ✅ MEJORAR RESPUESTA
    res.status(201).json({
      success: true,
      message: "Venta creada exitosamente",
      data: {
        id: sale.id,
        ticket_number: sale.ticket_number,
        total: sale.total,
        date: sale.date,
        paymentmethod: sale.paymentmethod,
        client: sale.Client
          ? {
              id: sale.Client.id,
              name: sale.Client.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error en createSale:", error);
    next({
      error: 500,
      message: error.message || "Error al crear la venta",
    });
  }
};

const getAllSales = async (req, res, next) => {
  try {
    // ✅ RECIBIR FILTROS
    const filters = {
      userid: req.query.userid,
      client_id: req.query.client_id, // ✅ NUEVO
      status: req.query.status,
      paymentmethod: req.query.paymentmethod,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const sales = await salesServices.getAllSales(filters);

    // ✅ MEJORAR RESPUESTA
    res.json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesServices.getSaleById(id);

    if (!sale) {
      return next({ error: 404, message: "Venta no encontrada" });
    }

    res.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const getByUser = async (req, res, next) => {
  try {
    const { userid } = req.params;
    const sales = await salesServices.getByUser(userid);

    res.json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const getDailyReport = async (req, res, next) => {
  try {
    // ✅ PERMITIR FECHAS PERSONALIZADAS
    const { startDate, endDate } = req.query;
    const report = await salesServices.getDailyReport(startDate, endDate);

    res.json({
      success: true,
      date: new Date().toISOString().split("T")[0],
      data: report,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const applyDiscount = async (req, res, next) => {
  try {
    const { items, discountRate } = req.body;
    const result = salesServices.applyDiscount(items, discountRate || 0.1);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const cancelSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesServices.cancelSale(id);

    if (!sale) {
      return next({
        error: 404,
        message: "Venta no encontrada o ya cancelada",
      });
    }

    res.json({
      success: true,
      message: "Venta cancelada exitosamente",
      data: sale,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const generateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesServices.getSaleById(id);

    if (!sale) {
      return next({ error: 404, message: "Venta no encontrada" });
    }

    // ✅ MEJORAR TICKET
    const ticket = {
      ticket_number: sale.ticket_number || `TKT-${sale.id}`,
      date: sale.date,
      business: {
        name: process.env.BUSINESS_NAME || "Mi Negocio",
        address: process.env.BUSINESS_ADDRESS || "",
      },
      customer: sale.Client
        ? {
            name: sale.Client.name,
            document: sale.Client.document_number,
          }
        : { name: "Cliente general" },
      items: sale.SalesItems.map((item) => ({
        product: item.Product?.name || item.productname || "Producto",
        quantity: item.quantity,
        unit_price: item.unitprice,
        total: item.totalprice,
      })),
      totals: {
        subtotal: sale.total,
        total: sale.total,
      },
      payment_method: sale.paymentmethod,
      cashier: `Usuario ID: ${sale.userid}`,
    };

    res.json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const updateSaleItem = async (req, res, next) => {
  try {
    const { saleid, itemid } = req.params;
    const { quantity, unitprice } = req.body;

    const item = await SalesItem.findOne({ where: { id: itemid, saleid } });
    if (!item)
      return next({ error: 404, message: "Item de venta no encontrado" });

    const totalprice = quantity * unitprice;
    await item.update({ quantity, unitprice, totalprice });

    // Recalcular total de la venta
    const items = await SalesItem.findAll({ where: { saleid } });
    const total = items.reduce((acc, i) => acc + parseFloat(i.totalprice), 0);
    await Sales.update({ total }, { where: { id: saleid } });

    res.json({
      success: true,
      message: "Item actualizado exitosamente",
      data: item,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const getSoldProducts = async (req, res, next) => {
  try {
    const sold = await SalesItem.findAll({
      attributes: [
        "productid",
        [fn("SUM", col("quantity")), "totalSold"],
        [fn("SUM", col("totalprice")), "totalRevenue"],
      ],
      include: [
        { model: Products, attributes: ["name", "category", "price", "cost"] },
      ],
      group: ["productid", "Product.id"],
    });

    res.json({
      success: true,
      count: sold.length,
      data: sold,
    });
  } catch (error) {
    next(error);
  }
};

const getSaleItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const items = await SalesItem.findAll({
      where: { saleid: id },
      include: [Products],
    });

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// ✅ NUEVOS ENDPOINTS
const getPaymentMethodsReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await salesServices.getPaymentMethodsReport(
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const getTodaySales = async (req, res, next) => {
  try {
    const sales = await salesServices.getTodaySales();

    res.json({
      success: true,
      date: new Date().toISOString().split("T")[0],
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

const getSalesByClient = async (req, res, next) => {
  try {
    const { client_id } = req.params;
    const sales = await salesServices.getSalesByClient(client_id);

    res.json({
      success: true,
      count: sales.length,
      data: sales,
    });
  } catch (error) {
    next({ error: 500, message: error.message });
  }
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  getByUser,
  getDailyReport,
  applyDiscount,
  cancelSale,
  generateTicket,
  updateSaleItem,
  getSoldProducts,
  getSaleItems,
  getPaymentMethodsReport,
  getTodaySales,
  getSalesByClient,
};
