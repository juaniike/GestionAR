import { showAlert, showConfirm } from "../plugins/alerts.js";
import HomeService from "../services/home.service.js";
import ApiService from "../services/api.service.js";
import ProductsService from "../services/products.service.js";
import SalesService from "../services/sales.service.js";
import ClientsService from "../services/clients.service.js";
import CashService from "../services/cash.service.js";
import AuthService from "../services/auth.service.js";
import SalesFormController from "./dashboard/sales-form.controller.js";

class HomeController {
  constructor() {
    // Inicializar servicios
    this.authService = new AuthService();
    const apiService = new ApiService();

    // Crear instancias de servicios para SalesFormController
    this.productsService = new ProductsService(apiService);
    this.salesService = new SalesService(apiService);
    this.clientsService = new ClientsService(apiService);
    this.cashService = new CashService(apiService);

    this.homeService = new HomeService(
      apiService,
      this.productsService,
      this.salesService,
      this.clientsService,
      this.cashService
    );

    this.dateTimeInterval = null;
    this.autoRefreshInterval = null;
    this.salesForm = null;

    this.initialized = false;
    console.log("🏠 HomeController inicializado");
  }

  async init() {
    if (this.initialized) return;

    console.log("🚀 Iniciando página de inicio...");

    try {
      // Verificar autenticación
      if (!this.authService.isAuthenticated()) {
        this.redirectToLogin();
        return;
      }

      // Cargar componentes estructurales
      await this.loadComponents();

      // ✅ NUEVO: Inicializar formulario de ventas en home
      await this.initializeSalesForm();

      // Configurar UI
      this.updateWelcomeMessage();
      this.startDateTimeUpdater();

      // Cargar datos usando HomeService
      await this.loadHomeData();

      // Configurar auto-actualización
      this.setupAutoRefresh();
      this.setupEventListeners();

      // ✅ NUEVO: Verificar parámetros de URL después de inicializar
      setTimeout(() => {
        this.checkUrlParams();
      }, 1000);

      // ✅ NUEVO: Hacer disponible globalmente
      window.homeController = this;

      console.log("✅ Página de inicio cargada correctamente");
      showAlert("Sistema cargado correctamente", "success", 3000);
    } catch (error) {
      console.error("❌ Error iniciando home:", error);
      showAlert("Error cargando la página de inicio", "error");
    }
  }

  // ✅ NUEVO MÉTODO: Verificar parámetros de URL
  checkUrlParams() {
    console.log("🔍 [HomeController] Verificando parámetros de URL...");

    // Buscar parámetros en el hash
    let action = null;

    if (window.location.hash.includes("?")) {
      const hashParams = new URLSearchParams(
        window.location.hash.split("?")[1]
      );
      action = hashParams.get("action");
    }

    console.log("🔍 [HomeController] Parámetro 'action' encontrado:", action);

    // ✅ SOLO responder al parámetro específico de ventas
    if (action === "auto-open-sales-form") {
      console.log(
        "🛒 [HomeController] Abriendo formulario automáticamente desde redirección de ventas"
      );

      requestAnimationFrame(() => {
        this.openSalesForm();
        this.cleanUrlParams();
      });
    }
  }

  // ✅ NUEVO MÉTODO: Limpiar parámetros de URL
  cleanUrlParams() {
    if (window.history.replaceState) {
      // Limpiar solo los parámetros, mantener el hash home
      const cleanUrl =
        window.location.origin + window.location.pathname + "#home";
      window.history.replaceState({}, document.title, cleanUrl);
      console.log(
        "🧹 [HomeController] Parámetros de URL limpiados - URL normalizada a #home"
      );
    }
  }

  // ✅ NUEVO MÉTODO: Inicializar formulario de ventas en home
  async initializeSalesForm() {
    try {
      console.log("🛒 Inicializando formulario de ventas en Home...");

      // ✅ INSTANCIAR CON TODOS LOS PARÁMETROS REQUERIDOS
      this.salesForm = new SalesFormController(
        this.productsService,
        this.clientsService,
        this.salesService,
        this.authService,
        this.cashService
      );

      await this.salesForm.init();
      console.log("✅ SalesFormController inicializado correctamente en Home");
    } catch (error) {
      console.error(
        "❌ Error inicializando SalesFormController en Home:",
        error
      );
      // No bloquear la carga del home, pero marcar como no disponible
      this.salesForm = null;
    }
  }

  async loadComponents() {
    try {
      await Promise.all([
        this.loadHTML("navbar-container", "components/navbar.html"),
        this.loadHTML("sidenav-container", "components/sidenav.html"),
        this.loadHTML("footer-container", "components/footer.html"),
      ]);
      console.log("✅ Componentes estructurales cargados");
    } catch (error) {
      console.error("❌ Error cargando componentes:", error);
    }
  }

  async loadHTML(containerId, file) {
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      document.getElementById(containerId).innerHTML = html;
    } catch (error) {
      console.error(`❌ Error cargando ${file}:`, error);
    }
  }

  updateWelcomeMessage() {
    const user = this.authService.getUser();
    const welcomeElement = document.getElementById("welcome-message");

    if (welcomeElement && user) {
      const now = new Date();
      const hour = now.getHours();
      let greeting = "Buenos días";

      if (hour >= 12 && hour < 18) {
        greeting = "Buenas tardes";
      } else if (hour >= 18) {
        greeting = "Buenas noches";
      }

      welcomeElement.textContent = `${greeting}, ${user.username}!`;
      console.log(`👋 Saludo actualizado: ${greeting}, ${user.username}`);
    }
  }

  startDateTimeUpdater() {
    // Actualizar inmediatamente
    this.updateDateTime();

    // Actualizar cada segundo
    this.dateTimeInterval = setInterval(() => {
      this.updateDateTime();
    }, 1000);

    console.log("⏰ Actualizador de fecha/hora iniciado");
  }

  updateDateTime() {
    const dateTimeElement = document.getElementById("current-date-time");
    if (dateTimeElement) {
      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      dateTimeElement.textContent = now.toLocaleDateString("es-AR", options);
    }
  }

  async loadHomeData() {
    console.log("📊 Cargando datos del home...");

    try {
      const user = this.authService.getUser();
      const [metrics, quickActions, systemInfo] = await Promise.all([
        this.homeService.getHomeMetrics(),
        this.homeService.getQuickActions(),
        this.homeService.getSystemInfo(user),
      ]);

      // Actualizar métricas en la UI
      this.updateMetrics(metrics);

      // Configurar acciones rápidas
      this.setupQuickActions(quickActions);

      // Configurar información del sistema
      this.setupSystemInfo(systemInfo);

      console.log("✅ Datos del home cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando datos del home:", error);
      // Valores por defecto en caso de error
      this.updateMetricsWithDefaults();
      this.setupQuickActions(); // Usar acciones por defecto
      this.setupSystemInfo(); // Usar info por defecto
    }
  }

  updateMetrics(metrics) {
    this.updateElement("activity-today", metrics.todaySales);
    this.updateElement("total-products", metrics.totalProducts);
    this.updateElement("total-clients", metrics.totalClients);

    // Actualizar estado del sistema
    this.updateSystemStatus(metrics.systemStatus);

    console.log("📊 Métricas actualizadas:", {
      todaySales: metrics.todaySales,
      totalProducts: metrics.totalProducts,
      totalClients: metrics.totalClients,
      systemStatus: metrics.systemStatus,
    });
  }

  updateMetricsWithDefaults() {
    this.updateElement("activity-today", "0");
    this.updateElement("total-products", "0");
    this.updateElement("total-clients", "0");
    this.updateSystemStatus("stable");
  }

  updateSystemStatus(systemStatus) {
    const systemStatusElement = document.getElementById("system-status");
    if (systemStatusElement) {
      if (systemStatus === "optimal") {
        systemStatusElement.textContent = "Óptimo";
        systemStatusElement.className = "font-weight-bolder mb-0 text-success";
      } else {
        systemStatusElement.textContent = "Estable";
        systemStatusElement.className = "font-weight-bolder mb-0 text-warning";
      }
    }
  }

  setupQuickActions(actions = null) {
    const actionsContainer = document.getElementById("quick-actions");
    if (!actionsContainer) {
      console.warn("❌ Contenedor de acciones rápidas no encontrado");
      return;
    }

    // Usar acciones proporcionadas o las por defecto (sin await)
    const quickActions = actions || this.getDefaultQuickActions();

    // Generar HTML de las acciones
    actionsContainer.innerHTML = quickActions
      .map(
        (action, index) => `
      <div class="col-xl-3 col-md-4 col-sm-6 mb-3">
        <div class="card card-hover h-100 quick-action-card" data-action="${
          action.action
        }" data-id="${action.id}">
          <div class="card-body text-center p-3">
            <div class="icon icon-shape bg-gradient-${
              action.color
            } shadow text-center border-radius-md mb-2">
              <i class="material-icons text-white opacity-10">${action.icon}</i>
            </div>
            <h6 class="mb-1">${action.label}</h6>
            <p class="text-sm text-muted mb-0">${action.description}</p>
            ${
              action.shortcut
                ? `<small class="text-xs text-muted">${action.shortcut}</small>`
                : ""
            }
          </div>
        </div>
      </div>
    `
      )
      .join("");

    // Agregar event listeners
    document.querySelectorAll(".quick-action-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const action = e.currentTarget.getAttribute("data-action");
        this.handleQuickAction(action);
      });
      card.style.cursor = "pointer";
    });

    console.log("🚀 Acciones rápidas configuradas");
  }

  getDefaultQuickActions() {
    return [
      {
        id: "new-sale",
        icon: "add_shopping_cart",
        label: "Nueva Venta",
        description: "Registrar nueva venta",
        color: "success",
        action: "openSalesForm",
        shortcut: "Ctrl+N",
      },
      {
        id: "view-dashboard",
        icon: "dashboard",
        label: "Ver Dashboard",
        description: "Estadísticas y gráficos",
        color: "primary",
        action: "navigateToDashboard",
        shortcut: "Ctrl+D",
      },
      {
        id: "manage-products",
        icon: "inventory_2",
        label: "Gestión Productos",
        description: "Administrar inventario",
        color: "info",
        action: "navigateToProducts",
        shortcut: "Ctrl+P",
      },
      {
        id: "sales-history",
        icon: "receipt",
        label: "Historial Ventas",
        description: "Ver todas las ventas",
        color: "secondary",
        action: "navigateToSales",
        shortcut: "Ctrl+H",
      },
      {
        id: "cash-register",
        icon: "point_of_sale",
        label: "Caja Registradora",
        description: "Gestión de caja",
        color: "warning",
        action: "navigateToCash",
        shortcut: "Ctrl+C",
      },
      {
        id: "manage-clients",
        icon: "groups",
        label: "Administrar Clientes",
        description: "Gestionar clientes",
        color: "dark",
        action: "navigateToClients",
        shortcut: "Ctrl+L",
      },
      {
        id: "reports",
        icon: "assessment",
        label: "Reportes",
        description: "Generar reportes",
        color: "primary",
        action: "showReports",
      },
      {
        id: "settings",
        icon: "settings",
        label: "Configuración",
        description: "Configurar sistema",
        color: "dark",
        action: "showSettings",
      },
    ];
  }

  handleQuickAction(action) {
    const actions = {
      openSalesForm: () => this.openSalesForm(),
      navigateToDashboard: () => this.navigateTo("dashboard"),
      navigateToProducts: () => this.navigateTo("products"),
      navigateToSales: () => this.navigateTo("sales"),
      navigateToCash: () => this.navigateTo("cash-register"),
      navigateToClients: () => this.navigateTo("clients"),
      showReports: () => this.showReports(),
      showSettings: () => this.showSettings(),
    };

    if (actions[action]) {
      actions[action]();
    } else {
      console.warn(`⚠️ Acción no implementada: ${action}`);
    }
  }

  setupSystemInfo(systemInfo = null) {
    const systemInfoContainer = document.getElementById("system-info");
    if (!systemInfoContainer) {
      console.warn("❌ Contenedor de información del sistema no encontrado");
      return;
    }

    const user = this.authService.getUser();
    const now = new Date();

    // Usar información del servicio o valores por defecto
    const info = systemInfo || {
      user: {
        username: user?.username || "No identificado",
        role: user?.role || "N/A",
      },
      system: {
        date: now.toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: now.toLocaleTimeString("es-AR"),
        status: "protected",
      },
    };

    systemInfoContainer.innerHTML = `
      <div class="col-md-6">
        <div class="d-flex align-items-center mb-3">
          <i class="material-icons text-success me-2">check_circle</i>
          <div>
            <span class="text-sm font-weight-bold">Sistema Operativo</span>
            <br>
            <small class="text-muted">Funcionando correctamente</small>
          </div>
        </div>
        <div class="d-flex align-items-center mb-3">
          <i class="material-icons text-info me-2">person</i>
          <div>
            <span class="text-sm font-weight-bold">Usuario Activo</span>
            <br>
            <small class="text-muted">${info.user.username} (${info.user.role})</small>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="d-flex align-items-center mb-3">
          <i class="material-icons text-primary me-2">today</i>
          <div>
            <span class="text-sm font-weight-bold">Fecha Actual</span>
            <br>
            <small class="text-muted">${info.system.date}</small>
          </div>
        </div>
        <div class="d-flex align-items-center mb-3">
          <i class="material-icons text-warning me-2">security</i>
          <div>
            <span class="text-sm font-weight-bold">Estado Seguridad</span>
            <br>
            <small class="text-muted">Sistema protegido</small>
          </div>
        </div>
      </div>
    `;

    console.log("ℹ️ Información del sistema configurada");
  }

  setupEventListeners() {
    // Eventos globales del home
    document.addEventListener("keydown", (e) => this.handleGlobalShortcuts(e));

    // Botón de refresh manual
    const refreshBtn = document.getElementById("refresh-metrics");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshAllData());
    }

    console.log("🎯 Event listeners del home configurados");
  }

  handleGlobalShortcuts(event) {
    // Atajos de teclado globales
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "n":
          event.preventDefault();
          this.openSalesForm();
          break;
        case "d":
          event.preventDefault();
          this.navigateTo("dashboard");
          break;
        case "p":
          event.preventDefault();
          this.navigateTo("products");
          break;
        case "c":
          event.preventDefault();
          this.navigateTo("cash-register");
          break;
        case "l":
          event.preventDefault();
          this.navigateTo("clients");
          break;
        case "h":
          event.preventDefault();
          this.navigateTo("sales");
          break;
      }
    }
  }

  setupAutoRefresh() {
    // Actualizar métricas cada 2 minutos
    this.autoRefreshInterval = setInterval(() => {
      this.loadHomeData();
      console.log("🔄 Datos actualizados automáticamente");
    }, 2 * 60 * 1000);

    console.log("⏰ Auto-actualización configurada");
  }

  async refreshAllData() {
    showAlert("Actualizando datos...", "info", 2000);

    try {
      await this.homeService.refreshAllData();
      await this.loadHomeData();

      showAlert("Datos actualizados correctamente", "success", 3000);
    } catch (error) {
      console.error("❌ Error actualizando datos:", error);
      showAlert("Error actualizando datos", "error");
    }
  }

  // ✅ ACTUALIZADO: Abrir formulario desde home
  openSalesForm() {
    console.log(
      "📋 [HomeController] Abriendo formulario de ventas desde Home..."
    );

    if (this.salesForm) {
      console.log("✅ [HomeController] Usando salesForm local");
      this.salesForm.open();
    } else if (typeof window.mostrarFormularioVentas === "function") {
      console.log("✅ [HomeController] Usando función global");
      window.mostrarFormularioVentas();
    } else {
      console.warn(
        "⚠️ [HomeController] Formulario no disponible, intentando crear modal..."
      );
      this.createSalesModalInHome();
    }
  }

  // ✅ NUEVO: Crear modal temporal si no existe
  createSalesModalInHome() {
    console.log("🔧 Creando modal de ventas temporal en home...");

    // Verificar si ya existe
    if (document.getElementById("venta-form")) {
      console.log("✅ Modal ya existe en home");
      const modal = document.getElementById("venta-form");
      const bsModal = new bootstrap.Modal(modal);
      bsModal.show();
      return;
    }

    // Crear modal dinámicamente
    const modalHTML = `
      <div class="modal fade" id="venta-form" tabindex="-1" role="dialog" aria-labelledby="venta-form-label" aria-hidden="true">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="venta-form-label">
                <i class="material-icons me-2">shopping_cart</i>
                Registrar Venta (Modal Temporal)
              </h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <i class="material-icons me-2">warning</i>
                El modal debería estar en home.html. Esta es una versión temporal.
              </div>
              <p>Para una solución permanente, mové el código del modal de dashboard.html a home.html.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
              <button type="button" class="btn btn-primary">Continuar</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar al body
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    // Abrir modal
    const modal = document.getElementById("venta-form");
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log("✅ Modal temporal creado y abierto en home");
  }

  navigateTo(route) {
    console.log(`🧭 Navegando a: ${route}`);
    window.location.hash = route;
  }

  showReports() {
    showConfirm(
      "¿Qué tipo de reporte deseas generar?",
      () => {
        // Reporte completo
        showAlert("Generando reporte completo...", "info");
        this.navigateTo("sales");
      },
      () => {
        // Reporte rápido
        showAlert("Generando reporte diario...", "info");
        // Aquí podrías abrir un modal de reporte rápido
      }
    );
  }

  showSettings() {
    console.log("⚙️ Abriendo configuración...");

    showConfirm(
      "Configuración del Sistema",
      () => {
        // Aquí podrías abrir un modal de configuración
        showAlert("Módulo de configuración - Próximamente", "info");
      },
      () => {
        // Configuración rápida
        this.showQuickSettings();
      }
    );
  }

  showQuickSettings() {
    const settings = [
      {
        name: "Auto-actualización",
        value: "activada",
        action: () => this.toggleAutoRefresh(),
      },
      {
        name: "Notificaciones",
        value: "activadas",
        action: () => this.toggleNotifications(),
      },
      {
        name: "Tema oscuro",
        value: "desactivado",
        action: () => this.toggleDarkMode(),
      },
    ];

    let message = "Configuración Rápida:\n\n";
    settings.forEach((setting) => {
      message += `• ${setting.name}: ${setting.value}\n`;
    });

    showAlert(message, "info", 5000);
  }

  toggleAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
      showAlert("Auto-actualización desactivada", "warning");
    } else {
      this.setupAutoRefresh();
      showAlert("Auto-actualización activada", "success");
    }
  }

  toggleNotifications() {
    showAlert("Configuración de notificaciones - Próximamente", "info");
  }

  toggleDarkMode() {
    showAlert("Modo oscuro - Próximamente", "info");
  }

  redirectToLogin() {
    console.log("🔐 Redirigiendo al login...");
    window.location.href = "index.html";
  }

  destroy() {
    // Limpiar intervalos
    if (this.dateTimeInterval) {
      clearInterval(this.dateTimeInterval);
      console.log("⏰ Actualizador de fecha/hora detenido");
    }

    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      console.log("🔄 Auto-actualización detenida");
    }

    // Limpiar formulario de ventas si existe
    if (this.salesForm && typeof this.salesForm.destroy === "function") {
      this.salesForm.destroy();
    }

    // Remover event listeners
    document.removeEventListener("keydown", this.handleGlobalShortcuts);

    // Limpiar referencia global
    window.homeController = null;

    console.log("🧹 HomeController - Recursos limpiados");
  }

  // Métodos de utilidad
  updateElement(selector, value) {
    const element = document.getElementById(selector);
    if (element) element.textContent = value;
  }
}

export default HomeController;
