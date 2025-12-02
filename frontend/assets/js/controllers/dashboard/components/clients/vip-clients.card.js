// assets/js/controllers/dashboard/components/clients/vip-clients.card.js
export default class VIPClientsCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    const vipClients = this.metrics.vipClients || 0;
    const totalClients = this.metrics.baseData.metrics?.totalClients || 0;
    const vipPercentage =
      totalClients > 0 ? (vipClients / totalClients) * 100 : 0;

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard vip-card" data-card="vip-clients">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Clientes VIP</p>
                  <h4 class="font-weight-bolder mb-0 text-warning">
                    ${vipClients}
                  </h4>
                  <p class="mb-0">
                    <span class="text-warning text-sm font-weight-bolder">
                      top 20% por gasto
                    </span>
                  </p>
                  <small class="text-muted">
                    ${vipPercentage.toFixed(1)}% del total
                  </small>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-warning shadow-warning text-center rounded-circle">
                  <i class="material-icons opacity-10">star</i>
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
    console.log("🔄 VIPClientsCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "clients";
    });
    element.style.cursor = "pointer";
  }
}
