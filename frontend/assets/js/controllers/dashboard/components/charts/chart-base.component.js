// assets/js/controllers/dashboard/components/charts/chart-base.component.js
export class ChartBase {
  constructor(services, chartId, title, description = "", height = "400px") {
    this.services = services;
    this.chartId = chartId;
    this.title = title;
    this.description = description;
    this.height = height; // ✅ ALTURA PERSONALIZABLE
    this.chart = null;

    if (typeof Chart === "undefined") {
      console.error("❌ Chart.js no está cargado");
      throw new Error("Chart.js es requerido para los gráficos");
    }
  }

  async render(containerClass = "col-12") {
    return `
      <div class="${containerClass} mb-4">
        <div class="card h-100">
          <div class="card-header pb-0">
            <h6 class="mb-1">${this.title}</h6>
            ${
              this.description
                ? `
              <p class="text-sm text-muted mb-0">
                <i class="material-icons text-sm me-1">info</i>
                ${this.description}
              </p>
            `
                : ""
            }
          </div>
          <div class="card-body p-3">
            <!-- ✅ USA LA ALTURA PERSONALIZADA -->
            <div class="chart-container" style="position: relative; height: ${
              this.height
            }; width: 100%; min-height: 300px;">
              <canvas id="${this.chartId}" 
                      style="display: block; box-sizing: border-box; height: 100%; width: 100%;"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  formatDate(date, format = "short") {
    const options = {
      short: { day: "2-digit", month: "2-digit" },
      medium: { day: "2-digit", month: "short" },
      long: { weekday: "short", day: "2-digit", month: "short" },
    };
    return new Intl.DateTimeFormat("es-ES", options[format]).format(date);
  }

  getColor(index, opacity = 1) {
    const colors = [
      `rgba(94, 114, 228, ${opacity})`,
      `rgba(33, 150, 243, ${opacity})`,
      `rgba(76, 175, 80, ${opacity})`,
      `rgba(255, 152, 0, ${opacity})`,
      `rgba(156, 39, 176, ${opacity})`,
      `rgba(233, 30, 99, ${opacity})`,
      `rgba(0, 150, 136, ${opacity})`,
    ];
    return colors[index % colors.length];
  }

  getLastNDays(days, includeToday = true) {
    const dates = [];
    const start = includeToday ? days - 1 : days;
    for (let i = start; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    return dates;
  }

  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  isSameMonth(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth()
    );
  }

  showErrorState(message = "Error cargando gráfico") {
    const canvas = document.getElementById(this.chartId);
    if (canvas && canvas.getContext) {
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#6c757d";
      ctx.textAlign = "center";
      ctx.font = "14px Arial";
      ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }
  }
}

export default ChartBase;
