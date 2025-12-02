// assets/js/controllers/dashboard/components/inventory/abc-analysis.card.js
export default class ABCAnalysisCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-4 col-md-6") {
    const abc = this.metrics.abcAnalysis || { A: 0, B: 0, C: 0 };
    const totalProducts = this.metrics.baseData.products?.length || 0;

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard abc-card" data-card="abc-analysis">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Análisis ABC</p>
                  <div class="d-flex justify-content-between mb-2">
                    <span class="badge bg-primary">A: ${abc.A}</span>
                    <span class="badge bg-info">B: ${abc.B}</span>
                    <span class="badge bg-secondary">C: ${abc.C}</span>
                  </div>
                  <p class="mb-0">
                    <span class="text-info text-sm font-weight-bolder">
                      clasificación valor
                    </span>
                  </p>
                  <small class="text-muted">${totalProducts} productos total</small>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-dark shadow-dark text-center rounded-circle">
                  <i class="material-icons opacity-10">analytics</i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async refresh(advancedMetrics) {
    this.metrics = advancedMetrics;
    console.log("🔄 ABCAnalysisCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "products";
    });
    element.style.cursor = "pointer";
  }
}
