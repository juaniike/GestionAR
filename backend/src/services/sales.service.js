// backend/src/services/sales.service.js
const { Op, fn, col } = require("sequelize");
const sequelize = require("../config/database");
const Sales = require("../models/Sales");
const SalesItem = require("../models/SalesItem");
const Products = require("../models/Products");
const cashRegisterServices = require("./cashRegister.service");
const Movement = require("../models/Movement");
const Client = require("../models/Clients");

const createSale = async (userid, saleData) => {
  // ✅ EXTRAER NUEVOS CAMPOS PARA CRÉDITO
  const {
    items,
    paymentmethod = "cash",
    client_id = null,
    credit_status = "paid", // ✅ NUEVO: 'paid', 'pending', 'partial'
    total_paid = 0, // ✅ NUEVO: monto ya pagado
  } = saleData;

  const transaction = await sequelize.transaction();

  try {
    console.log(
      `🛒 Iniciando venta - Método: ${paymentmethod}, Crédito: ${credit_status}, User: ${userid}`
    );

    // Verificar caja abierta SOLO para ventas en efectivo
    let cashid = null;
    if (paymentmethod === "cash") {
      const cashRegister = await cashRegisterServices.getOpenByUser(userid);
      if (!cashRegister) {
        throw new Error("No hay caja abierta para ventas en efectivo");
      }
      cashid = cashRegister.id;
    }

    // ✅ VALIDACIÓN ESPECIAL PARA VENTAS A CRÉDITO
    if (paymentmethod === "credit") {
      if (!client_id) {
        throw new Error("Para venta a crédito se requiere un cliente");
      }

      const client = await Client.findByPk(client_id, { transaction });
      if (!client) {
        throw new Error(`Cliente con ID ${client_id} no encontrado`);
      }

      // Verificar que el cliente tenga cuenta corriente habilitada
      if (client.type !== "client") {
        throw new Error("Solo los clientes pueden comprar a crédito");
      }

      console.log(`💰 Cliente válido para crédito: ${client.name}`);
    }

    // Validar cliente (para cualquier venta con cliente)
    if (client_id) {
      const client = await Client.findByPk(client_id, { transaction });
      if (!client) {
        throw new Error(`Cliente con ID ${client_id} no encontrado`);
      }
    }

    // Validar items
    if (!items || items.length === 0) {
      throw new Error("La venta debe tener al menos un item");
    }

    let total = 0;
    let profit = 0;
    const salesItemsData = [];

    // Calcular total, ganancia y preparar items
    for (const item of items) {
      if (!item.productid || !item.quantity || !item.unitprice) {
        throw new Error("Cada item debe tener productid, quantity y unitprice");
      }

      const product = await Products.findByPk(item.productid, { transaction });
      if (!product) {
        throw new Error(`Producto ${item.productid} no encontrado`);
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `Stock insuficiente para: ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`
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
        product,
      });
    }

    // ✅ GENERAR NÚMERO DE TICKET
    const ticketNumber = `TKT-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    // ✅ DETERMINAR STATUS DE LA VENTA
    let saleStatus = "paid";
    if (paymentmethod === "credit") {
      saleStatus =
        total_paid >= total ? "paid" : total_paid > 0 ? "partial" : "pending";
    }

    // ✅ DETERMINAR STATUS DE CRÉDITO (si no viene del frontend)
    let finalCreditStatus = credit_status;
    if (paymentmethod === "credit") {
      if (total_paid >= total) {
        finalCreditStatus = "paid";
      } else if (total_paid > 0) {
        finalCreditStatus = "partial";
      } else {
        finalCreditStatus = "pending";
      }
    } else {
      finalCreditStatus = "paid"; // Para efectivo, tarjeta, transferencia
    }

    // ✅ Crear la venta con los NUEVOS CAMPOS
    const sale = await Sales.create(
      {
        userid,
        cashid: paymentmethod === "cash" ? cashid : null,
        client_id,
        total,
        profit,
        paymentmethod,
        status: saleStatus,
        credit_status: finalCreditStatus, // ✅ NUEVO
        total_paid: total_paid, // ✅ NUEVO
        date: new Date(),
        ticket_number: ticketNumber,
      },
      { transaction }
    );

    console.log(
      `✅ Venta creada ID: ${sale.id}, Total: $${total}, Crédito: ${finalCreditStatus}`
    );

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

    // ✅ CREAR MOVIMIENTO AUTOMÁTICO SOLO PARA VENTAS EN EFECTIVO
    if (paymentmethod === "cash" && cashid) {
      await Movement.create(
        {
          cash_register_id: cashid,
          type: "ingreso",
          amount: total,
          concept: `Venta #${sale.id}`,
          category: "venta",
          payment_method: "cash",
          reference_id: sale.id,
          reference_type: "sale",
          userid: userid,
          observations: `Venta registrada - Ticket: ${ticketNumber}`,
        },
        { transaction }
      );

      console.log(`💰 Movimiento creado para venta ${sale.id}`);
    }

    // ✅ ACTUALIZAR SALDO DEL CLIENTE SI ES VENTA A CRÉDITO
    if (paymentmethod === "credit" && client_id) {
      const client = await Client.findByPk(client_id, { transaction });
      if (client) {
        const nuevoSaldo = (parseFloat(client.balance) || 0) + total;
        await client.update(
          {
            balance: nuevoSaldo,
            last_purchase: new Date(),
            total_purchases:
              (parseFloat(client.total_purchases) || 0) + parseFloat(total),
          },
          { transaction }
        );

        console.log(
          `💰 Saldo actualizado cliente ${client_id}: $${nuevoSaldo}`
        );
        console.log(`📊 Cliente ${client.name} - Nuevo saldo: $${nuevoSaldo}`);
      }
    }
    // ✅ ACTUALIZAR HISTORIAL DEL CLIENTE PARA CUALQUIER VENTA CON CLIENTE
    else if (client_id) {
      const client = await Client.findByPk(client_id, { transaction });
      if (client) {
        await client.update(
          {
            last_purchase: new Date(),
            total_purchases:
              (parseFloat(client.total_purchases) || 0) + parseFloat(total),
          },
          { transaction }
        );
        console.log(`👤 Historial actualizado para cliente ${client_id}`);
      }
    }

    await transaction.commit();
    console.log(
      `✅ Venta ${sale.id} completada exitosamente - Tipo: ${paymentmethod}, Estado: ${saleStatus}`
    );

    // Obtener venta completa con items para retornar
    const completeSale = await Sales.findByPk(sale.id, {
      include: [{ model: SalesItem, include: [Products] }, { model: Client }],
    });

    return completeSale;
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error en createSale: ${error.message}`);
    throw error;
  }
};

// ✅ AGREGAR FILTROS PARA CLIENTE Y CRÉDITO EN getAllSales
const getAllSales = async (filters = {}) => {
  const whereClause = {};

  // Filtros existentes
  if (filters.userid) whereClause.userid = filters.userid;
  if (filters.status) whereClause.status = filters.status;
  if (filters.paymentmethod) whereClause.paymentmethod = filters.paymentmethod;
  if (filters.client_id) whereClause.client_id = filters.client_id;

  // ✅ NUEVO: Filtrar por estado de crédito
  if (filters.credit_status) whereClause.credit_status = filters.credit_status;

  if (filters.startDate && filters.endDate) {
    whereClause.date = {
      [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
    };
  }

  return await Sales.findAll({
    where: whereClause,
    include: [{ model: SalesItem, include: [Products] }, { model: Client }],
    order: [["date", "DESC"]],
  });
};

// ✅ AGREGAR FILTRO DE CRÉDITO EN getSaleById
const getSaleById = async (id) => {
  if (!id || isNaN(id)) {
    throw new Error("ID de venta inválido");
  }

  const sale = await Sales.findByPk(id, {
    include: [{ model: SalesItem, include: [Products] }, { model: Client }],
  });

  if (!sale) {
    throw new Error(`Venta con ID ${id} no encontrada`);
  }

  return sale;
};

// ✅ MEJORAR cancelSale para manejar créditos
const cancelSale = async (id) => {
  const transaction = await sequelize.transaction();

  try {
    const sale = await Sales.findByPk(id, {
      include: [SalesItem, Client],
      transaction,
    });

    if (!sale) {
      throw new Error(`Venta con ID ${id} no encontrada`);
    }

    if (sale.status === "canceled") {
      throw new Error("La venta ya está cancelada");
    }

    // ✅ REVERTIR SALDO DEL CLIENTE SI ES VENTA A CRÉDITO
    if (sale.paymentmethod === "credit" && sale.client_id) {
      const client = await Client.findByPk(sale.client_id, { transaction });
      if (client) {
        const nuevoSaldo = (parseFloat(client.balance) || 0) - sale.total;
        await client.update(
          {
            balance: nuevoSaldo,
            total_purchases:
              (parseFloat(client.total_purchases) || 0) -
              parseFloat(sale.total),
          },
          { transaction }
        );

        console.log(
          `↩️ Saldo revertido cliente ${sale.client_id}: $${nuevoSaldo}`
        );
      }
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

    // ✅ REVERTIR MOVIMIENTO SI ES VENTA EN EFECTIVO
    if (sale.paymentmethod === "cash" && sale.cashid) {
      await Movement.create(
        {
          cash_register_id: sale.cashid,
          type: "egreso",
          amount: sale.total,
          concept: `Cancelación Venta #${sale.id}`,
          category: "devolucion",
          payment_method: "cash",
          reference_id: sale.id,
          reference_type: "sale_cancelation",
          userid: sale.userid,
          observations: `Cancelación de venta - Ticket original: ${sale.ticket_number}`,
        },
        { transaction }
      );

      console.log(`💰 Movimiento de cancelación creado para venta ${sale.id}`);
    }

    // Marcar venta como cancelada
    const updatedSale = await sale.update(
      {
        status: "canceled",
        credit_status: "paid", // Marcar como pagado si estaba pendiente
      },
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

// ✅ NUEVO: Registrar pago a cuenta corriente
const registerCreditPayment = async (sale_id, paymentData) => {
  const transaction = await sequelize.transaction();

  try {
    const sale = await Sales.findByPk(sale_id, { transaction });
    if (!sale) {
      throw new Error(`Venta con ID ${sale_id} no encontrada`);
    }

    if (sale.paymentmethod !== "credit") {
      throw new Error("Solo se pueden registrar pagos en ventas a crédito");
    }

    const {
      amount,
      payment_method = "cash",
      receipt_number = null,
      observations = null,
    } = paymentData;
    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0) {
      throw new Error("El monto del pago debe ser mayor a 0");
    }

    // Calcular nuevo total pagado
    const newTotalPaid = (parseFloat(sale.total_paid) || 0) + paymentAmount;

    // Determinar nuevo estado
    let newCreditStatus = sale.credit_status;
    if (newTotalPaid >= sale.total) {
      newCreditStatus = "paid";
    } else if (newTotalPaid > 0) {
      newCreditStatus = "partial";
    }

    // Actualizar venta
    await sale.update(
      {
        total_paid: newTotalPaid,
        credit_status: newCreditStatus,
        status: newTotalPaid >= sale.total ? "paid" : "partial",
      },
      { transaction }
    );

    // Actualizar saldo del cliente
    if (sale.client_id) {
      const client = await Client.findByPk(sale.client_id, { transaction });
      if (client) {
        const nuevoSaldo = (parseFloat(client.balance) || 0) - paymentAmount;
        await client.update({ balance: nuevoSaldo }, { transaction });
        console.log(
          `💰 Saldo actualizado cliente ${sale.client_id}: $${nuevoSaldo}`
        );
      }
    }

    // Registrar movimiento (opcional)
    // await Movement.create({ ... }, { transaction });

    await transaction.commit();

    console.log(`✅ Pago registrado para venta ${sale_id}: $${paymentAmount}`);

    return {
      success: true,
      sale_id,
      amount: paymentAmount,
      total_paid: newTotalPaid,
      remaining: sale.total - newTotalPaid,
      credit_status: newCreditStatus,
    };
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error registrando pago: ${error.message}`);
    throw error;
  }
};

// ✅ NUEVO: Obtener ventas pendientes de pago por cliente
const getPendingCreditSales = async (client_id) => {
  if (!client_id || isNaN(client_id)) {
    throw new Error("ID de cliente inválido");
  }

  return await Sales.findAll({
    where: {
      client_id,
      paymentmethod: "credit",
      credit_status: ["pending", "partial"],
    },
    include: [{ model: SalesItem, include: [Products] }, { model: Client }],
    order: [["date", "DESC"]],
  });
};

// ✅ NUEVO: Obtener resumen de crédito del cliente
const getClientCreditSummary = async (client_id) => {
  if (!client_id || isNaN(client_id)) {
    throw new Error("ID de cliente inválido");
  }

  const pendingSales = await Sales.findAll({
    where: {
      client_id,
      paymentmethod: "credit",
      credit_status: ["pending", "partial"],
    },
    attributes: [
      [fn("SUM", col("total")), "total_debt"],
      [fn("SUM", col("total_paid")), "total_paid"],
      [fn("COUNT", col("id")), "pending_count"],
    ],
  });

  const summary = pendingSales[0]?.dataValues || {};

  return {
    client_id,
    total_debt: parseFloat(summary.total_debt) || 0,
    total_paid: parseFloat(summary.total_paid) || 0,
    pending_balance:
      (parseFloat(summary.total_debt) || 0) -
      (parseFloat(summary.total_paid) || 0),
    pending_count: parseInt(summary.pending_count) || 0,
  };
};

// Resto de las funciones existentes (sin cambios)
const getSalesByClient = async (client_id) => {
  if (!client_id || isNaN(client_id)) {
    throw new Error("ID de cliente inválido");
  }

  return await Sales.findAll({
    where: { client_id },
    include: [{ model: SalesItem, include: [Products] }, { model: Client }],
    order: [["date", "DESC"]],
  });
};

const getPaymentMethodsReport = async (startDate, endDate) => {
  const whereClause = { status: "paid" };

  if (startDate && endDate) {
    whereClause.date = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  return await Sales.findAll({
    where: whereClause,
    attributes: [
      "paymentmethod",
      [fn("COUNT", col("id")), "count"],
      [fn("SUM", col("total")), "total"],
    ],
    group: ["paymentmethod"],
  });
};

const getTodaySales = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await Sales.findAll({
    where: {
      date: {
        [Op.between]: [today, tomorrow],
      },
      status: "paid",
    },
    include: [{ model: SalesItem, include: [Products] }, { model: Client }],
    order: [["date", "DESC"]],
  });
};

const getByUser = async (userid, limit = null) => {
  try {
    console.log(`🔍 [SalesService] Buscando ventas para usuario: ${userid}`);

    const options = {
      where: { userid },
      include: [{ model: SalesItem, include: [Products] }, { model: Client }],
      order: [["date", "DESC"]],
    };

    if (limit) {
      options.limit = parseInt(limit);
    }

    const sales = await Sales.findAll(options);
    console.log(
      `✅ [SalesService] ${sales.length} ventas para usuario ${userid}`
    );

    return sales;
  } catch (error) {
    console.error(`❌ [SalesService] Error en getByUser:`, error);
    throw error;
  }
};

const getDailyReport = async (startDate, endDate) => {
  try {
    console.log(
      `📊 [SalesService] Generando reporte diario: ${startDate} - ${endDate}`
    );

    const whereClause = {};

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const report = await Sales.findAll({
      where: whereClause,
      attributes: [
        [fn("DATE", col("date")), "day"],
        [fn("SUM", col("total")), "totalsales"],
        [fn("SUM", col("profit")), "totalprofit"],
        [fn("COUNT", col("id")), "numsales"],
      ],
      group: [fn("DATE", col("date"))],
      order: [[col("day"), "DESC"]],
    });

    console.log(`✅ [SalesService] Reporte generado: ${report.length} días`);
    return report;
  } catch (error) {
    console.error(`❌ [SalesService] Error en getDailyReport:`, error);
    throw error;
  }
};

const applyDiscount = (items, discountRate = 0.1) => {
  try {
    console.log(
      `💰 [SalesService] Aplicando descuento del ${discountRate * 100}%`
    );

    if (!items || !Array.isArray(items)) {
      throw new Error("Items debe ser un array");
    }

    let total = 0;
    const discounted = items.map((item) => {
      const subtotal = (item.unitprice || 0) * (item.quantity || 0);
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

    const result = {
      items: discounted,
      total,
      totalDiscount: items.reduce(
        (sum, item) =>
          sum + (item.unitprice || 0) * (item.quantity || 0) * discountRate,
        0
      ),
    };

    console.log(
      `✅ [SalesService] Descuento aplicado: $${result.totalDiscount}`
    );
    return result;
  } catch (error) {
    console.error(`❌ [SalesService] Error en applyDiscount:`, error);
    throw error;
  }
};

const getSalesSummary = async (period = "today") => {
  try {
    console.log(`📈 [SalesService] Resumen para periodo: ${period}`);

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "today":
        const startOfToday = new Date(now.setHours(0, 0, 0, 0));
        const endOfToday = new Date(now.setHours(23, 59, 59, 999));
        dateFilter = {
          [Op.between]: [startOfToday, endOfToday],
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
      where: { date: dateFilter, status: "paid" },
      attributes: [
        [fn("SUM", col("total")), "totalSales"],
        [fn("SUM", col("profit")), "totalProfit"],
        [fn("COUNT", col("id")), "totalTransactions"],
      ],
    });

    const summary = {
      totalSales: parseFloat(result?.dataValues?.totalSales) || 0,
      totalProfit: parseFloat(result?.dataValues?.totalProfit) || 0,
      totalTransactions: parseInt(result?.dataValues?.totalTransactions) || 0,
    };

    console.log(
      `✅ [SalesService] Resumen: $${summary.totalSales} en ${summary.totalTransactions} ventas`
    );
    return summary;
  } catch (error) {
    console.error(`❌ [SalesService] Error en getSalesSummary:`, error);
    throw error;
  }
};

// Exportar funciones existentes + NUEVAS funciones de crédito
module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  getByUser,
  getDailyReport,
  getSalesSummary,
  applyDiscount,
  cancelSale,
  getSalesByClient,
  getPaymentMethodsReport,
  getTodaySales,
  registerCreditPayment,
  getPendingCreditSales,
  getClientCreditSummary,
};
