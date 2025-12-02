export default class StockAlertsCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-4 col-md-6") {
    console.log("🔄 Renderizando StockAlertsCard...");

    // 🔴 SOLUCIÓN TEMPORAL - DATOS FIJOS
    const totalAlerts = 3;
    const criticalStock = 2;
    const outOfStock = 1;
    const alertClass = totalAlerts > 0 ? "text-danger" : "text-success";

    return `
            <div class="${colClass} mb-4">
                <div class="card card-dashboard stock-card" data-card="stock-alerts">
                    <div class="card-body p-3">
                        <div class="row">
                            <div class="col-8">
                                <div class="numbers">
                                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Alertas Stock</p>
                                    <h4 class="font-weight-bolder mb-0 ${alertClass}">
                                        ${totalAlerts}
                                    </h4>
                                    <p class="mb-0">
                                        <span class="${alertClass} text-sm font-weight-bolder">
                                            productos críticos
                                        </span>
                                    </p>
                                    <small class="text-muted">
                                        ${criticalStock} bajo stock • ${outOfStock} sin stock
                                    </small>
                                </div>
                            </div>
                            <div class="col-4 text-end">
                                <div class="icon icon-shape bg-gradient-danger shadow-danger text-center rounded-circle">
                                    <i class="material-icons opacity-10">warning</i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  async refresh(advancedMetrics) {
    console.log("🔄 StockAlertsCard refrescada");
  }

  setupEvents(element) {
    console.log("⚡ Configurando eventos para StockAlertsCard");
    element.addEventListener("click", () => {
      console.log("🎯 Click en StockAlertsCard");
      window.location.hash = "products";
    });
    element.style.cursor = "pointer";
  }
}
