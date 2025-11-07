// assets/js/pages/dashboard/dashboard-cards.js - VERSIÓN ACTUALIZADA CON SALES-FORM
class DashboardCardsManager {
  constructor() {
    this.cards = {
      "cash-card": {
        html: "assets/js/pages/dashboard/components/cash-card/cash-card.html",
        col: "col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4", // ✅ MÁS FLEXIBLE
        order: 1,
        priority: "high", // ✅ NUEVO: prioridad para layout
      },
      "sales-card": {
        html: "assets/js/pages/dashboard/components/sales-card/sales-card.html",
        col: "col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4",
        order: 2,
        priority: "high",
      },
      "stock-card": {
        html: "assets/js/pages/dashboard/components/stock-card/stock-card.html",
        col: "col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4",
        order: 3,
        priority: "high",
      },
      "clients-card": {
        html: "assets/js/pages/dashboard/components/clients-card/clients-card.html",
        col: "col-xl-3 col-lg-4 col-md-6 col-sm-12 mb-4",
        order: 4,
        priority: "medium",
      },
      "month-growth-card": {
        html: "assets/js/pages/dashboard/components/month-growth-card/month-growth-card.html",
        col: "col-xl-4 col-lg-6 col-md-6 col-sm-12 mb-4", // ✅ DIFERENTES TAMAÑOS
        order: 5,
        priority: "medium",
      },
      "month-sales-card": {
        html: "assets/js/pages/dashboard/components/month-sales-card/month-sales-card.html",
        col: "col-xl-4 col-lg-6 col-md-6 col-sm-12 mb-4",
        order: 6,
        priority: "medium",
      },
      "products-month-card": {
        html: "assets/js/pages/dashboard/components/products-month-card/products-month-card.html",
        col: "col-xl-4 col-lg-6 col-md-6 col-sm-12 mb-4",
        order: 7,
        priority: "medium",
      },
      "orders-card": {
        html: "assets/js/pages/dashboard/components/orders-card/orders-card.html",
        col: "col-xl-6 col-lg-6 col-md-12 col-sm-12 mb-4", // ✅ MÁS ANCHAS
        order: 8,
        priority: "low",
      },
    };
  }

  async loadCards(containerId = "cards-container") {
    console.log("🃏 Cargando tarjetas del dashboard...");
    const container = document.getElementById(containerId);

    if (!container) {
      console.error("❌ No se encontró el contenedor:", containerId);
      return;
    }

    // Limpiar contenedor
    container.innerHTML = "";

    // Ordenar tarjetas
    const sortedCards = Object.entries(this.cards).sort(
      ([, a], [, b]) => a.order - b.order
    );

    for (const [cardName, config] of sortedCards) {
      try {
        console.log(`📦 Cargando tarjeta: ${cardName}`);
        await this.loadCard(cardName, config, container);
      } catch (error) {
        console.error(`❌ Error cargando tarjeta ${cardName}:`, error);
      }
    }

    // Inicializar Sales Form después de cargar todas las tarjetas
    await this.initializeSalesForm();

    console.log("✅ Todas las tarjetas cargadas");
  }

  async loadCard(cardName, config, container) {
    // Cargar HTML
    const response = await fetch(config.html);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const cardElement = document.createElement("div");
    cardElement.className = config.col;
    cardElement.innerHTML = html;
    container.appendChild(cardElement);

    console.log(`✅ Tarjeta ${cardName} cargada`);

    // Inicializar JavaScript si existe
    await this.initializeCardJS(cardName, cardElement);
  }

  async initializeCardJS(cardName, cardElement) {
    try {
      // Importar dinámicamente el JS de la tarjeta
      const module = await import(`./components/${cardName}/${cardName}.js`);
      if (module.default) {
        const instance = new module.default(cardElement);

        // Hacer disponible globalmente si es necesario
        window[`${cardName.replace("-", "")}`] = instance;

        // Caso especial para cash-card - guardar referencia
        if (cardName === "cash-card") {
          window.cashCard = instance;
          console.log(
            "💰 CashCard disponible globalmente como window.cashCard"
          );
        }
      }
    } catch (error) {
      console.warn(`⚠️ No se pudo cargar JS para ${cardName}:`, error);
    }
  }

  async initializeSalesForm() {
    try {
      console.log("🛒 Inicializando Sales Form...");

      // Importar e inicializar SalesForm
      const SalesFormModule = await import("./sales-form.js");
      this.salesForm = new SalesFormModule.default();

      // Inicializar el formulario
      await this.salesForm.init();

      // Hacer disponible globalmente
      window.salesForm = this.salesForm;

      console.log(
        "✅ Sales Form inicializado y disponible como window.salesForm"
      );

      // Verificar que la función global esté disponible
      if (typeof window.mostrarFormularioVentas === "function") {
        console.log("✅ Función global mostrarFormularioVentas disponible");
      } else {
        console.warn("⚠️ Función global mostrarFormularioVentas no disponible");
      }
    } catch (error) {
      console.error("❌ Error inicializando Sales Form:", error);
    }
  }

  // Método para acceder al salesForm desde fuera
  getSalesForm() {
    return this.salesForm;
  }

  // Método para abrir el formulario de ventas programáticamente
  openSalesForm() {
    if (this.salesForm) {
      this.salesForm.open();
    } else if (typeof window.mostrarFormularioVentas === "function") {
      window.mostrarFormularioVentas();
    } else {
      console.error("❌ Sales Form no disponible");
    }
  }

  // Método para refrescar todas las tarjetas
  async refreshAllCards() {
    console.log("🔄 Refrescando todas las tarjetas...");

    // Refrescar cash-card si existe
    if (window.cashCard && typeof window.cashCard.refresh === "function") {
      await window.cashCard.refresh();
    }

    // Aquí puedes agregar la lógica para refrescar otras tarjetas
    // según sea necesario

    console.log("✅ Todas las tarjetas refrescadas");
  }
}

// Función global de inicialización mejorada
window.initCards = async function () {
  const manager = new DashboardCardsManager();
  await manager.loadCards("cards-container");

  // Hacer el manager disponible globalmente
  window.dashboardCardsManager = manager;

  return manager;
};

// Función global para abrir el formulario de ventas
window.abrirFormularioVentas = function () {
  if (window.dashboardCardsManager) {
    window.dashboardCardsManager.openSalesForm();
  } else if (typeof window.mostrarFormularioVentas === "function") {
    window.mostrarFormularioVentas();
  } else {
    console.error("❌ No se puede abrir el formulario de ventas");
    alert("El formulario de ventas no está disponible. Recarga la página.");
  }
};

export default DashboardCardsManager;
