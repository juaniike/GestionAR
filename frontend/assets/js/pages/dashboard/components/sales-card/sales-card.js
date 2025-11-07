// sales-card.js - VERSIÓN CORREGIDA CON ENDPOINT REAL
let isSalesCardInitialized = false;
let salesDataCache = null;

export async function initSalesCard() {
  if (isSalesCardInitialized) return;

  try {
    console.log("🔄 Inicializando sales card...");

    const user = getUserWithToken();
    if (!user?.token) {
      showSalesCardError("Usuario no autenticado");
      return;
    }

    // Verificar que el HTML esté cargado
    if (!document.getElementById("sales-card")) {
      console.warn("⚠️ Sales card HTML no encontrado");
      return;
    }

    await loadSalesData(user);
    isSalesCardInitialized = true;
  } catch (error) {
    console.error("❌ Error inicializando sales card:", error);
    showSalesCardError("Error cargando ventas");
  }
}

async function loadSalesData(user) {
  try {
    // ✅ ENDPOINT CORREGIDO - Usar el que SÍ existe
    const response = await fetch("http://localhost:3000/sales/report/daily", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const dailySalesData = await response.json();
    console.log("📊 Datos diarios recibidos:", dailySalesData);

    processDailySalesData(dailySalesData);
  } catch (error) {
    console.error("❌ Error cargando datos de ventas:", error);

    // Fallback al endpoint /view si existe
    await loadSalesDataFallback(user);
  }
}

function processDailySalesData(dailyData) {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    console.warn("⚠️ No hay datos de ventas diarias");
    showDefaultSalesData();
    return;
  }

  // Obtener ventas de hoy
  const today = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD
  const todaySales = dailyData.find((sale) => sale.day === today);

  const salesToday = todaySales ? parseFloat(todaySales.totalsales) : 0;
  const numSalesToday = todaySales ? parseInt(todaySales.numsales) : 0;

  console.log(`💰 Ventas hoy: $${salesToday}, Transacciones: ${numSalesToday}`);

  // Calcular cambio vs ayer
  const yesterday = getYesterdayDate();
  const yesterdaySales = dailyData.find((sale) => sale.day === yesterday);
  const salesYesterday = yesterdaySales
    ? parseFloat(yesterdaySales.totalsales)
    : 0;

  const changePercent = calculateChangePercent(salesToday, salesYesterday);
  const changeType = getChangeType(changePercent);

  updateSalesCard({
    salesToday: salesToday,
    changePercent: Math.abs(changePercent),
    changeType: changeType,
    progress: calculateProgress(salesToday),
    numSales: numSalesToday,
  });
}

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

async function loadSalesDataFallback(user) {
  try {
    console.log("🔄 Intentando fallback con endpoint /view...");
    const response = await fetch("http://localhost:3000/view", {
      headers: { Authorization: `Bearer ${user.token}` },
    });

    if (response.ok) {
      const consolidatedData = await response.json();
      processConsolidatedData(consolidatedData);
    } else {
      throw new Error("Fallback también falló");
    }
  } catch (fallbackError) {
    console.error("❌ Fallback también falló:", fallbackError);
    showDefaultSalesData();
  }
}

function processConsolidatedData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    showDefaultSalesData();
    return;
  }

  const consolidated = data[0];
  const salesToday = parseFloat(consolidated.totalSalesToday) || 0;

  // Calcular cambio real vs ayer (si hay datos históricos)
  const salesYesterday = parseFloat(consolidated.totalSalesYesterday) || 0;
  const changePercent = calculateChangePercent(salesToday, salesYesterday);

  updateSalesCard({
    salesToday: salesToday,
    changePercent: Math.abs(changePercent),
    changeType: getChangeType(changePercent),
    progress: calculateProgress(salesToday),
    numSales: 0, // No disponible en este endpoint
  });
}

function calculateChangePercent(today, yesterday) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return ((today - yesterday) / yesterday) * 100;
}

function getChangeType(changePercent) {
  if (changePercent > 0) return "increase";
  if (changePercent < 0) return "decrease";
  return "equal";
}

function calculateProgress(salesToday, target = 50000) {
  // Target ajustable según tu negocio
  return Math.min((salesToday / target) * 100, 100);
}

function updateSalesCard(data) {
  // ✅ Selectores robustos con IDs
  const amountElement = document.getElementById("sales-amount");
  const changeElement = document.getElementById("sales-change");
  const progressBar = document.getElementById("sales-progress");

  if (amountElement) {
    amountElement.textContent = `$${data.salesToday.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (changeElement) {
    const sign =
      data.changeType === "increase"
        ? "+"
        : data.changeType === "decrease"
        ? "-"
        : "";
    changeElement.textContent = `${sign}${data.changePercent.toFixed(1)}%`;

    changeElement.className = `small ${
      data.changeType === "increase"
        ? "text-success"
        : data.changeType === "decrease"
        ? "text-danger"
        : "text-muted"
    } mb-0`;
  }

  if (progressBar) {
    progressBar.style.width = `${data.progress}%`;
    progressBar.className = `progress-bar ${
      data.progress >= 80
        ? "bg-success"
        : data.progress >= 50
        ? "bg-warning"
        : "bg-info"
    }`;
  }

  // Log para debugging
  console.log("✅ Sales card actualizada:", data);
}

function showDefaultSalesData() {
  updateSalesCard({
    salesToday: 0,
    changePercent: 0,
    changeType: "equal",
    progress: 0,
    numSales: 0,
  });
}

function showSalesCardError(message) {
  const amountElement = document.getElementById("sales-amount");
  if (amountElement) {
    amountElement.textContent = "Error";
    amountElement.className = "text-danger";
  }

  const changeElement = document.getElementById("sales-change");
  if (changeElement) {
    changeElement.textContent = message;
    changeElement.className = "small text-danger mb-0";
  }
}

// ✅ Función auxiliar consistente con otros módulos
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

// ✅ Función para refrescar desde otros módulos
export async function refreshSalesCard() {
  isSalesCardInitialized = false;
  await initSalesCard();
}

// ✅ Hacer disponible globalmente si es necesario
window.refreshSalesCard = refreshSalesCard;
