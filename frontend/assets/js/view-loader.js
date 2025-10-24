// assets/js/view-loader.js
export class ViewLoader {
  static async loadView(viewName) {
    try {
      console.log(`🔄 Cargando vista: ${viewName}`);

      let viewUrl = "";
      switch (viewName) {
        case "dashboard":
          viewUrl = "components/dashboard-view.html";
          break;
        case "products":
          viewUrl = "components/products-panel.html";
          break;
        case "sales":
          viewUrl = "components/sales-view.html";
          break;
        case "clients":
          viewUrl = "components/clients-view.html";
          break;
        case "cash":
          viewUrl = "components/cash-view.html";
          break;
        default:
          viewUrl = "components/dashboard-view.html";
      }

      const response = await fetch(viewUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      document.getElementById("view-container").innerHTML = html;

      console.log(`✅ Vista ${viewName} cargada`);
      return true;
    } catch (error) {
      console.error(`❌ Error cargando vista ${viewName}:`, error);
      return false;
    }
  }

  static showLoading() {
    document.getElementById("view-container").innerHTML = `
            <div class="container-fluid py-4">
                <div class="row">
                    <div class="col-12 d-flex justify-content-center align-items-center" style="height: 400px">
                        <div class="text-center">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                            <p class="mt-2">Cargando...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }
}
