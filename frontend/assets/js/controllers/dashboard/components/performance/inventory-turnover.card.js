// assets/js/controllers/dashboard/components/performance/inventory-turnover.card.js
export default class InventoryTurnoverCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    const turnover = this.metrics.inventoryTurnover || 0;
    const turnoverClass =
      turnover >= 1
        ? "text-success"
        : turnover >= 0.5
        ? "text-warning"
        : "text-danger";

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard turnover-card" data-card="inventory-turnover">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Rotación Inventario</p>
                  <h4 class="font-weight-bolder mb-0 ${turnoverClass}">
                    ${turnover.toFixed(1)}x
                  </h4>
                  <p class="mb-0">
                    <span class="${turnoverClass} text-sm font-weight-bolder">
                      veces por mes
                    </span>
                  </p>
                  <small class="text-muted">
                    ${this.getTurnoverStatus(turnover)}
                  </small>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-primary shadow-primary text-center rounded-circle">
                  <i class="material-icons opacity-10">cached</i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getTurnoverStatus(turnover) {
    if (turnover >= 1) return "Alta rotación";
    if (turnover >= 0.5) return "Rotación media";
    return "Baja rotación";
  }

  async refresh(advancedMetrics) {
    this.metrics = advancedMetrics;
    console.log("🔄 InventoryTurnoverCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "products";
    });
    element.style.cursor = "pointer";
  }
}
