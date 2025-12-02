const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Users = require("./Users");
const CashRegister = require("./CashRegister");

const Movement = sequelize.define(
  "Movement",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    type: {
      type: DataTypes.ENUM("ingreso", "egreso"),
      allowNull: false,
      comment: "ingreso = entrada de dinero, egreso = salida de dinero",
    },

    concept: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },

    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },

    category: {
      type: DataTypes.ENUM(
        "expense",
        "withdrawal",
        "deposit",
        "adjustment",
        "refund",
        "other"
      ),
      defaultValue: "other",
      comment:
        "expense=gasto, withdrawal=retiro, deposit=depósito, adjustment=ajuste, refund=devolución",
    },

    payment_method: {
      type: DataTypes.ENUM("cash", "card", "virtualpay", "transfer", "other"),
      defaultValue: "cash",
    },

    receipt_number: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    observations: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    cash_register_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "CashRegister",
        key: "id",
      },
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },

    status: {
      type: DataTypes.ENUM("active", "cancelled", "pending"),
      defaultValue: "active",
    },

    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "movements",
    timestamps: true,
    underscored: false,
    indexes: [
      {
        fields: ["cash_register_id"],
      },
      {
        fields: ["date"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["category"],
      },
    ],
  }
);

Users.hasMany(Movement, { foreignKey: "user_id" });
Movement.belongsTo(Users, { foreignKey: "user_id" });

CashRegister.hasMany(Movement, { foreignKey: "cash_register_id" });
Movement.belongsTo(CashRegister, { foreignKey: "cash_register_id" });

module.exports = Movement;
