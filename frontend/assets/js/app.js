// assets/js/app.js - CON VERIFICACIÓN DE AUTENTICACIÓN
class GestionARApp {
  constructor() {
    this.currentPage = "";
    this.routes = {
      "#dashboard": "dashboard",
      "#products": "products",
      "#sales": "sales",
      "#clients": "clients",
      "#cash-register": "cash-register",
    };

    this.init();
  }

  async init() {
    console.log("🚀 Iniciando GestionAR App...");

    // ✅ VERIFICAR AUTENTICACIÓN
    if (!this.checkAuthentication()) {
      this.redirectToLogin();
      return;
    }

    await this.loadComponents();
    this.setupRouter();

    // Cargar página inicial
    const initialRoute = this.getCurrentRoute();
    await this.loadPage(initialRoute);
  }

  checkAuthentication() {
    const user = this.getCurrentUser();
    if (!user || !user.token) {
      console.warn("❌ Usuario no autenticado");
      return false;
    }

    console.log("✅ Usuario autenticado:", user.username);
    return true;
  }

  redirectToLogin() {
    console.log("🔐 Redirigiendo al login...");
    window.location.href = "index.html";
  }

  getCurrentUser() {
    try {
      const user =
        JSON.parse(sessionStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("user"));
      return user || null;
    } catch (error) {
      return null;
    }
  }

  async loadComponents() {
    console.log("📦 Cargando componentes...");
    try {
      await Promise.all([
        this.loadHTML("sidenav-container", "components/sidenav.html"),
        this.loadHTML("navbar-container", "components/navbar.html"),
        this.loadHTML("footer-container", "components/footer.html"),
      ]);
      console.log("✅ Componentes cargados");

      // Actualizar navbar con usuario
      this.updateNavbarUser();

      this.initSidenavToggle();
    } catch (error) {
      console.error("❌ Error cargando componentes:", error);
    }
  }

  updateNavbarUser() {
    const user = this.getCurrentUser();
    const usernameElement = document.getElementById("navbar-username");
    if (usernameElement && user) {
      usernameElement.textContent = user.username;
    }
  }

  // ... el resto de app.js se mantiene igual (loadHTML, setupRouter, etc.)
  async loadHTML(containerId, file) {
    try {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      document.getElementById(containerId).innerHTML = html;
      console.log(`✅ ${file} cargado`);
    } catch (error) {
      console.error(`❌ Error cargando ${file}:`, error);
    }
  }

  initSidenavToggle() {
    const iconNavbarSidenav = document.getElementById("iconNavbarSidenav");
    const sidenav = document.getElementById("sidenav-main");

    if (iconNavbarSidenav && sidenav) {
      iconNavbarSidenav.addEventListener("click", () => {
        sidenav.classList.toggle("d-none");
      });
    }
  }

  setupRouter() {
    console.log("🔄 Configurando Hash Router...");

    window.addEventListener("hashchange", () => {
      console.log("📍 Cambio de hash:", window.location.hash);
      this.loadPage(this.getCurrentRoute());
    });

    document.addEventListener("click", (e) => {
      const link = e.target.closest("a");
      if (link && link.hasAttribute("data-route")) {
        e.preventDefault();
        const route = link.getAttribute("data-route");
        console.log("🔗 Click en navegación:", route);
        this.navigate(route);
      }
    });

    console.log("✅ Hash Router configurado");
  }

  getCurrentRoute() {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    console.log("📍 Ruta actual (hash):", hash);
    return hash;
  }

  async navigate(path) {
    console.log("🧭 Navegando a:", path);
    window.location.hash = path;
  }

  async loadPage(pageName) {
    const normalizedPageName =
      this.routes[`#${pageName}`] || pageName || "dashboard";
    console.log("📄 Cargando página:", normalizedPageName);

    document.getElementById("app-content").innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Cargando ${normalizedPageName}...</span>
                </div>
                <p class="text-muted mt-2">Cargando ${normalizedPageName}...</p>
            </div>
        `;

    try {
      const response = await fetch(`pages/${normalizedPageName}.html`);
      if (!response.ok)
        throw new Error(
          `HTTP ${response.status} - pages/${normalizedPageName}.html`
        );

      const html = await response.text();
      document.getElementById("app-content").innerHTML = html;
      this.currentPage = normalizedPageName;

      console.log("✅ HTML cargado, inicializando JS...");

      await this.loadPageScript(normalizedPageName);

      this.updateActiveNav();
      this.updateBreadcrumb(normalizedPageName);

      console.log("✅ Página cargada completamente:", normalizedPageName);
    } catch (error) {
      console.error("❌ Error cargando página:", error);
      this.showErrorPage(error);
    }
  }

  async loadPageScript(pageName) {
    try {
      if (pageName === "dashboard") {
        const module = await import("./pages/dashboard/index.js");
        if (module.default) {
          const pageInstance = new module.default();
          await pageInstance.init();
        }
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo cargar JS para ${pageName}:`, error);
    }
  }

  updateActiveNav() {
    console.log("🎯 Actualizando navegación activa...");
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    const activeLink = document.querySelector(
      `[data-route="${this.currentPage}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
      console.log("✅ Navegación actualizada:", this.currentPage);
    }
  }

  updateBreadcrumb(pageName) {
    const pageTitles = {
      dashboard: "Dashboard",
      products: "Productos",
      sales: "Ventas",
      clients: "Clientes",
      "cash-register": "Caja Registradora",
    };

    const breadcrumb = document.getElementById("current-page");
    const pageTitle = document.getElementById("page-title");

    if (breadcrumb)
      breadcrumb.textContent = pageTitles[pageName] || "Dashboard";
    if (pageTitle) pageTitle.textContent = pageTitles[pageName] || "Dashboard";
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
}

// Iniciar aplicación
new GestionARApp();
