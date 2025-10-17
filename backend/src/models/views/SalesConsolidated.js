const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const SalesConsolidated = sequelize.define(
  "SalesConsolidated",
  {
    cashregister_id: { type: DataTypes.INTEGER },
    cashregister_userid: { type: DataTypes.INTEGER },

    totalSalesByCash: { type: DataTypes.DECIMAL(10, 2) },
    totalProfitByCash: { type: DataTypes.DECIMAL(10, 2) },

    totalSalesToday: { type: DataTypes.DECIMAL(10, 2) },
    totalProfitToday: { type: DataTypes.DECIMAL(10, 2) },

    totalSalesMonth: { type: DataTypes.DECIMAL(10, 2) },
    totalProfitMonth: { type: DataTypes.DECIMAL(10, 2) },

    sale_userid: { type: DataTypes.INTEGER },
    totalSalesByUser: { type: DataTypes.DECIMAL(10, 2) },
    totalProfitByUser: { type: DataTypes.DECIMAL(10, 2) },
    numSalesByUser: { type: DataTypes.INTEGER },

    paymentmethod: { type: DataTypes.STRING },
    totalByPaymentMethod: { type: DataTypes.DECIMAL(10, 2) },
    totalProfitByPaymentMethod: { type: DataTypes.DECIMAL(10, 2) },
  },
  {
    tableName: "SalesConsolidated", // Debe coincidir con tu vista SQL
    timestamps: false,
    freezeTableName: true,
  }
);

// Como es una vista, no tiene ID
SalesConsolidated.removeAttribute("id");

module.exports = SalesConsolidated;
