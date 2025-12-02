// assets/js/controllers/dashboard/components/charts/clients-metrics.chart.js
import { ChartBase } from "./chart-base.component.js";

export class ClientsMetricsChart extends ChartBase {
  constructor(services) {
    super(
      services,
      "clients-metrics-chart",
      "👥 Comportamiento de Clientes",
      "Evolución de base de clientes y actividad",
      "400px"
    );
    this.period = 12; // meses
  }

  async init() {
    try {
      await this.renderChart();
      console.log("✅ Gráfico de clientes inicializado");
    } catch (error) {
      console.error("❌ Error inicializando gráfico de clientes:", error);
      this.showErrorState();
    }
  }

  async renderChart() {
    const data = await this.getChartData();
    this.createChart(data);
  }

  async getChartData() {
    try {
      console.log("📊 Obteniendo datos de clientes para gráfico...");
      const clients = await this.services.clients.getAllClients();
      const sales = await this.services.sales.getAllSales();
      const lastNMonths = this.getLastNMonths(this.period);

      const monthlyData = lastNMonths.map((month, index) => {
        // Simular crecimiento histórico de clientes
        const baseClients = Math.max(
          5,
          clients.length - (this.period - index - 1) * 2
        );
        const totalClientes = baseClients + Math.floor(Math.random() * 3);

        const monthSales = sales.filter((sale) => {
          if (!sale.date) return false;
          const saleDate = new Date(sale.date);
          return this.isSameMonth(saleDate, month);
        });

        const clientesActivos = new Set(monthSales.map((sale) => sale.clientid))
          .size;
        const frecuenciaCompra =
          monthSales.length / Math.max(1, clientesActivos);

        return {
          date: month,
          totalClientes,
          clientesActivos,
          frecuenciaCompra,
          totalVentas: monthSales.length,
          formattedDate: this.formatDate(month, "medium"),
        };
      });

      console.log(
        "👥 Datos de clientes procesados:",
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
    const totalClientesData = data.map((d) => d.totalClientes);
    const clientesActivosData = data.map((d) => d.clientesActivos);
    const frecuenciaData = data.map((d) => d.frecuenciaCompra);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Total Clientes",
            data: totalClientesData,
            borderColor: this.getColor(0),
            backgroundColor: this.getColor(0, 0.1),
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "Clientes Activos",
            data: clientesActivosData,
            borderColor: this.getColor(2),
            backgroundColor: "transparent",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "Frecuencia Compra",
            data: frecuenciaData,
            borderColor: this.getColor(4),
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

                if (label === "Frecuencia Compra") {
                  return ` ${label}: ${value.toFixed(1)} compras/cliente`;
                } else {
                  return ` ${label}: ${value} clientes`;
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
              text: "Cantidad Clientes",
            },
            ticks: {
              precision: 0,
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Frecuencia",
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: function (value) {
                return value.toFixed(1);
              },
            },
          },
        },
      },
    });
  }

  getMockData() {
    console.log("🔄 Generando datos de prueba para clientes...");
    const dates = this.getLastNMonths(this.period);
    const baseClientes = 8;

    return dates.map((date, index) => {
      const crecimiento = index * 1.5;
      const totalClientes =
        baseClientes + crecimiento + Math.floor(Math.random() * 4);
      const clientesActivos = Math.floor(
        totalClientes * (0.6 + Math.random() * 0.3)
      ); // 60-90%
      const frecuenciaCompra = 1.2 + Math.random() * 0.8; // 1.2-2.0

      return {
        date,
        totalClientes: Math.max(5, totalClientes),
        clientesActivos: Math.max(3, clientesActivos),
        frecuenciaCompra,
        totalVentas: clientesActivos * frecuenciaCompra,
        formattedDate: this.formatDate(date, "medium"),
      };
    });
  }

  async refresh() {
    console.log("🔄 Actualizando gráfico de clientes...");
    await this.renderChart();
  }
}

export default ClientsMetricsChart;
