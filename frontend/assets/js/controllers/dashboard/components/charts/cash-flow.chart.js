// assets/js/controllers/dashboard/components/charts/cash-flow.chart.js
import { ChartBase } from "./chart-base.component.js";

export class CashFlowChart extends ChartBase {
  constructor(services) {
    super(
      services,
      "cash-flow-chart",
      "💰 Flujo de Caja",
      "Ingresos vs Egresos últimos 15 días",
      "400px"
    );
    this.period = 15;
  }

  async init() {
    try {
      await this.renderChart();
      console.log("✅ Gráfico de flujo de caja inicializado");
    } catch (error) {
      console.error("❌ Error inicializando gráfico de flujo de caja:", error);
      this.showErrorState();
    }
  }

  async renderChart() {
    const data = await this.getChartData();
    this.createChart(data);
  }

  async getChartData() {
    try {
      console.log("📊 Obteniendo datos de caja para gráfico...");
      const sales = await this.services.sales.getAllSales();
      const lastNDays = this.getLastNDays(this.period);

      const dailyData = lastNDays.map((day) => {
        const daySales = sales.filter((sale) => {
          if (!sale.date) return false;
          const saleDate = new Date(sale.date);
          return this.isSameDay(saleDate, day);
        });

        const ingresos = daySales.reduce(
          (sum, sale) => sum + (sale.total || 0),
          0
        );
        // Simular egresos (en un sistema real vendrían de gastos/compras)
        const egresos = ingresos * (0.3 + Math.random() * 0.3); // 30-60% de ingresos
        const neto = ingresos - egresos;

        return {
          date: day,
          ingresos,
          egresos,
          neto,
          formattedDate: this.formatDate(day, "short"),
        };
      });

      console.log("💰 Datos de flujo procesados:", dailyData.length, "días");
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
    const ingresosData = data.map((d) => d.ingresos);
    const egresosData = data.map((d) => d.egresos);
    const netoData = data.map((d) => d.neto);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Ingresos",
            data: ingresosData,
            backgroundColor: this.getColor(2, 0.7), // Verde
            borderColor: this.getColor(2),
            borderWidth: 1,
            yAxisID: "y",
          },
          {
            label: "Egresos",
            data: egresosData,
            backgroundColor: this.getColor(3, 0.7), // Naranja
            borderColor: this.getColor(3),
            borderWidth: 1,
            yAxisID: "y",
          },
          {
            label: "Neto",
            data: netoData,
            type: "line",
            borderColor: this.getColor(0),
            backgroundColor: "transparent",
            borderWidth: 3,
            tension: 0.4,
            fill: false,
            yAxisID: "y",
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
                return ` ${label}: $${value.toLocaleString("es-ES")}`;
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
            beginAtZero: true,
            title: {
              display: true,
              text: "Monto ($)",
            },
            ticks: {
              callback: function (value) {
                return "$" + value.toLocaleString("es-ES");
              },
            },
          },
        },
      },
    });
  }

  getMockData() {
    console.log("🔄 Generando datos de prueba para flujo de caja...");
    const dates = this.getLastNDays(this.period);
    const baseIngresos = 10000;

    return dates.map((date, index) => {
      const trend = index * 500;
      const randomVariation = (Math.random() - 0.5) * 4000;
      const dayOfWeekEffect =
        date.getDay() === 0 ? -2000 : date.getDay() === 6 ? 1000 : 0;

      const ingresos = baseIngresos + trend + randomVariation + dayOfWeekEffect;
      const egresos = ingresos * (0.4 + Math.random() * 0.2); // 40-60% de ingresos
      const neto = ingresos - egresos;

      return {
        date,
        ingresos: Math.max(2000, ingresos),
        egresos: Math.max(1000, egresos),
        neto,
        formattedDate: this.formatDate(date, "short"),
      };
    });
  }

  async refresh() {
    console.log("🔄 Actualizando gráfico de flujo de caja...");
    await this.renderChart();
  }
}

export default CashFlowChart;
