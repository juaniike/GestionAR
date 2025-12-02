// assets/js/controllers/dashboard/components/finance/cash-status.card.js
export default class CashStatusCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    const cashStatus = this.metrics.baseData.cashStatus;
    const isOpen = !!cashStatus;
    const amount = cashStatus ? parseFloat(cashStatus.startingcash) || 0 : 0;

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard cash-card" data-card="cash-status">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Estado Caja</p>
                  <h4 class="font-weight-bolder mb-0 ${
                    isOpen ? "text-success" : "text-warning"
                  }">
                    ${isOpen ? "ABIERTA" : "CERRADA"}
                  </h4>
                  <p class="mb-0">
                    <span class="${
                      isOpen ? "text-success" : "text-warning"
                    } text-sm font-weight-bolder">
                      ${isOpen ? "Operaciones activas" : "Sin operaciones"}
                    </span>
                  </p>
                  ${
                    isOpen
                      ? `<small class="text-muted">Monto: $${amount.toFixed(
                          2
                        )}</small>`
                      : ""
                  }
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape ${
                  isOpen
                    ? "bg-gradient-success shadow-success"
                    : "bg-gradient-secondary shadow-secondary"
                } text-center rounded-circle">
                  <i class="material-icons opacity-10">account_balance</i>
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
    console.log("🔄 CashStatusCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "cash-register";
    });
    element.style.cursor = "pointer";
  }
}
