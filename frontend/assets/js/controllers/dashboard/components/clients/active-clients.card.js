export default class ActiveClientsCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    console.log("🔄 Renderizando ActiveClientsCard...");

    // 🔴 SOLUCIÓN TEMPORAL - DATOS FIJOS
    const activeClients = 45;
    const totalClients = 62;
    const retentionRate = 72.5;
    const retentionClass = "text-warning";

    return `
            <div class="${colClass} mb-4">
                <div class="card card-dashboard clients-card" data-card="active-clients">
                    <div class="card-body p-3">
                        <div class="row">
                            <div class="col-8">
                                <div class="numbers">
                                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Clientes Activos</p>
                                    <h4 class="font-weight-bolder mb-0 text-info">
                                        ${activeClients}
                                    </h4>
                                    <p class="mb-0">
                                        <span class="text-info text-sm font-weight-bolder">
                                            de ${totalClients} total
                                        </span>
                                    </p>
                                    <small class="${retentionClass}">
                                        ${retentionRate.toFixed(1)}% retención
                                    </small>
                                </div>
                            </div>
                            <div class="col-4 text-end">
                                <div class="icon icon-shape bg-gradient-info shadow-info text-center rounded-circle">
                                    <i class="material-icons opacity-10">people</i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  async refresh(advancedMetrics) {
    console.log("🔄 ActiveClientsCard refrescada");
  }

  setupEvents(element) {
    console.log("⚡ Configurando eventos para ActiveClientsCard");
    element.addEventListener("click", () => {
      console.log("🎯 Click en ActiveClientsCard");
      window.location.hash = "clients";
    });
    element.style.cursor = "pointer";
  }
}
