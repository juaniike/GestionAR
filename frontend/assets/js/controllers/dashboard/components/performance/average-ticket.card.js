// assets/js/controllers/dashboard/components/performance/average-ticket.card.js
export default class AverageTicketCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    const averageTicket = this.metrics.averageTicket || 0;

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard ticket-card" data-card="average-ticket">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Ticket Promedio</p>
                  <h4 class="font-weight-bolder mb-0 text-info">
                    $${averageTicket.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h4>
                  <p class="mb-0">
                    <span class="text-info text-sm font-weight-bolder">
                      por transacción
                    </span>
                  </p>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-info shadow-info text-center rounded-circle">
                  <i class="material-icons opacity-10">receipt</i>
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
    console.log("🔄 AverageTicketCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "sales";
    });
    element.style.cursor = "pointer";
  }
}
