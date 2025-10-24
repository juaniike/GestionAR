// charts.js - INTEGRADO CON MATERIAL DASHBOARD
let areChartsInitialized = false;

export async function initCharts() {
  if (areChartsInitialized) return;
  areChartsInitialized = true;

  // Esperar a que Chart.js esté disponible (viene con Material Dashboard)
  await waitForCharts();

  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) return;

    console.log("🔄 Cargando datos para gráficos...");
    const response = await fetch("http://localhost:3000/view", {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const consolidatedData = await response.json();
    renderMaterialCharts(consolidatedData);
  } catch (error) {
    console.error("❌ Error en charts:", error);
    renderDefaultMaterialCharts();
  }
}

function renderMaterialCharts(data) {
  if (!Array.isArray(data) || data.length === 0) {
    renderDefaultMaterialCharts();
    return;
  }

  const consolidated = data[0];

  // Gráfico de Ventas del Mes
  renderSalesChart(consolidated);

  // Gráfico de Productos Más Vendidos
  renderProductsChart(consolidated);

  // Gráfico de Crecimiento
  renderGrowthChart(consolidated);
}

function renderSalesChart(data) {
  const ctx = document.getElementById("chart-sales");
  if (!ctx) {
    console.warn("⚠️ No se encontró canvas para chart-sales");
    return;
  }

  // Usar Chart.js que viene con Material Dashboard
  const salesChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Sem 1", "Sem 2", "Sem 3", "Sem 4"],
      datasets: [
        {
          label: "Ventas Semanales",
          data: [1200, 1900, 1500, parseFloat(data.totalSalesToday) || 0],
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Ventas del Mes",
        },
      },
    },
  });

  console.log("✅ Gráfico de ventas renderizado");
}

function renderProductsChart(data) {
  const ctx = document.getElementById("chart-products-month");
  if (!ctx) {
    console.warn("⚠️ No se encontró canvas para chart-products");
    return;
  }

  const productsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Producto A", "Producto B", "Producto C", "Producto D"],
      datasets: [
        {
          label: "Unidades Vendidas",
          data: [65, 59, 80, 81],
          backgroundColor: [
            "rgba(255, 99, 132, 0.2)",
            "rgba(255, 159, 64, 0.2)",
            "rgba(255, 205, 86, 0.2)",
            "rgba(75, 192, 192, 0.2)",
          ],
          borderColor: [
            "rgb(255, 99, 132)",
            "rgb(255, 159, 64)",
            "rgb(255, 205, 86)",
            "rgb(75, 192, 192)",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Productos Más Vendidos",
        },
      },
    },
  });

  console.log("✅ Gráfico de productos renderizado");
}

function renderGrowthChart(data) {
  const ctx = document.getElementById("chart-growth-month");
  if (!ctx) {
    console.warn("⚠️ No se encontró canvas para chart-growth");
    return;
  }

  const growthChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Crecimiento", "Meta"],
      datasets: [
        {
          label: "Crecimiento Mensual",
          data: [75, 25],
          backgroundColor: ["rgb(54, 162, 235)", "rgb(201, 203, 207)"],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: "Tasa de Crecimiento",
        },
      },
    },
  });

  console.log("✅ Gráfico de crecimiento renderizado");
}

function renderDefaultMaterialCharts() {
  console.log("🔄 Renderizando gráficos por defecto");
  // Renderizar gráficos con datos de ejemplo
  renderSalesChart({});
  renderProductsChart({});
  renderGrowthChart({});
}

function waitForCharts() {
  return new Promise((resolve) => {
    if (typeof Chart !== "undefined") {
      resolve();
    } else {
      // Intentar cada 100ms hasta que Chart esté disponible
      const checkChart = setInterval(() => {
        if (typeof Chart !== "undefined") {
          clearInterval(checkChart);
          resolve();
        }
      }, 100);
    }
  });
}
