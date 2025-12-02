// assets/js/controllers/dashboard/components/performance/profit-margin.card.js
export default class ProfitMarginCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    const profitMargin = this.metrics.profitMargin || 0;
    const marginClass =
      profitMargin >= 20
        ? "text-success"
        : profitMargin >= 10
        ? "text-warning"
        : "text-danger";

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard margin-card" data-card="profit-margin">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Margen Ganancia</p>
                  <h4 class="font-weight-bolder mb-0 ${marginClass}">
                    ${profitMargin.toFixed(1)}%
                  </h4>
                  <p class="mb-0">
                    <span class="${marginClass} text-sm font-weight-bolder">
                      sobre ventas
                    </span>
                  </p>
                  <small class="text-muted">
                    ${this.getMarginStatus(profitMargin)}
                  </small>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-warning shadow-warning text-center rounded-circle">
                  <i class="material-icons opacity-10">attach_money</i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  getMarginStatus(margin) {
    if (margin >= 20) return "Excelente";
    if (margin >= 10) return "Bueno";
    if (margin > 0) return "Regular";
    return "Sin ganancia";
  }

  async refresh(advancedMetrics) {
    this.metrics = advancedMetrics;
    console.log("🔄 ProfitMarginCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "sales";
    });
    element.style.cursor = "pointer";
  }
}
