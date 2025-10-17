const { fn, col } = require("sequelize");
const Sales = require("../models/Sales");
const Products = require("../models/Products");
const SalesItem = require("../models/SalesItem");
const salesServices = require("../services/sales.service");

const createSale = async (req, res, next) => {
  try {
    const { items, paymentmethod, cashid } = req.body;
    const userid = req.user.id;

    if (!items || items.length === 0) {
      return next({ error: 400, message: "No products provided" });
    }

    const sale = await salesServices.createSale(
      userid,
      items,
      paymentmethod,
      cashid
    );
    res.status(201).json({ message: "Sale created successfully", sale });
  } catch (error) {
    next(error);
  }
};

const getAllSales = async (req, res, next) => {
  try {
    const sales = await salesServices.getAllSales();
    res.json(sales);
  } catch (error) {
    next(error);
  }
};

const getSaleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesServices.getSaleById(id);
    if (!sale) return next({ error: 404, message: "Sale not found" });
    res.json(sale);
  } catch (error) {
    next(error);
  }
};

const getByUser = async (req, res, next) => {
  try {
    const { userid } = req.params;
    const sales = await salesServices.getByUser(userid);
    res.json(sales);
  } catch (error) {
    next(error);
  }
};

const getDailyReport = async (req, res, next) => {
  try {
    const report = await salesServices.getDailyReport();
    res.json(report);
  } catch (error) {
    next(error);
  }
};

const applyDiscount = async (req, res, next) => {
  try {
    const { items, discountRate } = req.body;
    const result = salesServices.applyDiscount(items, discountRate || 0.1);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const cancelSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesServices.cancelSale(id);
    if (!sale)
      return next({
        error: 404,
        message: "Sale not found or already canceled",
      });
    res.json({ message: "Sale canceled successfully", sale });
  } catch (error) {
    next(error);
  }
};

const generateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sale = await salesServices.getSaleById(id);
    if (!sale) return next({ error: 404, message: "Sale not found" });

    //Simulo un ticket
    const ticket = {
      title: "Factura de venta",
      date: new Date(),
      customer: req.user.username,
      paymentmethod: sale.paymentmethod,
      total: sale.total,
      items: sale.SalesItems.map((item) => ({
        product: item.Product.name,
        category: item.Product.category,
        quantity: item.quantity,
        unitprice: item.unitprice,
        totalprice: item.totalprice,
      })),
    };
    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

const updateSaleItem = async (req, res, next) => {
  try {
    const { saleid, itemid } = req.params;
    const { quantity, unitprice } = req.body;

    const item = await SalesItem.findOne({ where: { id: itemid, saleid } });
    if (!item) return next({ error: 404, message: "Sale item not found" });

    const totalprice = quantity * unitprice;
    await item.update({ quantity, unitprice, totalprice });

    //Recalculo toda la venta
    const items = await SalesItem.findAll({ where: { saleid } });
    const total = items.reduce((acc, i) => acc + parseFloat(i.totalprice), 0);
    await Sales.update({ total }, { where: { id: saleid } });

    res.json({ message: "Item updated successfully", item });
  } catch (error) {
    next(error);
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
      include: [{ model: Products, attributes: ["name", "category", "price"] }],
      group: ["productid", "Product.id"],
    });
    res.json(sold);
  } catch (error) {
    next(error);
  }
};

const getSaleItems = async (req, res, next) => {
  const { id } = req.params;
  const items = await SalesItem.findAll({
    where: { saleid: id },
    include: [Products],
  });
  res.json(items);
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
};
