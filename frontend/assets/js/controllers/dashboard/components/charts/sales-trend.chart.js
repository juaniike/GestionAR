// assets/js/controllers/dashboard/components/charts/sales-trend.chart.js
import { ChartBase } from "./chart-base.component.js";

export class SalesTrendChart extends ChartBase {
  // En el constructor de sales-trend.chart.js
  constructor(services) {
    super(
      services,
      "sales-trend-chart",
      "📈 Tendencia de Ventas",
      "Evolución de ventas y transacciones últimos 30 días",
      "500px"
    );
    this.period = 30;
  }

  async init() {
    try {
      await this.renderChart();
      console.log("✅ Gráfico de ventas inicializado");
    } catch (error) {
      console.error("❌ Error inicializando gráfico de ventas:", error);
      this.showErrorState();
    }
  }

  async renderChart() {
    const data = await this.getChartData();
    this.createChart(data);
  }

  async getChartData() {
    try {
      console.log("📊 Obteniendo datos de ventas para gráfico...");
      const sales = await this.services.sales.getAllSales();
      const lastNDays = this.getLastNDays(this.period);

      const dailyData = lastNDays.map((day) => {
        const daySales = sales.filter((sale) => {
          if (!sale.date) return false;
          const saleDate = new Date(sale.date);
          return this.isSameDay(saleDate, day);
        });

        const totalSales = daySales.reduce(
          (sum, sale) => sum + (sale.total || 0),
          0
        );
        const transactionCount = daySales.length;
        const averageTicket =
          transactionCount > 0 ? totalSales / transactionCount : 0;

        return {
          date: day,
          totalSales,
          transactionCount,
          averageTicket,
          formattedDate: this.formatDate(day, "short"),
        };
      });

      console.log("📈 Datos de ventas procesados:", dailyData.length, "días");
      return dailyData;
    } catch (error) {
      console.error(
        "❌ Error obteniendo datos reales, usando datos de prueba:",
        error
      );
      return this.getMockData();
    }
  }

  createChart(data) {
    const ctx = document.getElementById(this.chartId);
    if (!ctx) {
      console.error("❌ Canvas no encontrado:", this.chartId);
      return;
    }

    const labels = data.map((d) => d.formattedDate);
    const salesData = data.map((d) => d.totalSales);
    const transactionsData = data.map((d) => d.transactionCount);

    // Destruir gráfico anterior si existe
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Ventas Totales ($)",
            data: salesData,
            borderColor: this.getColor(0),
            backgroundColor: this.getColor(0, 0.1),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "N° de Transacciones",
            data: transactionsData,
            borderColor: this.getColor(1),
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
            labels: {
              usePointStyle: true,
              padding: 20,
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "#fff",
            bodyColor: "#fff",
            borderColor: this.getColor(0),
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const dataset = context.dataset;
                const value = context.parsed.y;

                if (dataset.label === "Ventas Totales ($)") {
                  return ` Ventas: $${value.toLocaleString("es-ES")}`;
                } else {
                  return ` Transacciones: ${value}`;
                }
              },
              afterLabel: (context) => {
                const index = context.dataIndex;
                const avgTicket = data[index].averageTicket;
                return ` Ticket promedio: $${avgTicket.toLocaleString("es-ES", {
                  maximumFractionDigits: 0,
                })}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false,
            },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 10,
            },
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Ventas ($)",
              color: this.getColor(0),
            },
            ticks: {
              callback: function (value) {
                if (value >= 1000) {
                  return "$" + (value / 1000).toFixed(0) + "K";
                }
                return "$" + value;
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Transacciones",
              color: this.getColor(1),
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
    console.log("🔄 Generando datos de prueba para ventas...");
    const dates = this.getLastNDays(this.period);
    const baseSales = 8000;

    return dates.map((date, index) => {
      // Simular tendencia creciente con variación aleatoria
      const trend = index * 400;
      const randomVariation = (Math.random() - 0.5) * 3000;
      const dayOfWeekEffect =
        date.getDay() === 0 ? -1500 : date.getDay() === 6 ? 800 : 0;

      const totalSales = baseSales + trend + randomVariation + dayOfWeekEffect;
      const transactionCount =
        5 + Math.floor(Math.random() * 12) + Math.floor(trend / 800);
      const averageTicket = totalSales / transactionCount;

      return {
        date,
        totalSales: Math.max(1000, totalSales),
        transactionCount: Math.max(1, transactionCount),
        averageTicket,
        formattedDate: this.formatDate(date, "short"),
      };
    });
  }

  async refresh() {
    console.log("🔄 Actualizando gráfico de ventas...");
    await this.renderChart();
  }
}

export default SalesTrendChart;
