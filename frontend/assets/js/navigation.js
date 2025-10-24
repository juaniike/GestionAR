// assets/js/navigation.js
import { ViewManager } from "./view-manager.js";

export async function initNavigation() {
  console.log("🔄 Inicializando navegación...");

  // Registrar vistas
  ViewManager.registerView("dashboard", showDashboard, hideDashboard);
  ViewManager.registerView("products", showProducts, hideProducts);

  // Configurar eventos
  setupNavigationEvents();

  console.log("✅ Navegación inicializada");
}

function setupNavigationEvents() {
  // Navegación del sidebar
  document.addEventListener("click", (e) => {
    const navLink = e.target.closest(".nav-link");
    if (!navLink) return;

    const target = navLink.getAttribute("data-target");
    if (target) {
      e.preventDefault();
      ViewManager.showView(target);
    }
  });
}

// Funciones específicas de vistas
function showDashboard() {
  const dashboard = document.querySelector(".container-fluid.py-4");
  if (dashboard) {
    dashboard.style.display = "block";
  }
  console.log("✅ Dashboard mostrado");
  return Promise.resolve();
}

function hideDashboard() {
  const dashboard = document.querySelector(".container-fluid.py-4");
  if (dashboard) {
    dashboard.style.display = "none";
  }
  console.log("✅ Dashboard ocultado");
  return Promise.resolve();
}

function showProducts() {
  if (window.showProductsPanel) {
    return window.showProductsPanel();
  }
  return Promise.resolve();
}

function hideProducts() {
  if (window.hideProductsPanel) {
    return window.hideProductsPanel();
  }
  return Promise.resolve();
}
