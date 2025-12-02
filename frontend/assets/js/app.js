import AuthService from "./services/auth.service.js";
import ProductsService from "./services/products.service.js";
import SalesService from "./services/sales.service.js";
import ClientsService from "./services/clients.service.js";
import CashService from "./services/cash.service.js";
import HomeService from "./services/home.service.js";
import DashboardService from "./services/dashboard.service.js";
import ApiService from "./services/api.service.js";

class GestionARApp {
  constructor() {
    this.apiService = new ApiService();
    this.authService = new AuthService();
    this.productsService = new ProductsService(this.apiService);
    this.salesService = new SalesService(this.apiService);
    this.clientsService = new ClientsService(this.apiService);
    this.cashService = new CashService(this.apiService);
    this.homeService = new HomeService(this.apiService);
    this.dashboardService = new DashboardService(this.apiService);

    this.currentPage = "";
    this.routes = {
      "#home": "home",
      "#dashboard": "dashboard",
      "#products": "products",
      "#sales": "sales",
      "#clients": "clients",
      "#cash-register": "cash-register",
    };

    this.currentPageInstance = null;

    console.log("🚀 GestionARApp inicializada");
    this.init();
  }

  async init() {
    console.log("🚀 Iniciando GestionAR App...");

    // Verificar autenticación
    if (!this.checkAuthentication()) {
      return;
    }

    // Cargar la aplicación
    await this.loadApplication();
  }

  checkAuthentication() {
    if (!this.authService.isAuthenticated()) {
      console.warn("❌ Usuario no autenticado");
      this.redirectToLogin();
      return false;
    }

    console.log("✅ Usuario autenticado:", this.authService.getUser());
    return true;
  }

  redirectToLogin() {
    console.log("🔐 Redirigiendo al login...");
    window.location.href = "index.html";
  }

  async loadApplication() {
    try {
      await this.loadComponents();
      this.setupRouter();
      this.setupEventListeners();

      const initialRoute = this.getCurrentRoute();
      await this.loadPage(initialRoute);

      console.log("✅ Aplicación cargada completamente");
    } catch (error) {
      console.error("❌ Error cargando aplicación:", error);
      this.showError("Error al cargar la aplicación");
    }
  }

  async loadComponents() {
    console.log("📦 Cargando componentes...");

    try {
      await Promise.all([
        this.loadHTML("navbar-container", "components/navbar.html"),
        this.loadHTML("sidenav-container", "components/sidenav.html"),
        this.loadHTML("footer-container", "components/footer.html"),
      ]);

      this.updateUserInfo();
      this.setupSidenav();

      console.log("✅ Componentes cargados");
    } catch (error) {
      console.error("❌ Error cargando componentes:", error);
    }
  }

  async loadHTML(containerId, file) {
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const container = document.getElementById(containerId);

      if (container) {
        container.innerHTML = html;
        console.log(`✅ ${file} cargado`);
      }
    } catch (error) {
      console.error(`❌ Error cargando ${file}:`, error);
    }
  }

  updateUserInfo() {
    const user = this.authService.getUser();
    const usernameElement = document.getElementById("navbar-username");

    if (usernameElement && user) {
      usernameElement.textContent = user.username;
    }
  }

  setupSidenav() {
    const toggleBtn = document.getElementById("iconNavbarSidenav");
    const sidenav = document.getElementById("sidenav-main");

    if (toggleBtn && sidenav) {
      toggleBtn.addEventListener("click", () => {
        sidenav.classList.toggle("d-none");
      });
    }
  }

  setupRouter() {
    console.log("🔄 Configurando router...");

    // Manejar cambios de hash
    window.addEventListener("hashchange", () => {
      this.loadPage(this.getCurrentRoute());
    });

    // Manejar clicks en links con data-route
    document.addEventListener("click", (e) => {
      const link = e.target.closest("a[data-route]");
      if (link) {
        e.preventDefault();
        const route = link.getAttribute("data-route");
        this.navigate(route);
      }
    });

    console.log("✅ Router configurado");
  }

  setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await this.authService.logout();
        this.redirectToLogin();
      });
    }
  }

  getCurrentRoute() {
    const hash = window.location.hash.replace("#", "") || "home";
    // ✅ CORREGIDO: Remover parámetros de la ruta para la carga del archivo
    const routeWithoutParams = hash.split("?")[0];
    return routeWithoutParams;
  }

  navigate(route) {
    console.log("🧭 Navegando a:", route);
    window.location.hash = route;
  }

  async loadPage(pageName) {
    // ✅ CORREGIDO: Remover parámetros para la carga del archivo HTML
    const normalizedPageName =
      this.routes[`#${pageName}`] || pageName.split("?")[0] || "home";
    console.log("📄 Cargando página:", normalizedPageName);

    // Limpiar instancia anterior
    if (this.currentPageInstance && this.currentPageInstance.destroy) {
      this.currentPageInstance.destroy();
    }

    // Mostrar loading
    this.showLoading(normalizedPageName);

    try {
      // ✅ CORREGIDO: Cargar HTML sin parámetros
      const response = await fetch(`pages/${normalizedPageName}.html`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      document.getElementById("app-content").innerHTML = html;

      this.currentPage = normalizedPageName;

      // ✅ CORREGIDO: Pasar el pageName completo (con parámetros) al controlador
      await this.loadPageLogic(pageName);

      // Actualizar UI
      this.updateNavigation();
      this.updateBreadcrumb(normalizedPageName);

      console.log(`✅ Página ${normalizedPageName} cargada`);
    } catch (error) {
      console.error(`❌ Error cargando página ${normalizedPageName}:`, error);
      this.showErrorPage(error);
    }
  }

  showLoading(pageName) {
    document.getElementById("app-content").innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="text-muted mt-2">Cargando ${pageName}...</p>
      </div>
    `;
  }

  async loadPageLogic(pageName) {
    try {
      // ✅ CORREGIDO: Usar pageName original (puede contener parámetros)
      const [basePageName, queryString] = pageName.split("?");
      const params = queryString ? new URLSearchParams(queryString) : null;

      switch (basePageName) {
        case "home":
          const { default: HomeController } = await import(
            "./controllers/home.controller.js"
          );
          this.currentPageInstance = new HomeController(
            this.homeService,
            this.authService
          );
          await this.currentPageInstance.init();

          if (params && params.get("action") === "auto-open-sales-form") {
            console.log("🛒 [App] Abriendo formulario desde parámetro URL");
          }
          break;

        case "products":
          const { default: ProductsController } = await import(
            "./controllers/products.controller.js"
          );
          this.currentPageInstance = new ProductsController(
            this.productsService,
            this.authService,
            this.dashboardService
          );
          await this.currentPageInstance.init();
          break;

        case "sales":
          const { default: SalesController } = await import(
            "./controllers/sales.controller.js"
          );
          this.currentPageInstance = new SalesController(
            this.salesService,
            this.authService,
            this.dashboardService
          );
          await this.currentPageInstance.init();
          break;

        case "cash-register":
          const { default: CashController } = await import(
            "./controllers/cash.controller.js"
          );
          this.currentPageInstance = new CashController(
            this.cashService,
            this.authService
          );
          await this.currentPageInstance.init();
          break;

        case "clients":
          const { default: ClientsController } = await import(
            "./controllers/clients.controller.js"
          );
          this.currentPageInstance = new ClientsController(
            this.clientsService,
            this.authService,
            this.dashboardService
          );
          await this.currentPageInstance.init();
          break;

        case "dashboard":
          const { default: DashboardController } = await import(
            "./controllers/dashboard.controller.js"
          );
          this.currentPageInstance = new DashboardController(
            this.dashboardService,
            this.authService,
            this.productsService,
            this.salesService,
            this.clientsService,
            this.cashService
          );
          await this.currentPageInstance.init();
          break;
      }
    } catch (error) {
      console.error(`❌ Error cargando controlador ${pageName}:`, error);
    }
  }

  updateNavigation() {
    // Remover active de todos los links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    // Agregar active al link actual
    const activeLink = document.querySelector(
      `[data-route="${this.currentPage}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
    }
  }

  updateBreadcrumb(pageName) {
    const pageTitles = {
      home: "Inicio",
      dashboard: "Dashboard",
      products: "Productos",
      sales: "Ventas",
      clients: "Clientes",
      "cash-register": "Caja Registradora",
    };

    const breadcrumb = document.getElementById("current-page");
    const pageTitle = document.getElementById("page-title");

    const title = pageTitles[pageName] || "Inicio";

    if (breadcrumb) breadcrumb.textContent = title;
    if (pageTitle) pageTitle.textContent = title;
  }

  showErrorPage(error) {
    document.getElementById("app-content").innerHTML = `
      <div class="text-center py-5">
        <div class="alert alert-danger">
          <h4>Error al cargar la página</h4>
          <p>${error.message}</p>
          <button class="btn btn-primary mt-3" onclick="location.reload()">
            Recargar Página
          </button>
        </div>
      </div>
    `;
  }

  showError(message) {
    alert(`❌ ${message}`);
  }
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  const app = new GestionARApp();

  // 🔥 EXPONER PARA DEBUGGING
  window.gestionARApp = app;
  window.App = GestionARApp;

  console.log("🔧 App expuesta en window.gestionARApp");
});

export default GestionARApp;
