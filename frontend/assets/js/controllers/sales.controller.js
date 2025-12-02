import { showAlert, showConfirm } from "../plugins/alerts.js";

class SalesController {
  constructor(salesService, authService, dashboardService) {
    this.salesService = salesService;
    this.authService = authService;
    this.dashboardService = dashboardService;

    this.allSales = [];
    this.filteredSales = [];
    this.currentFilters = {};
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.eventListeners = [];

    console.log("🧾 [SalesController] Controlador de ventas inicializado");
  }

  async init() {
    console.log("🚀 [SalesController] Inicializando módulo de ventas...");

    const user = this.authService.getUser();
    if (!user) {
      this.showError("Usuario no autenticado");
      return;
    }

    try {
      // Cargar componentes estructurales
      await this.loadComponents();

      // Configurar eventos
      this.initSalesEvents();

      // Cargar datos iniciales
      await this.loadInitialData();

      console.log(
        "✅ [SalesController] Módulo de ventas inicializado correctamente"
      );
    } catch (error) {
      console.error("❌ [SalesController] Error inicializando:", error);
      this.showError("Error al cargar el módulo de ventas");
    }
  }

  async loadComponents() {
    try {
      await Promise.all([
        this.loadComponent("sidenav-container", "./components/sidenav.html"),
        this.loadComponent("navbar-container", "./components/navbar.html"),
        this.loadComponent("footer-container", "./components/footer.html"),
      ]);
      console.log("✅ [SalesController] Componentes cargados");
    } catch (error) {
      console.error("❌ [SalesController] Error cargando componentes:", error);
    }
  }

  async loadComponent(id, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = html;
      }
    } catch (error) {
      console.error(`❌ [SalesController] Error cargando ${id}:`, error);
    }
  }

  initSalesEvents() {
    this.cleanupEventListeners();

    // Filtros
    this.setupButton("btn-aplicar-filtros", () => this.applyFilters());
    this.setupButton("btn-limpiar-filtros", () => this.clearFilters());

    // Botones de acción
    this.setupButton("btn-refresh", () =>
      this.loadSalesData(this.currentFilters)
    );
    this.setupButton("btn-nueva-venta", () => this.navigateToDashboard());
    this.setupButton("btn-consolidado", () => this.showConsolidatedView());
    this.setupButton("btn-reporte-diario", () => this.showDailyReport());

    // Búsqueda en tiempo real
    this.setupInput(
      "filtro-cliente",
      "input",
      this.debounce(() => this.applyFilters(), 500)
    );

    console.log("✅ [SalesController] Eventos configurados");
  }

  setupButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", handler);
      this.eventListeners.push({ element: button, event: "click", handler });
    }
  }

  setupInput(inputId, eventType, handler) {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener(eventType, handler);
      this.eventListeners.push({ element: input, event: eventType, handler });
    }
  }

  async loadInitialData() {
    try {
      await Promise.all([
        this.loadSalesData(),
        this.loadSummaryCards(),
        this.loadUsersForFilter(),
      ]);
      console.log("✅ [SalesController] Datos iniciales cargados");
    } catch (error) {
      console.error(
        "❌ [SalesController] Error cargando datos iniciales:",
        error
      );
      this.showError("Error cargando datos iniciales");
    }
  }

  async loadSalesData(filters = {}) {
    try {
      this.setLoadingState(true);

      console.log("🧾 [SalesController] Cargando ventas...");

      // ✅ USAR salesService inyectado
      this.allSales = await this.salesService.getAllSales(filters);
      this.filteredSales = [...this.allSales];

      console.log(
        `✅ [SalesController] ${this.allSales.length} ventas cargadas`
      );
      this.renderSalesTable();
      this.updatePaginationInfo();
    } catch (error) {
      console.error("❌ [SalesController] Error cargando ventas:", error);
      this.showError("Error al cargar las ventas");
      this.allSales = [];
      this.filteredSales = [];
      this.renderSalesTable();
    } finally {
      this.setLoadingState(false);
    }
  }

  async loadSummaryCards() {
    try {
      console.log("📊 [SalesController] Cargando resumen...");

      // ✅ USAR salesService inyectado
      const consolidatedData = await this.salesService.getConsolidatedData();
      this.updateSummaryCards(consolidatedData);

      console.log("✅ [SalesController] Resumen cargado");
    } catch (error) {
      console.error("❌ [SalesController] Error cargando resumen:", error);
      this.updateSummaryCardsWithDefaults();
    }
  }

  async loadUsersForFilter() {
    try {
      console.log("👥 [SalesController] Cargando usuarios...");
      // Por ahora simulamos usuarios, luego integrar con servicio de usuarios
      const mockUsers = [
        { id: 1, username: "Admin", role: "owner" },
        { id: 2, username: "Vendedor1", role: "employee" },
      ];
      this.populateUserFilter(mockUsers);
    } catch (error) {
      console.error("❌ [SalesController] Error cargando usuarios:", error);
    }
  }

  renderSalesTable() {
    const tbody = document.getElementById("ventas-table-body");
    const tableInfo = document.getElementById("table-info");

    if (!tbody) {
      console.error("❌ [SalesController] No se encontró el tbody de la tabla");
      return;
    }

    if (this.filteredSales.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="d-flex flex-column align-items-center">
                            <i class="material-icons text-muted mb-2" style="font-size: 3rem;">receipt</i>
                            <p class="text-muted mb-0">No se encontraron ventas</p>
                            <small class="text-muted">Intenta ajustar los filtros</small>
                        </div>
                    </td>
                </tr>
            `;
      if (tableInfo) tableInfo.textContent = "No se encontraron ventas";
      return;
    }

    tbody.innerHTML = this.filteredSales
      .map(
        (sale) => `
                <tr>
                    <td>
                        <div class="d-flex px-2 py-1">
                            <div class="d-flex flex-column justify-content-center">
                                <h6 class="mb-0 text-sm">#${sale.id}</h6>
                            </div>
                        </div>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0">${this.salesService.formatSaleDate(
                          sale.date
                        )}</p>
                        <p class="text-xs text-muted mb-0">${this.salesService.formatSaleTime(
                          sale.date
                        )}</p>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0">Usuario ${
                          sale.userid
                        }</p>
                        <p class="text-xs text-muted mb-0">ID: ${
                          sale.userid
                        }</p>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0">$${parseFloat(
                          sale.total || 0
                        ).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</p>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0 profit-positive">$${parseFloat(
                          sale.profit || 0
                        ).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</p>
                    </td>
                    <td>
                        <span class="payment-badge">${this.salesService.getPaymentMethodText(
                          sale.paymentmethod
                        )}</span>
                    </td>
                    <td>
                        <span class="status-badge status-${
                          sale.status
                        }">${this.salesService.getStatusText(
          sale.status
        )}</span>
                    </td>
                    <td class="align-middle">
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary view-sale" data-sale-id="${
                              sale.id
                            }" title="Ver detalle">
                                <i class="material-icons" style="font-size: 16px;">visibility</i>
                            </button>
                            <button class="btn btn-sm btn-outline-success ticket-sale" data-sale-id="${
                              sale.id
                            }" title="Generar ticket">
                                <i class="material-icons" style="font-size: 16px;">receipt</i>
                            </button>
                            ${
                              this.authService.getUser()?.role === "owner"
                                ? `
                                <button class="btn btn-sm btn-outline-danger cancel-sale" data-sale-id="${
                                  sale.id
                                }" title="Cancelar venta" ${
                                    sale.status === "canceled" ? "disabled" : ""
                                  }>
                                    <i class="material-icons" style="font-size: 16px;">cancel</i>
                                </button>
                            `
                                : ""
                            }
                        </div>
                    </td>
                </tr>
            `
      )
      .join("");

    if (tableInfo) {
      tableInfo.textContent = `Mostrando ${this.filteredSales.length} ventas`;
    }

    this.attachTableEventListeners();
    console.log("✅ [SalesController] Tabla de ventas renderizada");
  }

  attachTableEventListeners() {
    // Ver detalle
    document.querySelectorAll(".view-sale").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const saleId = e.currentTarget.getAttribute("data-sale-id");
        this.showSaleDetail(saleId);
      });
    });

    // Generar ticket
    document.querySelectorAll(".ticket-sale").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const saleId = e.currentTarget.getAttribute("data-sale-id");
        this.generateTicket(saleId);
      });
    });

    // Cancelar venta (solo owners)
    document.querySelectorAll(".cancel-sale").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const saleId = e.currentTarget.getAttribute("data-sale-id");
        this.cancelSale(saleId);
      });
    });
  }

  applyFilters() {
    const filters = {
      fechaDesde: document.getElementById("fecha-desde")?.value,
      fechaHasta: document.getElementById("fecha-hasta")?.value,
      metodo: document.getElementById("filtro-metodo")?.value,
      estado: document.getElementById("filtro-estado")?.value,
      usuario: document.getElementById("filtro-usuario")?.value,
      cliente: document.getElementById("filtro-cliente")?.value,
    };

    this.currentFilters = filters;
    this.currentPage = 1;

    console.log("🔍 [SalesController] Aplicando filtros:", filters);
    this.filterSales(filters);
  }

  filterSales(filters) {
    this.filteredSales = this.allSales.filter((sale) => {
      // Filtro por método de pago
      if (filters.metodo && sale.paymentmethod !== filters.metodo) return false;

      // Filtro por estado
      if (filters.estado && sale.status !== filters.estado) return false;

      // Filtro por usuario
      if (filters.usuario && sale.userid !== parseInt(filters.usuario))
        return false;

      // Filtro por fecha
      if (filters.fechaDesde || filters.fechaHasta) {
        const saleDate = new Date(sale.date);
        if (filters.fechaDesde && saleDate < new Date(filters.fechaDesde))
          return false;
        if (filters.fechaHasta) {
          const hastaDate = new Date(filters.fechaHasta);
          hastaDate.setHours(23, 59, 59);
          if (saleDate > hastaDate) return false;
        }
      }

      return true;
    });

    this.renderSalesTable();
    this.updatePaginationInfo();
  }

  clearFilters() {
    document.getElementById("fecha-desde").value = "";
    document.getElementById("fecha-hasta").value = "";
    document.getElementById("filtro-metodo").value = "";
    document.getElementById("filtro-estado").value = "";
    document.getElementById("filtro-usuario").value = "";
    document.getElementById("filtro-cliente").value = "";

    this.currentFilters = {};
    this.currentPage = 1;
    this.loadSalesData();
    showAlert("Filtros limpiados", "info", 2000);
  }

  async showSaleDetail(saleId) {
    try {
      console.log(
        `🔍 [SalesController] Cargando detalle de venta #${saleId}...`
      );

      // ✅ USAR salesService inyectado
      const sale = await this.salesService.getSaleById(saleId);
      const saleItems = await this.salesService.getSaleItems(saleId);

      this.renderSaleDetailModal(sale, saleItems);
    } catch (error) {
      console.error("❌ [SalesController] Error cargando detalle:", error);
      showAlert("Error al cargar el detalle de la venta", "error");
    }
  }

  renderSaleDetailModal(sale, items) {
    const modalElement = document.getElementById("detalle-venta-modal");
    if (!modalElement) {
      console.error("❌ [SalesController] Modal no encontrado");
      return;
    }

    const modal = new bootstrap.Modal(modalElement);
    const content = document.getElementById("detalle-venta-content");
    const saleIdElement = document.getElementById("detalle-venta-id");
    const cancelBtn = document.getElementById("btn-cancelar-venta");

    if (saleIdElement) saleIdElement.textContent = sale.id;

    if (content) {
      content.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Información de la Venta</h6>
                        <table class="table table-sm">
                            <tr><td><strong>ID:</strong></td><td>#${
                              sale.id
                            }</td></tr>
                            <tr><td><strong>Fecha:</strong></td><td>${this.salesService.formatSaleDate(
                              sale.date
                            )} ${this.salesService.formatSaleTime(
        sale.date
      )}</td></tr>
                            <tr><td><strong>Usuario:</strong></td><td>ID ${
                              sale.userid
                            }</td></tr>
                            <tr><td><strong>Método Pago:</strong></td><td>${this.salesService.getPaymentMethodText(
                              sale.paymentmethod
                            )}</td></tr>
                            <tr><td><strong>Estado:</strong></td><td><span class="status-badge status-${
                              sale.status
                            }">${this.salesService.getStatusText(
        sale.status
      )}</span></td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6>Totales</h6>
                        <table class="table table-sm">
                            <tr><td><strong>Total Venta:</strong></td><td>$${parseFloat(
                              sale.total || 0
                            ).toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}</td></tr>
                            <tr><td><strong>Ganancia:</strong></td><td class="profit-positive">$${parseFloat(
                              sale.profit || 0
                            ).toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}</td></tr>
                        </table>
                    </div>
                </div>
                
                <div class="row mt-4">
                    <div class="col-12">
                        <h6>Productos Vendidos</h6>
                        <div class="table-responsive">
                            <table class="table table-sm table-striped">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio Unit.</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${items
                                      .map(
                                        (item) => `
                                        <tr>
                                            <td>${
                                              item.Product?.name || "Producto"
                                            }</td>
                                            <td>${item.quantity}</td>
                                            <td>$${parseFloat(
                                              item.unitprice || 0
                                            ).toLocaleString("es-AR", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}</td>
                                            <td>$${parseFloat(
                                              item.totalprice || 0
                                            ).toLocaleString("es-AR", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}</td>
                                        </tr>
                                    `
                                      )
                                      .join("")}
                                    <tr class="table-primary">
                                        <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                        <td><strong>$${parseFloat(
                                          sale.total || 0
                                        ).toLocaleString("es-AR", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}</strong></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
    }

    // Mostrar/ocultar botón de cancelar
    if (cancelBtn) {
      cancelBtn.style.display =
        this.authService.getUser()?.role === "owner" &&
        sale.status !== "canceled"
          ? "block"
          : "none";
      cancelBtn.onclick = () => this.cancelSale(sale.id);
    }

    modal.show();
  }

  async generateTicket(saleId) {
    try {
      showAlert("Generando ticket...", "info", 2000);

      // ✅ USAR salesService inyectado
      const ticket = await this.salesService.generateTicket(saleId);

      showAlert("Ticket generado correctamente", "success");
      console.log("✅ [SalesController] Ticket generado:", ticket);
    } catch (error) {
      console.error("❌ [SalesController] Error generando ticket:", error);
      showAlert("Error al generar el ticket", "error");
    }
  }

  async cancelSale(saleId) {
    const confirmed = await showConfirm(
      "¿Estás seguro de que deseas cancelar esta venta? Esta acción no se puede deshacer.",
      () => {},
      () => {}
    );

    if (!confirmed) return;

    try {
      showAlert("Cancelando venta...", "warning");

      // ✅ USAR salesService inyectado
      await this.salesService.cancelSale(saleId);

      showAlert("Venta cancelada correctamente", "success");
      this.loadSalesData(this.currentFilters);

      console.log("✅ [SalesController] Venta cancelada correctamente");
    } catch (error) {
      console.error("❌ [SalesController] Error cancelando venta:", error);
      showAlert("Error al cancelar la venta", "error");
    }
  }

  async showConsolidatedView() {
    try {
      showAlert("Cargando vista consolidada...", "info");

      // ✅ USAR salesService inyectado
      const consolidatedData = await this.salesService.getConsolidatedData();
      this.renderConsolidatedView(consolidatedData);
    } catch (error) {
      console.error(
        "❌ [SalesController] Error cargando vista consolidada:",
        error
      );
      showAlert("No tienes permisos para ver esta información", "error");
    }
  }

  renderConsolidatedView(data) {
    const modalElement = document.getElementById("consolidado-modal");
    const content = document.getElementById("consolidado-content");

    if (!modalElement || !content) {
      console.error("❌ [SalesController] Elementos del modal no encontrados");
      return;
    }

    const modal = new bootstrap.Modal(modalElement);

    content.innerHTML = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0">Resumen Consolidado</h6>
                        </div>
                        <div class="card-body">
                            <h6>Ventas por Caja</h6>
                            ${
                              Array.isArray(data)
                                ? data
                                    .map(
                                      (item) => `
                                <div class="d-flex justify-content-between border-bottom py-2">
                                    <span>Caja ${item.cashregister_id}</span>
                                    <strong>$${parseFloat(
                                      item.totalSalesByCash || 0
                                    ).toLocaleString("es-AR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}</strong>
                                </div>
                            `
                                    )
                                    .join("")
                                : '<p class="text-muted">No hay datos disponibles</p>'
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;

    modal.show();
  }

  async showDailyReport() {
    try {
      showAlert("Generando reporte diario...", "info");

      // ✅ USAR salesService inyectado
      const report = await this.salesService.getDailyReport();

      showAlert("Reporte diario generado correctamente", "success");
      console.log("✅ [SalesController] Reporte diario:", report);
    } catch (error) {
      console.error("❌ [SalesController] Error generando reporte:", error);
      showAlert("Error al generar el reporte diario", "error");
    }
  }

  // ✅ ACTUALIZADO: Redirigir a home con parámetro para abrir formulario
  navigateToDashboard() {
    window.location.hash = "home?action=auto-open-sales-form";
    console.log(
      "🛒 [SalesController] Redirigiendo a home con apertura automática de formulario"
    );
  }

  setLoadingState(isLoading) {
    const tbody = document.getElementById("ventas-table-body");

    if (isLoading && tbody) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Cargando ventas...</span>
                        </div>
                        <p class="text-sm text-muted mt-2">Cargando ventas...</p>
                    </td>
                </tr>
            `;
    }
  }

  updatePaginationInfo() {
    const infoElement = document.getElementById("pagination-info");
    if (infoElement) {
      infoElement.textContent = `Mostrando ${this.filteredSales.length} ventas`;
    }
  }

  populateUserFilter(users) {
    const select = document.getElementById("filtro-usuario");
    if (!select || !Array.isArray(users)) return;

    select.innerHTML =
      '<option value="">Todos los usuarios</option>' +
      users
        .map(
          (user) => `
                <option value="${user.id}">${user.username} (${user.role})</option>
            `
        )
        .join("");
  }

  updateSummaryCards(data) {
    console.log("📊 [SalesController] Actualizando tarjetas con:", data);
    // Implementar actualización de tarjetas de resumen
  }

  updateSummaryCardsWithDefaults() {
    console.log(
      "📊 [SalesController] Usando valores por defecto para tarjetas"
    );
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  showError(message) {
    console.error("❌ [SalesController] Error:", message);
    showAlert(message, "error");
  }

  cleanupEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  destroy() {
    this.cleanupEventListeners();
    this.allSales = [];
    this.filteredSales = [];
    this.currentFilters = {};

    console.log("🧹 [SalesController] Controlador destruido");
  }
}
export default SalesController;
