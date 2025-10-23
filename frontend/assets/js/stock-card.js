// stock-card.js - INTEGRADO CON MATERIAL DASHBOARD
let isStockCardInitialized = false;

export async function initStockCard() {
  if (isStockCardInitialized) return;
  isStockCardInitialized = true;

  await waitForMaterialDashboard();

  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) {
      console.warn("⚠️ Usuario no autenticado para stock-card");
      return;
    }

    console.log("🔄 Cargando datos de stock...");
    const response = await fetch("http://localhost:3000/products", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const products = await response.json();
    console.log("📦 Productos recibidos:", products.length);
    processStockData(products);
  } catch (error) {
    console.error("❌ Error en stock-card:", error);
    showDefaultStockData();
  }
}

function processStockData(products) {
  if (!Array.isArray(products)) {
    console.warn("⚠️ No hay datos de productos");
    showDefaultStockData();
    return;
  }

  let critical = 0,
    stable = 0,
    overstock = 0;

  products.forEach((product) => {
    const stock = product.stock || 0;
    const minStock = product.minstock || 5;

    if (stock <= minStock) {
      critical++; // Stock por debajo o igual al mínimo
    } else if (stock > minStock * 3) {
      overstock++; // Más del 300% del stock mínimo
    } else {
      stable++; // Stock normal
    }
  });

  console.log(
    `📊 Stock - Crítico: ${critical}, Estable: ${stable}, Sobrestock: ${overstock}`
  );
  updateStockCard({ critical, stable, overstock });
}

function updateStockCard(data) {
  const stockCard = document.querySelector(".card-summary.info");
  if (!stockCard) {
    console.error("❌ No se encontró la tarjeta de stock");
    return;
  }

  // Actualizar números
  const criticalElement = document.getElementById("stock-critical");
  const stableElement = document.getElementById("stock-stable");
  const overElement = document.getElementById("stock-over");

  if (criticalElement) {
    criticalElement.textContent = data.critical;
    console.log("✅ Stock crítico actualizado:", data.critical);
  }
  if (stableElement) {
    stableElement.textContent = data.stable;
    console.log("✅ Stock estable actualizado:", data.stable);
  }
  if (overElement) {
    overElement.textContent = data.overstock;
    console.log("✅ Sobrestock actualizado:", data.overstock);
  }

  // Actualizar barra de progreso
  const total = data.critical + data.stable + data.overstock;
  if (total > 0) {
    const criticalPercent = (data.critical / total) * 100;
    const stablePercent = (data.stable / total) * 100;
    const overPercent = (data.overstock / total) * 100;

    const progressBar = stockCard.querySelector(".progress-bar.bg-danger");
    if (progressBar) {
      progressBar.style.width = `${criticalPercent}%`;
      progressBar.setAttribute("aria-valuenow", criticalPercent);
    }

    const stableBar = stockCard.querySelector(".progress-bar.bg-success");
    if (stableBar) {
      stableBar.style.width = `${stablePercent}%`;
      stableBar.setAttribute("aria-valuenow", stablePercent);
    }

    const overBar = stockCard.querySelector(".progress-bar.bg-warning");
    if (overBar) {
      overBar.style.width = `${overPercent}%`;
      overBar.setAttribute("aria-valuenow", overPercent);
    }

    console.log("✅ Barras de progreso actualizadas");
  }

  // Actualizar timestamp
  const timestamp = stockCard.querySelector(".small.text-muted");
  if (timestamp) {
    const now = new Date();
    timestamp.textContent = `Última actualización: ${now.toLocaleTimeString()}`;
    console.log("✅ Timestamp actualizado");
  }
}

function showDefaultStockData() {
  console.log("🔄 Mostrando datos por defecto para stock");
  updateStockCard({ critical: 0, stable: 0, overstock: 0 });
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
