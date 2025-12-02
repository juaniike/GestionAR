// assets/js/controllers/dashboard/components/inventory/inventory-value.card.js
export default class InventoryValueCard {
  constructor(services, advancedMetrics) {
    this.services = services;
    this.metrics = advancedMetrics;
  }

  async render(colClass = "col-xl-4 col-md-6") {
    const inventoryValue = this.metrics.inventoryValue || 0;
    const totalProducts = this.metrics.baseData.products?.length || 0;

    return `
      <div class="${colClass} mb-4">
        <div class="card card-dashboard inventory-card" data-card="inventory-value">
          <div class="card-body p-3">
            <div class="row">
              <div class="col-8">
                <div class="numbers">
                  <p class="text-sm mb-0 text-uppercase font-weight-bold">Valor Inventario</p>
                  <h4 class="font-weight-bolder mb-0 text-success">
                    $${inventoryValue.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </h4>
                  <p class="mb-0">
                    <span class="text-success text-sm font-weight-bolder">
                      valor total
                    </span>
                  </p>
                  <small class="text-muted">${totalProducts} productos</small>
                </div>
              </div>
              <div class="col-4 text-end">
                <div class="icon icon-shape bg-gradient-success shadow-success text-center rounded-circle">
                  <i class="material-icons opacity-10">inventory</i>
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
    console.log("🔄 InventoryValueCard refrescada");
  }

  setupEvents(element) {
    element.addEventListener("click", () => {
      window.location.hash = "products";
    });
    element.style.cursor = "pointer";
  }
}
