// assets/js/controllers/dashboard/components/finance/overall-efficiency.card.js
export default class OverallEfficiencyCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    const efficiency = this.calculateOverallEfficiency();
    const efficiencyClass =
      efficiency >= 80
        ? "text-success"
        : efficiency >= 60
        ? "text-warning"
        : "text-danger";

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard efficiency-card" data-card="overall-efficiency">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Eficiencia General</p>
                  <h4 class="font-weight-bolder mb-0 ${efficiencyClass}">
                    ${efficiency.toFixed(1)}%
                  </h4>
                  <p class="mb-0">
                    <span class="${efficiencyClass} text-sm font-weight-bolder">
                      desempeño sistema
                    </span>
                  </p>
                  <small class="text-muted">combinado múltiples métricas</small>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-primary shadow-primary text-center rounded-circle">
                  <i class="material-icons opacity-10">speed</i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  calculateOverallEfficiency() {
    const metrics = this.metrics;
    let score = 0;

    // Margen de ganancia (0-25 puntos)
    if (metrics.profitMargin > 0) score += Math.min(25, metrics.profitMargin);

    // Rotación inventario (0-25 puntos)
    if (metrics.inventoryTurnover > 0)
      score += Math.min(25, metrics.inventoryTurnover * 10);

    // Ticket promedio (0-25 puntos) - asumiendo que > $100 es bueno
    if (metrics.averageTicket > 0)
      score += Math.min(25, (metrics.averageTicket / 100) * 25);

    // Estado caja (0-25 puntos)
    if (this.metrics.baseData.cashStatus) score += 25;

    return Math.min(100, score);
  }

  async refresh(advancedMetrics) {
    this.metrics = advancedMetrics;
    console.log("🔄 OverallEfficiencyCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      const metrics = this.metrics;
      const message = `
        📊 Detalles de Eficiencia:
        
        • Margen Ganancia: ${metrics.profitMargin?.toFixed(1)}%
        • Rotación Inventario: ${metrics.inventoryTurnover?.toFixed(1)}x
        • Ticket Promedio: $${metrics.averageTicket?.toFixed(2)}
        • Caja: ${this.metrics.baseData.cashStatus ? "Abierta" : "Cerrada"}
        
        Puntuación: ${this.calculateOverallEfficiency().toFixed(1)}%
      `;

      // Usar el sistema de alertas global
      if (typeof showAlert === "function") {
        showAlert(message, "info", 5000);
      } else {
        alert(message);
      }
    });
    element.style.cursor = "pointer";
  }
}
