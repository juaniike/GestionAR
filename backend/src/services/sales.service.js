const { Op, fn, col, literal } = require("sequelize");
const Sales = require("../models/Sales");
const SalesItem = require("../models/SalesItem");
const Products = require("../models/Products");
const cashRegisterServices = require("./cashRegister.service");

const createSale = async (userid, items, paymentmethod = "cash") => {
  const cashRegister = await cashRegisterServices.getOpenByUser(userid);
  if (!cashRegister) throw new Error("There is no open box for this user");

  const cashid = cashRegister.id;

  let total = 0;
  let profit = 0;

  //Calculo el total y la ganancia
  for (const item of items) {
    const product = await Products.findByPk(item.productid);
    if (!product) throw new Error(`Product ${item.productid} not found`);

    const totalprice = item.quantity * item.unitprice;
    const gain = (item.unitprice - product.cost) * item.quantity;

    total += totalprice;
    profit += gain;
  }

  //Creo la venta
  const sale = await Sales.create({
    userid,
    cashid,
    total,
    profit,
    paymentmethod,
    status: "paid",
  });

  //Creo cada item y actualizo el stock
  for (const item of items) {
    const product = await Products.findByPk(item.productid);
    if (!product) continue;

    const totalprice = item.quantity * item.unitprice;

    await SalesItem.create({
      saleid: sale.id,
      productid: item.productid,
      quantity: item.quantity,
      unitprice: item.unitprice,
      totalprice,
    });

    product.stock -= item.quantity;
    await product.save();
  }

  return sale;
};

const getAllSales = async () => {
  return await Sales.findAll({
    include: [{ model: SalesItem, include: [Products] }],
    order: [["date", "DESC"]],
  });
};

const getSaleById = async (id) => {
  return await Sales.findByPk(id, {
    include: [{ model: SalesItem, include: [Products] }],
  });
};

const getByUser = async (userid) => {
  return await Sales.findAll({
    where: { userid },
    include: [{ model: SalesItem, include: [Products] }],
  });
};

const getDailyReport = async () => {
  return await Sales.findAll({
    attributes: [
      [fn("DATE", col("date")), "day"],
      [fn("SUM", col("total")), "totalsales"],
      [fn("COUNT", col("id")), "numsales"],
    ],
    group: [fn("DATE", col("date"))],
    order: [[literal("day"), "DESC"]],
  });
};

const applyDiscount = (items, discountRate = 0.1) => {
  let total = 0;
  const discounted = items.map((item) => {
    const discount = item.unitprice * item.quantity * discountRate;
    const finalPrice = item.unitprice * item.quantity - discount;
    total += finalPrice;
    return { ...item, discount, totalprice: finalPrice };
  });
  return { items: discounted, total };
};

const cancelSale = async (id) => {
  const sale = await Sales.findByPk(id, { include: [SalesItem] });
  if (!sale || sale.status === "canceled") return null;

  for (const item of sale.SalesItem) {
    const product = await Products.findByPk(item.productid);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }
  return sale.update({ status: "canceled" });
};

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  getByUser,
  getDailyReport,
  applyDiscount,
  cancelSale,
};
