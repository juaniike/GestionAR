// assets/js/view-manager.js
let currentView = "dashboard";

export const ViewManager = {
  views: {},

  registerView(name, showCallback, hideCallback) {
    this.views[name] = { show: showCallback, hide: hideCallback };
    console.log(`✅ Vista registrada: ${name}`);
  },

  async showView(name) {
    // Ocultar vista actual
    if (this.views[currentView]?.hide) {
      await this.views[currentView].hide();
    }

    // Mostrar nueva vista
    if (this.views[name]?.show) {
      await this.views[name].show();
      currentView = name;
      console.log(`🔀 Cambiado a vista: ${name}`);

      // Actualizar navegación activa
      this.updateActiveNav(name);
    } else {
      console.error(`❌ Vista no encontrada: ${name}`);
    }
  },

  updateActiveNav(activeTarget) {
    // Remover clase activa de todos los nav items
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
      link.classList.remove("bg-gradient-primary");
    });

    // Agregar clase activa al nav item actual
    const activeLink = document.querySelector(
      `[data-target="${activeTarget}"]`
    );
    if (activeLink) {
      activeLink.classList.add("active");
      activeLink.classList.add("bg-gradient-primary");
    }
  },

  getCurrentView() {
    return currentView;
  },
};
