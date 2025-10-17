const productsServices = require("../services/products.service");

const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productsServices.getById(id);
    if (!product) return next({ error: 404, message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const getByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const product = await productsServices.getByBarcode(barcode);
    if (!product) return next({ error: 404, message: "Product not found" });
    res.json(product);
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const products = await productsServices.getAll();
    res.json(products);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { name, category, price, stock, minStock } = req.body;

    const product = await productsServices.create({
      name,
      category,
      price,
      stock,
      minStock,
    });
    if (!product)
      return next({ error: 500, message: "Error creating product" });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const updatedProduct = await productsServices.update(
      req.params.id,
      req.body
    );
    if (!updatedProduct)
      return next({ error: 404, message: "Product not found" });
    res.json(updatedProduct);
  } catch (error) {
    next(error);
  }
};

const destroy = async (req, res, next) => {
  try {
    const deleted = await productsServices.destroy({
      where: { id: req.params.id },
    });
    if (!deleted) return next({ error: 404, message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getById,
  getByBarcode,
  getAll,
  create,
  update,
  destroy,
};
