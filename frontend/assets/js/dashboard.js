import { initCards } from "./dashboard-cards.js";
import { initSalesForm } from "./sales-form.js";
import { initCashCard } from "./cash-card.js";

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

  // Inicializar todas las cards (EXCEPTO cash-card)
  await initCards();
  await initSalesForm();

  // Inicializar cash card (solo una vez)
  initCashCard(user);
});
