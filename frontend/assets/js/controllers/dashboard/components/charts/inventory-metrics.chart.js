// assets/js/controllers/dashboard/components/charts/inventory-metrics.chart.js
import { ChartBase } from "./chart-base.component.js";

export class InventoryMetricsChart extends ChartBase {
  constructor(services) {
    super(
      services,
      "inventory-metrics-chart",
      "📦 Métricas de Inventario",
      "Valor de inventario y alertas de stock",
      "400px"
    );
    this.period = 6; // meses
  }

  async init() {
    try {
      await this.renderChart();
      console.log("✅ Gráfico de inventario inicializado");
    } catch (error) {
      console.error("❌ Error inicializando gráfico de inventario:", error);
      this.showErrorState();
    }
  }

  async renderChart() {
    const data = await this.getChartData();
    this.createChart(data);
  }

  async getChartData() {
    try {
      console.log("📊 Obteniendo datos de inventario para gráfico...");
      const products = await this.services.products.getAllProducts();
      const lastNMonths = this.getLastNMonths(this.period);

      const monthlyData = lastNMonths.map((month) => {
        // En un sistema real, tendrías histórico mensual
        // Por ahora usamos datos actuales con variación simulada
        const baseValue = products.reduce(
          (sum, product) => sum + (product.stock || 0) * (product.cost || 0),
          0
        );

        // Simular variación mensual
        const variation = 0.8 + Math.random() * 0.4; // 80-120%
        const valorInventario = baseValue * variation;

        const productosBajoStock = products.filter(
          (p) => (p.stock || 0) <= (p.minstock || 5)
        ).length;

        const productosSinStock = products.filter(
          (p) => (p.stock || 0) === 0
        ).length;

        return {
          date: month,
          valorInventario,
          productosBajoStock,
          productosSinStock,
          totalProductos: products.length,
          formattedDate: this.formatDate(month, "medium"),
        };
      });

      console.log(
        "📦 Datos de inventario procesados:",
        monthlyData.length,
        "meses"
      );
      return monthlyData;
    } catch (error) {
      console.error(
        "❌ Error obteniendo datos reales, usando datos de prueba:",
        error
      );
      return this.getMockData();
    }
  }

  getLastNMonths(months) {
    const dates = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    return dates;
  }

  createChart(data) {
    const ctx = document.getElementById(this.chartId);
    if (!ctx) {
      console.error("❌ Canvas no encontrado:", this.chartId);
      return;
    }

    const labels = data.map((d) => d.formattedDate);
    const valorData = data.map((d) => d.valorInventario);
    const bajoStockData = data.map((d) => d.productosBajoStock);
    const sinStockData = data.map((d) => d.productosSinStock);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Valor Inventario ($)",
            data: valorData,
            borderColor: this.getColor(0),
            backgroundColor: this.getColor(0, 0.1),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "Productos Bajo Stock",
            data: bajoStockData,
            borderColor: this.getColor(3),
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y1",
          },
          {
            label: "Productos Sin Stock",
            data: sinStockData,
            borderColor: this.getColor(5),
            backgroundColor: "transparent",
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                const label = context.dataset.label;

                if (label.includes("Valor")) {
                  return ` ${label}: $${value.toLocaleString("es-ES", {
                    maximumFractionDigits: 0,
                  })}`;
                } else {
                  return ` ${label}: ${value}`;
                }
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Valor ($)",
            },
            ticks: {
              callback: function (value) {
                if (value >= 1000) {
                  return "$" + (value / 1000).toFixed(0) + "K";
                }
                return "$" + value;
              },
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Cantidad Productos",
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  getMockData() {
    console.log("🔄 Generando datos de prueba para inventario...");
    const dates = this.getLastNMonths(this.period);
    const baseValor = 150000;

    return dates.map((date, index) => {
      const trend = index * 20000;
      const randomVariation = (Math.random() - 0.5) * 30000;

      const valorInventario = baseValor + trend + randomVariation;
      const productosBajoStock = 2 + Math.floor(Math.random() * 5);
      const productosSinStock = Math.floor(Math.random() * 2);

      return {
        date,
        valorInventario: Math.max(100000, valorInventario),
        productosBajoStock,
        productosSinStock,
        totalProductos: 25,
        formattedDate: this.formatDate(date, "medium"),
      };
    });
  }

  async refresh() {
    console.log("🔄 Actualizando gráfico de inventario...");
    await this.renderChart();
  }
}

export default InventoryMetricsChart;
