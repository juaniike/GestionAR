// assets/js/pages/dashboard/index.js - VERSIÓN COMPATIBLE
class DashboardPage {
  constructor() {
    console.log("📊 DashboardPage creado");
  }

  async init() {
    console.log("🚀 Inicializando Dashboard...");

    try {
      // 1. Cargar usuario (compatibilidad con sistema antiguo)
      const user = this.getCurrentUser();
      if (!user) {
        console.warn("⚠️ Usuario no autenticado");
        return;
      }

      // 2. Actualizar UI
      this.updateUserInterface(user);

      // 3. ✅ COMPATIBILIDAD: Cargar sistema de tarjetas
      await this.loadDashboardCards();

      // 4. ✅ COMPATIBILIDAD: Verificar sales-form
      this.verifySalesForm();

      console.log("✅ Dashboard inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando dashboard:", error);
    }
  }

  getCurrentUser() {
    try {
      // Compatibilidad con sistema de autenticación existente
      const user =
        JSON.parse(sessionStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("user"));
      return user || null;
    } catch (error) {
      console.error("Error obteniendo usuario:", error);
      return null;
    }
  }

  updateUserInterface(user) {
    // Actualizar navbar (compatibilidad)
    const usernameElement = document.getElementById("navbar-username");
    if (usernameElement && user?.username) {
      usernameElement.textContent = user.username;
    }
  }

  async loadDashboardCards() {
    try {
      // ✅ COMPATIBILIDAD: Cargar el sistema de tarjetas
      const { default: DashboardCardsManager } = await import(
        "./dashboard-cards.js"
      );
      const cardsManager = new DashboardCardsManager();
      await cardsManager.loadCards("cards-container");
      console.log("✅ Sistema de tarjetas cargado");
    } catch (error) {
      console.error("❌ Error cargando tarjetas:", error);
    }
  }

  verifySalesForm() {
    // ✅ COMPATIBILIDAD: SalesForm se carga automáticamente
    if (typeof window.mostrarFormularioVentas === "function") {
      console.log("✅ Sales Form disponible");
    } else {
      console.warn("⚠️ Sales Form no disponible");
    }
  }
}

export default DashboardPage;
