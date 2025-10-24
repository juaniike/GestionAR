// clients-card.js - INTEGRADO CON MATERIAL DASHBOARD
let isClientsCardInitialized = false;

export async function initClientsCard() {
  if (isClientsCardInitialized) return;
  isClientsCardInitialized = true;

  await waitForMaterialDashboard();

  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) {
      console.warn("⚠️ Usuario no autenticado para clients-card");
      return;
    }

    console.log("🔄 Cargando datos de clientes...");
    const response = await fetch("http://localhost:3000/clients", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const clients = await response.json();
    console.log("👥 Clientes recibidos:", clients.length);
    processClientsData(clients);
  } catch (error) {
    console.error("❌ Error en clients-card:", error);
    showDefaultClientsData();
  }
}

function processClientsData(clients) {
  if (!Array.isArray(clients)) {
    console.warn("⚠️ No hay datos de clientes");
    showDefaultClientsData();
    return;
  }

  const clientsWithDebt = clients.filter((client) => {
    const balance = parseFloat(client.balance) || 0;
    return balance < 0;
  });

  const totalDebt = clientsWithDebt.reduce((sum, client) => {
    return sum + Math.abs(parseFloat(client.balance) || 0);
  }, 0);

  const lastClient =
    clientsWithDebt.length > 0
      ? clientsWithDebt[clientsWithDebt.length - 1].name
      : "Ninguno";

  console.log(
    `💰 Clientes con deuda: ${clientsWithDebt.length}, Total: $${totalDebt}`
  );

  updateClientsCard({
    debtCount: clientsWithDebt.length,
    totalDebt: totalDebt,
    lastClient: lastClient,
  });
}

function updateClientsCard(data) {
  const clientsCard = document.querySelector(".card-summary.danger");
  if (!clientsCard) {
    console.error("❌ No se encontró la tarjeta de clientes");
    return;
  }

  // Actualizar número principal
  const amountElement = clientsCard.querySelector("h5");
  if (amountElement) {
    amountElement.textContent = data.debtCount;
    console.log("✅ Clientes con deuda actualizados:", data.debtCount);
  }

  // Actualizar detalles
  const detailsElements = clientsCard.querySelectorAll(".small");
  if (detailsElements.length >= 2) {
    detailsElements[0].textContent = `Último cliente: ${data.lastClient}`;
    detailsElements[1].textContent = `Monto total: $${data.totalDebt.toFixed(
      2
    )}`;
    console.log("✅ Detalles de clientes actualizados");
  }

  // Barra de progreso
  const progressBar = clientsCard.querySelector(".progress-bar");
  if (progressBar) {
    const progress = Math.min((data.debtCount / 8) * 100, 100); // Alerta si >8 clientes con deuda
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute("aria-valuenow", progress);
    console.log("✅ Barra de progreso de clientes actualizada");
  }
}

function showDefaultClientsData() {
  console.log("🔄 Mostrando datos por defecto para clientes");
  updateClientsCard({ debtCount: 0, totalDebt: 0, lastClient: "Ninguno" });
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
