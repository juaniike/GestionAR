import { initCards } from "./dashboard-cards.js";
import { initSalesForm } from "./sales-form.js";
import { initCashCard } from "./cash-card.js";
import { initStockCard } from "./stock-card.js"; // ✅ NUEVO IMPORT

function getUserWithToken() {
  try {
    const user =
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user"));
    const token =
      sessionStorage.getItem("token") ||
      localStorage.getItem("token") ||
      (user && user.token);
    return user && token ? { ...user, token } : null;
  } catch (error) {
    return null;
  }
}

async function loadComponent(id, url) {
  try {
    const resp = await fetch(url);
    const html = await resp.text();
    document.getElementById(id).innerHTML = html;
  } catch (err) {
    console.error(`Error cargando componente ${id}:`, err);
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
  const user = getUserWithToken();

  if (!user) {
    window.location.href = "./sign-in.html";
    return;
  }

  // Actualizar nombre de usuario
  const usernameSpan = document.getElementById("navbar-username");
  if (usernameSpan) usernameSpan.textContent = user.username;

  // Cargar componentes estructurales
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

  // ✅ INICIALIZAR STOCK CARD
  await initStockCard();

  // Inicializar cash card
  await initCashCard(user);

  console.log("✅ Dashboard completamente inicializado");
});

// ❌ ELIMINAR estas líneas (se moverán a products.js)
// Ya no van aquí porque pertenecen al módulo de productos
