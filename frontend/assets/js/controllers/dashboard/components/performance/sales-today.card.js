export default class SalesTodayCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-3 col-md-6") {
    console.log("🔄 Renderizando SalesTodayCard...");

    // 🔴 SOLUCIÓN TEMPORAL - DATOS FIJOS
    const todayRevenue = 12500.5;
    const salesCount = 8;

    return `
            <div class="${colClass} mb-4">
                <div class="card card-dashboard sales-card" data-card="sales-today">
                    <div class="card-body p-3">
                        <div class="row">
                            <div class="col-8">
                                <div class="numbers">
                                    <p class="text-sm mb-0 text-uppercase font-weight-bold">Ventas Hoy</p>
                                    <h4 class="font-weight-bolder mb-0 text-success">
                                        $${todayRevenue.toLocaleString("es-AR")}
                                    </h4>
                                    <p class="mb-0">
                                        <span class="text-success text-sm font-weight-bolder">
                                            ${salesCount} transacciones
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div class="col-4 text-end">
                                <div class="icon icon-shape bg-gradient-success shadow-success text-center rounded-circle">
                                    <i class="material-icons opacity-10">trending_up</i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  async refresh(advancedMetrics) {
    console.log("🔄 SalesTodayCard refrescada");
  }

  setupEvents(element) {
    console.log("⚡ Configurando eventos para SalesTodayCard");
    element.addEventListener("click", () => {
      console.log("🎯 Click en SalesTodayCard");
      window.location.hash = "sales";
    });
    element.style.cursor = "pointer";
  }
}
