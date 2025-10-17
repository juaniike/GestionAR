// dashboard-cards.js
async function loadCard(containerId, filePath, initCardEvents) {
  const res = await fetch(filePath);
  const html = await res.text();
  const container = document.getElementById(containerId);
  container.innerHTML += html;

  if (typeof initCardEvents === "function") {
    initCardEvents(container);
  }
}

// Cargar todas las cards
export async function initCards() {
  await loadCard("cards-container", "components/cards/cash-card.html");
  await loadCard("cards-container", "components/cards/sales-card.html");
  await loadCard("cards-container", "components/cards/orders-card.html");
  await loadCard("cards-container", "components/cards/clients-card.html");
  await loadCard("cards-container", "components/cards/stock-card.html");
  await loadCard("cards-graph", "components/cards/month-growth-card.html");
  await loadCard("cards-graph", "components/cards/month-sales-card.html");
  await loadCard("cards-graph", "components/cards/products-month-card.html");
}
