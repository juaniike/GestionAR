// orders-card.js - INTEGRADO CON MATERIAL DASHBOARD
let isOrdersCardInitialized = false;

export async function initOrdersCard() {
  if (isOrdersCardInitialized) return;
  isOrdersCardInitialized = true;

  await waitForMaterialDashboard();

  try {
    console.log("🔄 Cargando datos de pedidos...");

    // Por ahora datos mock - puedes conectar con endpoint real después
    const ordersData = await fetchOrdersData();
    console.log("📋 Datos de pedidos:", ordersData);
    updateOrdersCard(ordersData);
  } catch (error) {
    console.error("❌ Error en orders-card:", error);
    showDefaultOrdersData();
  }
}

async function fetchOrdersData() {
  // Mock data - reemplazar con endpoint real cuando lo tengas
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        pending: Math.floor(Math.random() * 10) + 1, // 1-10 pedidos
        newOrders: Math.floor(Math.random() * 5) + 1, // 1-5 nuevos
        avgTime: `${Math.floor(Math.random() * 3) + 1} días`, // 1-3 días
      });
    }, 500);
  });
}

function updateOrdersCard(data) {
  const ordersCard = document.querySelector(".card-summary.warning");
  if (!ordersCard) {
    console.error("❌ No se encontró la tarjeta de pedidos");
    return;
  }

  // Actualizar número principal
  const amountElement = ordersCard.querySelector("h5");
  if (amountElement) {
    amountElement.textContent = data.pending;
    console.log("✅ Pedidos pendientes actualizados:", data.pending);
  }

  // Actualizar detalles
  const detailsElements = ordersCard.querySelectorAll(".small");
  if (detailsElements.length >= 2) {
    detailsElements[0].textContent = `Pedidos nuevos: ${data.newOrders}`;
    detailsElements[1].textContent = `Tiempo promedio: ${data.avgTime}`;
    console.log("✅ Detalles de pedidos actualizados");
  }

  // Barra de progreso
  const progressBar = ordersCard.querySelector(".progress-bar");
  if (progressBar) {
    const progress = Math.min((data.pending / 15) * 100, 100); // Alerta si >15 pedidos
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute("aria-valuenow", progress);
    console.log("✅ Barra de progreso de pedidos actualizada");
  }
}

function showDefaultOrdersData() {
  console.log("🔄 Mostrando datos por defecto para pedidos");
  updateOrdersCard({ pending: 0, newOrders: 0, avgTime: "0 días" });
}

function waitForMaterialDashboard() {
  return new Promise((resolve) => {
    if (typeof materialDashboard !== "undefined") {
      resolve();
    } else {
      setTimeout(() => resolve(), 100);
    }
  });
}
