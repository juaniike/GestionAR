import { initCards } from "./dashboard-cards.js";
import { initSalesForm } from "./sales-form.js";
import { initCashCard } from "./cash-card.js";
import { initStockCard } from "./stock-card.js";

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

// ✅ FUNCIÓN PARA INICIALIZAR MATERIAL DASHBOARD SIN CONFLICTOS
function initializeMaterialDashboard() {
  if (typeof materialDashboard !== "undefined") {
    console.log("🎨 Inicializando Material Dashboard...");

    // Solo inicializar tooltips, dejar que Material Dashboard maneje el resto
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

// ✅ FUNCIÓN PARA ACTUALIZAR STOCK CARD DESDE OTROS MÓDULOS
window.refreshStockCard = async function () {
  if (window.stockCard && typeof window.stockCard.refresh === "function") {
    await window.stockCard.refresh();
    console.log("🔄 Stock card actualizada desde dashboard");
  }
};

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

  // Inicializar Material Dashboard
  initializeMaterialDashboard();

  // Inicializar todas las cards
  await initCards();
  await initSalesForm();
  await initCashCard(user);

  // ✅ INICIALIZAR STOCK CARD
  await initStockCard();

  console.log("✅ Dashboard completamente inicializado");
});
