// assets/js/dashboard.js
import { initCards } from "./dashboard-cards.js";
import { initSalesForm } from "./sales-form.js";
import { initCashCard } from "./cash-card.js";
import { initProductsPanel } from "./products.js";
import { initNavigation } from "./navigation.js";
import { ViewManager } from "./view-manager.js"; // 👈 Nuevo import

function getUserWithToken() {
  try {
    const user =
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user"));
    return user && user.token ? user : null;
  } catch (error) {
    console.error("❌ Error obteniendo usuario:", error);
    return null;
  }
}

async function loadComponent(id, url) {
  try {
    console.log(`🔄 Cargando componente: ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    document.getElementById(id).innerHTML = html;
    console.log(`✅ Componente cargado: ${id}`);
  } catch (err) {
    console.error(`❌ Error cargando componente ${id}:`, err);
  }
}

function initializeMaterialDashboard() {
  if (typeof materialDashboard !== "undefined") {
    console.log("🎨 Inicializando Material Dashboard...");
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    console.log("✅ Material Dashboard inicializado");
  } else {
    console.warn("⚠️ Material Dashboard no disponible");
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando aplicación GestionAR...");

  const user = getUserWithToken();
  if (!user) {
    console.warn("⚠️ Usuario no autenticado, redirigiendo...");
    window.location.href = "./sign-in.html";
    return;
  }

  console.log(`👋 Bienvenido, ${user.username}`);

  // Actualizar nombre de usuario en navbar
  const usernameSpan = document.getElementById("navbar-username");
  if (usernameSpan) {
    usernameSpan.textContent = user.username;
    console.log("✅ Nombre de usuario actualizado");
  }

  // Cargar componentes estructurales
  console.log("🔄 Cargando componentes estructurales...");
  await Promise.all([
    loadComponent("sidenav-container", "components/sidenav.html"),
    loadComponent("navbar-container", "components/navbar.html"),
    loadComponent("footer-container", "components/footer.html"),
  ]);

  // Inicializar sistemas
  console.log("🔄 Inicializando navegación...");
  await initNavigation();

  console.log("🔄 Precargando panel de productos...");
  await initProductsPanel();

  // Inicializar componentes del dashboard (vista por defecto)
  console.log("🔄 Inicializando dashboard...");
  await initCards();
  await initSalesForm();
  await initCashCard(user);

  // Inicializar Material Dashboard
  initializeMaterialDashboard();

  // ✅ Asegurar que el dashboard sea la vista activa inicial
  setTimeout(() => {
    const dashboardLink = document.querySelector('[data-target="dashboard"]');
    if (dashboardLink) {
      dashboardLink.classList.add("active");
    }
  }, 100);

  console.log("🎉 Aplicación GestionAR completamente cargada y lista");
});
