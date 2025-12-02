// assets/js/controllers/dashboard.controller.js - VERSIÓN COMPLETA CORREGIDA
import { showAlert } from "../plugins/alerts.js";
import AuthService from "../services/auth.service.js";
import DashboardService from "../services/dashboard.service.js";
import ProductsService from "../services/products.service.js";
import SalesService from "../services/sales.service.js";
import ClientsService from "../services/clients.service.js";
import CashService from "../services/cash.service.js";
import ApiService from "../services/api.service.js";
import DashboardCardsManager from "./dashboard/dashboard-cards.controller.js";

class DashboardController {
  constructor() {
    // ✅ TODOS LOS SERVICIOS CORREGIDOS
    this.apiService = new ApiService();
    this.authService = new AuthService();
    this.dashboardService = new DashboardService(this.apiService);
    this.productsService = new ProductsService(this.apiService);
    this.salesService = new SalesService(this.apiService);
    this.clientsService = new ClientsService(this.apiService);
    this.cashService = new CashService(this.apiService);

    this.currentUser = null;
    this.cardsManager = null;
    this.isInitialized = false;

    console.log(
      "🚀 [DashboardController] Controlador inicializado correctamente"
    );
  }

  async init() {
    if (this.isInitialized) return;

    console.log("🚀 [DashboardController] Inicializando dashboard...");

    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.showError("Usuario no autenticado. Por favor, inicia sesión.");
      return;
    }

    try {
      await this.loadComponents();

      // ✅ INICIALIZAR DashboardCardsManager
      this.cardsManager = new DashboardCardsManager(
        this.dashboardService,
        this.salesService,
        this.productsService,
        this.clientsService,
        this.cashService
      );

      await this.cardsManager.loadCards("cards-container");
      console.log("✅ [DashboardController] CardsManager inicializado");

      // Configurar eventos
      this.setupEventListeners();

      this.isInitialized = true;
      console.log(
        "✅ [DashboardController] Dashboard inicializado correctamente"
      );

      showAlert("Dashboard cargado correctamente", "success", 3000);
    } catch (error) {
      console.error("❌ [DashboardController] Error inicializando:", error);
      this.showError("Error al cargar el dashboard: " + error.message);
    }
  }

  // ✅ Setup solo de redirección
  setupQuickActions() {
    // Botón Nueva Venta - Redirigir al Home
    const btnNuevaVenta = document.getElementById("btn-nueva-venta");
    if (btnNuevaVenta) {
      btnNuevaVenta.addEventListener("click", () => {
        console.log(
          "🛒 [DashboardController] Redirigiendo a Home para nueva venta"
        );
        this.openSalesForm();
      });
    }

    // Los demás botones permanecen igual
    const btnVerProductos = document.getElementById("btn-ver-productos");
    if (btnVerProductos) {
      btnVerProductos.addEventListener("click", () => {
        window.location.hash = "products";
      });
    }

    const btnVerVentas = document.getElementById("btn-ver-ventas");
    if (btnVerVentas) {
      btnVerVentas.addEventListener("click", () => {
        window.location.hash = "sales";
      });
    }

    const btnGestionarCaja = document.getElementById("btn-gestionar-caja");
    if (btnGestionarCaja) {
      btnGestionarCaja.addEventListener("click", () => {
        window.location.hash = "cash-register";
      });
    }

    const btnActualizar = document.getElementById("btn-actualizar-dashboard");
    if (btnActualizar) {
      btnActualizar.addEventListener("click", () => {
        this.refreshDashboard();
      });
    }
  }

  // ✅ SOLO REDIRECCIÓN - Sin inicializar SalesFormController
  openSalesForm() {
    console.log(
      "📋 [DashboardController] Redirigiendo a Home para formulario de ventas..."
    );

    showAlert("Abriendo formulario de ventas...", "info", 1500);

    // Redirección directa con parámetro para auto-abrir
    setTimeout(() => {
      window.location.hash = "home?action=auto-open-sales-form";
    }, 500);
  }

  async loadComponents() {
    try {
      console.log(
        "📦 [DashboardController] Cargando componentes estructurales..."
      );

      await Promise.all([
        this.loadComponent("sidenav-container", "./components/sidenav.html"),
        this.loadComponent("navbar-container", "./components/navbar.html"),
        this.loadComponent("footer-container", "./components/footer.html"),
      ]);

      console.log(
        "✅ [DashboardController] Componentes cargados correctamente"
      );
    } catch (error) {
      console.error(
        "❌ [DashboardController] Error cargando componentes:",
        error
      );
      throw new Error("No se pudieron cargar los componentes necesarios");
    }
  }

  async loadComponent(id, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${url}`);
      }

      const html = await response.text();
      const container = document.getElementById(id);

      if (container) {
        container.innerHTML = html;
        console.log(`✅ [DashboardController] ${id} cargado`);
      } else {
        console.warn(`⚠️ [DashboardController] Contenedor ${id} no encontrado`);
      }
    } catch (error) {
      console.error(`❌ [DashboardController] Error cargando ${id}:`, error);
      throw error;
    }
  }

  setupEventListeners() {
    console.log("🎯 [DashboardController] Configurando event listeners...");

    // Eventos para refrescar dashboard
    window.addEventListener("saleCompleted", () => {
      console.log("🔄 [DashboardController] Evento saleCompleted recibido");
      this.refreshDashboard();
    });

    window.addEventListener("productsUpdated", () => {
      console.log("🔄 [DashboardController] Evento productsUpdated recibido");
      this.refreshDashboard();
    });

    window.addEventListener("clientsUpdated", () => {
      console.log("🔄 [DashboardController] Evento clientsUpdated recibido");
      this.refreshDashboard();
    });

    window.addEventListener("cashStatusChanged", () => {
      console.log("🔄 [DashboardController] Evento cashStatusChanged recibido");
      this.refreshDashboard();
    });

    // Configurar botones de acción rápida
    this.setupQuickActions();

    console.log("✅ [DashboardController] Event listeners configurados");
  }

  async refreshDashboard() {
    try {
      console.log("🔄 [DashboardController] Refrescando dashboard...");

      // Mostrar indicador de carga
      this.showLoadingState(true);

      if (this.cardsManager) {
        await this.cardsManager.refreshAllCards();
      }

      console.log(
        "✅ [DashboardController] Dashboard refrescado correctamente"
      );
      showAlert("Dashboard actualizado", "success", 2000);
    } catch (error) {
      console.error(
        "❌ [DashboardController] Error refrescando dashboard:",
        error
      );
      this.showError("Error al actualizar el dashboard");
    } finally {
      this.showLoadingState(false);
    }
  }

  showLoadingState(show) {
    const loadingIndicator = document.getElementById("dashboard-loading");
    const content = document.getElementById("dashboard-content");

    if (loadingIndicator) {
      loadingIndicator.style.display = show ? "block" : "none";
    }

    if (content) {
      content.style.opacity = show ? "0.5" : "1";
    }

    // Deshabilitar botones durante la carga
    const buttons = document.querySelectorAll("#dashboard-content button");
    buttons.forEach((button) => {
      button.disabled = show;
    });
  }

  showError(message, type = "error") {
    console.error(`❌ [DashboardController] ${message}`);
    showAlert(message, type);

    const errorContainer = document.getElementById("dashboard-errors");
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="alert alert-${
          type === "error" ? "danger" : "warning"
        } alert-dismissible fade show" role="alert">
          <i class="material-icons me-2">error</i>
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
    }
  }

  destroy() {
    console.log("🧹 [DashboardController] Destruyendo controlador...");

    // Limpiar event listeners
    window.removeEventListener("saleCompleted", this.refreshDashboard);
    window.removeEventListener("productsUpdated", this.refreshDashboard);
    window.removeEventListener("clientsUpdated", this.refreshDashboard);
    window.removeEventListener("cashStatusChanged", this.refreshDashboard);

    // Limpiar instancias
    if (this.cardsManager && typeof this.cardsManager.destroy === "function") {
      this.cardsManager.destroy();
    }

    // Limpiar referencias
    this.cardsManager = null;
    this.currentUser = null;
    this.isInitialized = false;

    console.log("✅ [DashboardController] Controlador destruido correctamente");
  }
}

export default DashboardController;
