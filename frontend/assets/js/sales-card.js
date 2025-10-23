// sales-card.js - TARJETA VENTAS HOY
let isSalesCardInitialized = false;

export async function initSalesCard() {
  if (isSalesCardInitialized) return;
  isSalesCardInitialized = true;

  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) return;

    const response = await fetch("http://localhost:3000/view", {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const consolidatedData = await response.json();
    processSalesData(consolidatedData);
  } catch (error) {
    console.error("Error en sales-card:", error);
    showDefaultSalesData();
  }
}

function processSalesData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    showDefaultSalesData();
    return;
  }

  const consolidated = data[0];
  const salesToday = parseFloat(consolidated.totalSalesToday) || 0;

  updateSalesCard({
    salesToday: salesToday,
    changePercent: salesToday > 0 ? 15 : 0, // Temporal - luego con histórico
    changeType: salesToday > 0 ? "increase" : "equal",
  });
}

function updateSalesCard(data) {
  const salesCard = document.querySelector(".card-summary.success");
  if (!salesCard) return;

  // Actualizar monto
  const amountElement = salesCard.querySelector("h5");
  if (amountElement) {
    amountElement.textContent = `$${data.salesToday.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Actualizar comparación
  const changeElement = salesCard.querySelector(".small.text-muted + .small");
  if (changeElement) {
    const sign =
      data.changeType === "increase"
        ? "+"
        : data.changeType === "decrease"
        ? "-"
        : "";
    changeElement.textContent = `${sign}${data.changePercent}%`;
    changeElement.className = `small ${
      data.changeType === "increase"
        ? "text-success"
        : data.changeType === "decrease"
        ? "text-danger"
        : "text-muted"
    } mb-0`;
  }

  // Barra de progreso
  const progressBar = salesCard.querySelector(".progress-bar");
  if (progressBar) {
    const progress = Math.min((data.salesToday / 2000) * 100, 100);
    progressBar.style.width = `${progress}%`;
  }
}

function showDefaultSalesData() {
  updateSalesCard({
    salesToday: 0,
    changePercent: 0,
    changeType: "equal",
  });
}
