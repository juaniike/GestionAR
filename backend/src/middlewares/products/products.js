const Joi = require("joi");
const Products = require("../../models/Products");

const validateProduct = (req, res, next) => {
  const schema = Joi.object({
    barcode: Joi.string().allow(null, ""),
    name: Joi.string().required(),
    category: Joi.string().required(),
    price: Joi.number().min(0).required(),
    stock: Joi.number().integer().min(0).required(),
    minstock: Joi.number().integer().min(0).required(),
  });
  const { error } = schema.validate(req.body);
  if (error) return next({ error: 400, message: error.details[0].message });
  next();
};

const validateId = (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0 || !Number.isInteger(id)) {
    return next({ error: 400, message: "Invalid ID format" });
  }
  req.params.id = id; // ✅ Aseguramos que sea número
  next();
};

const checkMinStock = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) return next();

    const product = await Products.findByPk(id);
    if (!product) return next();

    if (product.stock <= product.minstock) {
      console.warn(
        `⚠️ Stock alert: Product "${product.name}" is at or below minimum stock (${product.stock} <= ${product.minstock})`
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  validateProduct,
  validateId,
  checkMinStock,
};
