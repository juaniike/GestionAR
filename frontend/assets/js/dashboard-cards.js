// dashboard-cards.js - COORDINADOR PRINCIPAL ACTUALIZADO
import { initSalesCard } from "./sales-card.js";
import { initStockCard } from "./stock-card.js";
import { initOrdersCard } from "./orders-card.js";
import { initClientsCard } from "./clients-card.js";
import { initCharts } from "./charts.js";

async function loadCard(containerId, filePath, initCardFunction) {
  try {
    console.log(`🔄 Cargando tarjeta: ${filePath}`);
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`HTTP ${res.status} para ${filePath}`);

    const html = await res.text();
    const container = document.getElementById(containerId);

    if (!container) {
      console.error(`❌ Contenedor no encontrado: ${containerId}`);
      return;
    }

    container.innerHTML += html;
    console.log(`✅ Tarjeta HTML cargada: ${filePath}`);

    if (typeof initCardFunction === "function") {
      await initCardFunction();
      console.log(`✅ Tarjeta inicializada: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error cargando tarjeta ${filePath}:`, error);
  }
}

export async function initCards() {
  console.log("🎯 Inicializando sistema de tarjetas...");

  try {
    // Tarjetas principales
    await loadCard("cards-container", "components/cards/cash-card.html");
    await loadCard(
      "cards-container",
      "components/cards/sales-card.html",
      initSalesCard
    );
    await loadCard(
      "cards-container",
      "components/cards/stock-card.html",
      initStockCard
    );
    await loadCard(
      "cards-container",
      "components/cards/orders-card.html",
      initOrdersCard
    );
    await loadCard(
      "cards-container",
      "components/cards/clients-card.html",
      initClientsCard
    );

    // Gráficos
    await loadCard(
      "cards-graph",
      "components/cards/month-sales-card.html",
      initCharts
    );
    await loadCard(
      "cards-graph",
      "components/cards/products-month-card.html",
      initCharts
    );
    await loadCard(
      "cards-graph",
      "components/cards/month-growth-card.html",
      initCharts
    );

    console.log("✅ Sistema de tarjetas completamente inicializado");
  } catch (error) {
    console.error("❌ Error en initCards:", error);
  }
}
