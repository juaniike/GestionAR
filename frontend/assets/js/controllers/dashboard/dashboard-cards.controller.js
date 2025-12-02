// assets/js/controllers/dashboard/dashboard-cards.controller.js - VERSIÓN CON GRÁFICOS
import { showAlert } from "../../plugins/alerts.js";

class DashboardCardsManager {
  constructor(
    dashboardService,
    salesService,
    productsService,
    clientsService,
    cashService
  ) {
    // ✅ VERIFICAR que los servicios existen
    console.log("🔍 [DashboardCardsManager] Servicios recibidos:", {
      dashboard: !!dashboardService,
      sales: !!salesService,
      products: !!productsService,
      clients: !!clientsService,
      cash: !!cashService,
    });

    this.services = {
      dashboard: dashboardService,
      sales: salesService,
      products: productsService,
      clients: clientsService,
      cash: cashService,
    };

    this.cardInstances = new Map();
    this.chartInstances = new Map(); // ✅ NUEVO: Instancias de gráficos
    this.advancedMetrics = null;

    // Estructura organizada por secciones
    this.sections = {
      performance: [
        {
          name: "sales-today",
          title: "📈 Performance Comercial",
          cols: "col-xl-3 col-md-6",
        },
        { name: "average-ticket", title: "", cols: "col-xl-3 col-md-6" },
        { name: "profit-margin", title: "", cols: "col-xl-3 col-md-6" },
        { name: "inventory-turnover", title: "", cols: "col-xl-3 col-md-6" },
      ],
      inventory: [
        {
          name: "stock-alerts",
          title: "📦 Gestión de Inventario",
          cols: "col-xl-4 col-md-6",
        },
        { name: "inventory-value", title: "", cols: "col-xl-4 col-md-6" },
        { name: "abc-analysis", title: "", cols: "col-xl-4 col-md-6" },
      ],
      clients: [
        {
          name: "active-clients",
          title: "👥 Clientes & Finanzas",
          cols: "col-xl-3 col-md-6",
        },
        { name: "vip-clients", title: "", cols: "col-xl-3 col-md-6" },
        { name: "cash-status", title: "", cols: "col-xl-3 col-md-6" },
        { name: "overall-efficiency", title: "", cols: "col-xl-3 col-md-6" },
      ],
    };

    // ✅ NUEVO: Configuración de gráficos
    this.chartsConfig = [
      {
        name: "sales-trend",
        title: "📈 Tendencia de Ventas",
        cols: "col-12", // ← OCUPA TODA LA PANTALLA
        description: "Evolución de ventas y transacciones últimos 30 días",
      },
      {
        name: "cash-flow",
        title: "💰 Flujo de Caja",
        cols: "col-12", // ← OCUPA TODA LA PANTALLA
        description: "Ingresos vs Egresos últimos 15 días",
      },
      {
        name: "inventory-metrics",
        title: "📦 Métricas de Inventario",
        cols: "col-12", // ← OCUPA TODA LA PANTALLA
        description: "Valor de inventario y alertas de stock",
      },
      {
        name: "clients-metrics",
        title: "👥 Comportamiento de Clientes",
        cols: "col-12", // ← OCUPA TODA LA PANTALLA
        description: "Evolución de base de clientes y actividad",
      },
    ];

    console.log(
      "📊 [DashboardCardsManager] Inicializado con estructura modular + gráficos"
    );
  }

  async loadCards(containerId = "cards-container") {
    try {
      console.log("🔄 [DashboardCardsManager] Cargando dashboard completo...");

      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Contenedor #${containerId} no encontrado`);
      }

      // Limpiar container
      container.innerHTML = "";

      // Calcular métricas avanzadas primero
      await this.calculateAdvancedMetrics();

      // Cargar cards por secciones
      await this.loadCardsSections(containerId);

      // ✅ NUEVO: Cargar gráficos después de las cards
      await this.loadChartsSection("charts-container");

      console.log(
        "✅ [DashboardCardsManager] Dashboard completo cargado (cards + gráficos)"
      );

      // Debug opcional
      if (window.location.hash.includes("debug")) {
        this.debugDashboard();
      }
    } catch (error) {
      console.error(
        "❌ [DashboardCardsManager] Error cargando dashboard:",
        error
      );
      this.renderErrorState(containerId, error);
    }
  }

  // ✅ NUEVO: Método separado para cargar solo las cards
  async loadCardsSections(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Cargar cards por secciones
    await this.loadSection("performance", container);
    await this.loadSection("inventory", container);
    await this.loadSection("clients", container);
  }

  async loadSection(sectionName, container) {
    const sectionConfig = this.sections[sectionName];
    if (!sectionConfig) return;

    // Crear contenedor de sección
    const sectionDiv = document.createElement("div");
    sectionDiv.className = "dashboard-section";

    // Agregar header de sección si tiene título
    const firstCard = sectionConfig[0];
    if (firstCard && firstCard.title) {
      const headerHTML = `
      <div class="row section-header">
        <div class="col-12">
          <h6 class="text-uppercase text-muted mb-3">${firstCard.title}</h6>
        </div>
      </div>
    `;
      sectionDiv.innerHTML += headerHTML;
    }

    // Crear row para las cards
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    sectionDiv.appendChild(rowDiv);

    // ✅ CORRECCIÓN: Cargar TODAS las cards de la sección
    // Incluyendo la primera card que tiene título
    for (const cardConfig of sectionConfig) {
      try {
        const cardHTML = await this.loadCard(cardConfig.name, cardConfig.cols);
        if (cardHTML) {
          rowDiv.innerHTML += cardHTML;
        }
      } catch (error) {
        console.error(`❌ Error cargando card ${cardConfig.name}:`, error);
        console.error(
          `📁 Ruta intentada: ./components/${this.getCardPath(
            cardConfig.name
          )}.card.js`
        );
        rowDiv.innerHTML += this.createErrorCardHTML(
          cardConfig.name,
          cardConfig.cols
        );
      }
    }

    container.appendChild(sectionDiv);
  }

  async loadCard(cardName, colClass) {
    try {
      const cardPath = `./components/${this.getCardPath(cardName)}.card.js`;
      console.log(`📁 Importando card desde: ${cardPath}`);

      const cardModule = await import(cardPath);
      const CardClass = cardModule.default;

      // Crear instancia de la card
      const cardInstance = new CardClass(this.services, this.advancedMetrics);
      this.cardInstances.set(cardName, cardInstance);

      // Renderizar la card
      const cardHTML = await cardInstance.render(colClass);

      // Configurar eventos después de un delay
      setTimeout(() => {
        this.setupCardEvents(cardName);
      }, 100);

      return cardHTML;
    } catch (error) {
      console.error(`❌ Error importando card ${cardName}:`, error);
      throw error;
    }
  }

  // ✅ NUEVO: Cargar sección de gráficos
  async loadChartsSection(containerId = "charts-container") {
    try {
      console.log("📊 [DashboardCardsManager] Cargando sección de gráficos...");

      const container = document.getElementById(containerId);
      if (!container) {
        console.warn(`⚠️ Contenedor de gráficos #${containerId} no encontrado`);
        return;
      }

      // Mostrar loading state
      container.innerHTML = `
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-body text-center py-4">
                <div class="spinner-border text-primary" role="status"></div>
                <p class="text-muted mt-2">Cargando gráficos...</p>
              </div>
            </div>
          </div>
        </div>
      `;

      // Crear estructura de gráficos
      const chartsHTML = await this.renderChartsGrid();
      container.innerHTML = chartsHTML;

      // Inicializar gráficos después del render
      setTimeout(async () => {
        await this.initializeAllCharts();
      }, 500);

      console.log("✅ [DashboardCardsManager] Sección de gráficos cargada");
    } catch (error) {
      console.error(
        "❌ [DashboardCardsManager] Error cargando gráficos:",
        error
      );
      this.renderChartsError(containerId, error);
    }
  }

  // ✅ NUEVO: Renderizar grid de gráficos
  // ✅ CORREGIDO: Renderizar grid de gráficos
  async renderChartsGrid() {
    let html = `
    <div class="row mb-4">
      <div class="col-12">
        <h6 class="text-uppercase text-muted">📊 Análisis Visual & Tendencias</h6>
      </div>
    </div>
  `;

    // ✅ CORRECCIÓN: Usar TODOS los gráficos, no filtrar
    html += '<div class="row">';

    for (const chartConfig of this.chartsConfig) {
      html += `<div class="${chartConfig.cols}">`;
      try {
        const chartHTML = await this.loadChart(
          chartConfig.name,
          chartConfig.cols
        );
        html += chartHTML;
      } catch (error) {
        console.error(`❌ Error cargando gráfico ${chartConfig.name}:`, error);
        html += this.createErrorChartHTML(chartConfig.name, chartConfig.cols);
      }
      html += "</div>";
    }

    html += "</div>";

    return html;
  }

  // ✅ NUEVO: Cargar gráfico individual
  async loadChart(chartName, colClass) {
    try {
      const chartPath = `./components/charts/${this.getChartPath(
        chartName
      )}.chart.js`;
      console.log(`📊 Importando gráfico desde: ${chartPath}`);

      const chartModule = await import(chartPath);
      const ChartClass = chartModule.default;

      // Crear instancia del gráfico
      const chartInstance = new ChartClass(this.services);
      this.chartInstances.set(chartName, chartInstance);

      // Renderizar el gráfico
      const chartHTML = await chartInstance.render(colClass);

      return chartHTML;
    } catch (error) {
      console.error(`❌ Error importando gráfico ${chartName}:`, error);
      throw error;
    }
  }

  // ✅ NUEVO: Inicializar todos los gráficos
  async initializeAllCharts() {
    console.log("🎨 [DashboardCardsManager] Inicializando gráficos...");

    for (const [chartName, chartInstance] of this.chartInstances) {
      try {
        await chartInstance.init();
        console.log(`✅ Gráfico ${chartName} inicializado`);
      } catch (error) {
        console.error(`❌ Error inicializando gráfico ${chartName}:`, error);
      }
    }

    console.log("✅ [DashboardCardsManager] Todos los gráficos inicializados");
  }

  // ✅ NUEVO: Obtener ruta del gráfico
  getChartPath(chartName) {
    const pathMap = {
      "sales-trend": "sales-trend",
      "cash-flow": "cash-flow",
      "inventory-metrics": "inventory-metrics",
      "clients-metrics": "clients-metrics",
    };
    return pathMap[chartName] || chartName;
  }

  // ✅ MÉTODOS EXISTENTES (manteniendo tu código)
  setupCardEvents(cardName) {
    const cardElement = document.querySelector(`[data-card="${cardName}"]`);
    if (!cardElement) {
      console.warn(`⚠️ No se encontró elemento para card: ${cardName}`);
      return;
    }

    const cardInstance = this.cardInstances.get(cardName);
    if (cardInstance && typeof cardInstance.setupEvents === "function") {
      cardInstance.setupEvents(cardElement);
      console.log(`✅ Eventos configurados para card: ${cardName}`);
    }
  }

  getCardPath(cardName) {
    const pathMap = {
      "sales-today": "performance/sales-today",
      "average-ticket": "performance/average-ticket",
      "profit-margin": "performance/profit-margin",
      "inventory-turnover": "performance/inventory-turnover",
      "stock-alerts": "inventory/stock-alerts",
      "inventory-value": "inventory/inventory-value",
      "abc-analysis": "inventory/abc-analysis",
      "active-clients": "clients/active-clients",
      "vip-clients": "clients/vip-clients",
      "cash-status": "finance/cash-status",
      "overall-efficiency": "finance/overall-efficiency",
    };
    return pathMap[cardName] || cardName;
  }

  // ✅ NUEVO: Método para manejar errores de gráficos
  renderChartsError(containerId, error) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="row">
        <div class="col-12">
          <div class="alert alert-warning">
            <div class="d-flex align-items-center">
              <i class="material-icons me-2">error_outline</i>
              <div>
                <h6 class="alert-heading">No se pudieron cargar los gráficos</h6>
                <p class="mb-0">${error.message}</p>
                <small>Los datos de las cards siguen disponibles</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ✅ NUEVO: Crear HTML de error para gráficos
  createErrorChartHTML(chartName, colClass) {
    return `
      <div class="${colClass} mb-4">
        <div class="card">
          <div class="card-body text-center py-4">
            <i class="material-icons text-muted mb-2" style="font-size: 2rem;">bar_chart</i>
            <h6 class="text-muted">Error cargando gráfico</h6>
            <p class="text-muted small">${chartName}</p>
            <button class="btn btn-sm btn-outline-primary" onclick="window.dashboardController?.refreshChart('${chartName}')">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ✅ NUEVO: Método para refrescar gráficos individuales
  async refreshChart(chartName) {
    try {
      const chartInstance = this.chartInstances.get(chartName);
      if (chartInstance && chartInstance.refresh) {
        await chartInstance.refresh();
        showAlert(`Gráfico ${chartName} actualizado`, "success", 2000);
      }
    } catch (error) {
      console.error(`❌ Error refrescando gráfico ${chartName}:`, error);
      showAlert(`Error actualizando gráfico`, "error");
    }
  }

  // ✅ NUEVO: Refrescar todos los gráficos
  async refreshAllCharts() {
    try {
      console.log(
        "🔄 [DashboardCardsManager] Refrescando todos los gráficos..."
      );

      for (const [chartName, chartInstance] of this.chartInstances) {
        if (chartInstance.refresh) {
          await chartInstance.refresh();
          console.log(`✅ Gráfico ${chartName} refrescado`);
        }
      }

      console.log("✅ [DashboardCardsManager] Todos los gráficos refrescados");
      showAlert("Gráficos actualizados", "success", 2000);
    } catch (error) {
      console.error("❌ Error refrescando gráficos:", error);
      showAlert("Error actualizando gráficos", "error");
    }
  }

  // ✅ ACTUALIZADO: Refrescar todo el dashboard (cards + gráficos)
  async refreshAllCards() {
    try {
      console.log(
        "🔄 [DashboardCardsManager] Refrescando dashboard completo..."
      );

      // Recalcular métricas
      await this.calculateAdvancedMetrics();

      // Refrescar cada card instanciada
      for (const [cardName, cardInstance] of this.cardInstances) {
        if (cardInstance.refresh) {
          await cardInstance.refresh(this.advancedMetrics);
        }
      }

      // Refrescar todos los gráficos
      await this.refreshAllCharts();

      console.log("✅ [DashboardCardsManager] Dashboard completo refrescado");
    } catch (error) {
      console.error("❌ Error refrescando dashboard:", error);
    }
  }

  // ✅ ACTUALIZADO: Debug mejorado
  debugDashboard() {
    console.log("🐛 [DashboardCardsManager] Debug info:");
    console.log("📊 Métricas avanzadas:", this.advancedMetrics);
    console.log(
      "🎴 Cards instanciadas:",
      Array.from(this.cardInstances.keys())
    );
    console.log(
      "📈 Gráficos instanciados:",
      Array.from(this.chartInstances.keys())
    );
    console.log("📁 Estructura completa:", {
      sections: this.sections,
      charts: this.chartsConfig,
    });
  }

  // ✅ ACTUALIZADO: Destruir también los gráficos
  destroy() {
    // Destruir cards
    this.cardInstances.forEach((cardInstance, cardName) => {
      if (cardInstance.destroy) {
        cardInstance.destroy();
      }
    });
    this.cardInstances.clear();

    // Destruir gráficos
    this.chartInstances.forEach((chartInstance, chartName) => {
      if (chartInstance.destroy) {
        chartInstance.destroy();
      }
    });
    this.chartInstances.clear();

    this.advancedMetrics = null;
    console.log(
      "🧹 [DashboardCardsManager] Recursos limpiados (cards + gráficos)"
    );
  }

  // 🎯 MÉTRICAS COMPARTIDAS (manteniendo tu código existente)
  async calculateAdvancedMetrics() {
    try {
      console.log(
        "📈 [DashboardCardsManager] Calculando métricas avanzadas..."
      );

      const [sales, products, clients, dashboardData] = await Promise.all([
        this.services.sales.getAllSales().catch(() => []),
        this.services.products.getAllProducts().catch(() => []),
        this.services.clients.getAllClients().catch(() => []),
        this.services.dashboard.getDashboardData(true).catch(() => ({
          metrics: {},
          cashStatus: null,
          products: [],
          sales: [],
          clients: [],
        })),
      ]);

      if (!sales || !products || !clients) {
        console.warn("⚠️ Algunos servicios devolvieron datos vacíos");
      }

      this.advancedMetrics = {
        averageTicket: this.calculateAverageTicket(sales),
        profitMargin: this.calculateProfitMargin(sales),
        inventoryTurnover: this.calculateInventoryTurnover(products, sales),
        vipClients: this.identifyVipClients(clients, sales),
        retentionRate: this.calculateRetentionRate(clients),
        inventoryValue: this.calculateTotalInventoryValue(products),
        abcAnalysis: this.performABCAnalysis(products),
        baseData: dashboardData,
      };

      console.log("✅ [DashboardCardsManager] Métricas avanzadas calculadas");
    } catch (error) {
      console.error("❌ Error calculando métricas avanzadas:", error);
      this.advancedMetrics = this.getDefaultMetrics();
    }
  }

  calculateAverageTicket(sales) {
    const todaySales = sales.filter(
      (sale) => new Date(sale.date).toDateString() === new Date().toDateString()
    );
    if (todaySales.length === 0) return 0;
    const totalRevenue = todaySales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    return totalRevenue / todaySales.length;
  }

  calculateProfitMargin(sales) {
    const todaySales = sales.filter(
      (sale) => new Date(sale.date).toDateString() === new Date().toDateString()
    );
    if (todaySales.length === 0) return 0;
    const totalRevenue = todaySales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    const totalProfit = todaySales.reduce(
      (sum, sale) => sum + (sale.profit || 0),
      0
    );
    return totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  }

  calculateInventoryTurnover(products, sales) {
    const totalInventoryValue = products.reduce(
      (sum, product) => sum + (product.stock || 0) * (product.cost || 0),
      0
    );
    const monthlySalesCost = sales
      .filter((sale) => {
        const saleDate = new Date(sale.date);
        const now = new Date();
        return (
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, sale) => sum + (sale.total || 0) * 0.6, 0);
    return totalInventoryValue > 0 ? monthlySalesCost / totalInventoryValue : 0;
  }

  identifyVipClients(clients, sales) {
    const clientSpending = {};
    sales.forEach((sale) => {
      if (sale.clientid) {
        clientSpending[sale.clientid] =
          (clientSpending[sale.clientid] || 0) + (sale.total || 0);
      }
    });
    const spendingValues = Object.values(clientSpending);
    const threshold = this.calculatePercentile(spendingValues, 80);
    return Object.keys(clientSpending).filter(
      (clientId) => clientSpending[clientId] >= threshold
    ).length;
  }

  calculateRetentionRate(clients) {
    const activeClients = clients.filter(
      (client) => client.estado === "activo" || client.status === "active"
    ).length;
    return clients.length > 0 ? (activeClients / clients.length) * 100 : 0;
  }

  calculateTotalInventoryValue(products) {
    return products.reduce(
      (sum, product) => sum + (product.stock || 0) * (product.cost || 0),
      0
    );
  }

  performABCAnalysis(products) {
    const valuedProducts = products
      .map((product) => ({
        ...product,
        totalValue: (product.stock || 0) * (product.cost || 0),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);

    const totalValue = valuedProducts.reduce((sum, p) => sum + p.totalValue, 0);
    let cumulativeValue = 0;
    const abcCount = { A: 0, B: 0, C: 0 };

    valuedProducts.forEach((product) => {
      cumulativeValue += product.totalValue;
      const percentage = (cumulativeValue / totalValue) * 100;
      if (percentage <= 80) abcCount.A++;
      else if (percentage <= 95) abcCount.B++;
      else abcCount.C++;
    });

    return abcCount;
  }

  calculatePercentile(values, percentile) {
    if (!values.length) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    if (Math.floor(index) === index) return sorted[index];
    const lower = sorted[Math.floor(index)];
    const upper = sorted[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
  }

  getDefaultMetrics() {
    return {
      averageTicket: 0,
      profitMargin: 0,
      inventoryTurnover: 0,
      vipClients: 0,
      retentionRate: 0,
      inventoryValue: 0,
      abcAnalysis: { A: 0, B: 0, C: 0 },
      baseData: {
        metrics: {},
        cashStatus: null,
        products: [],
        sales: [],
        clients: [],
      },
    };
  }

  createErrorCardHTML(cardName, colClass) {
    return `
      <div class="${colClass} mb-4">
        <div class="card">
          <div class="card-body text-center py-3">
            <i class="material-icons text-muted mb-2">error_outline</i>
            <p class="text-muted mb-0">Error cargando ${cardName}</p>
          </div>
        </div>
      </div>
    `;
  }

  renderErrorState(containerId, error) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="col-12">
        <div class="card">
          <div class="card-body text-center py-5">
            <i class="material-icons text-muted mb-3" style="font-size: 3rem;">error_outline</i>
            <h5 class="text-muted">Error cargando dashboard</h5>
            <p class="text-muted">${error.message}</p>
            <button class="btn btn-primary mt-2" onclick="location.reload()">Recargar Página</button>
          </div>
        </div>
      </div>
    `;
  }
}

export default DashboardCardsManager;
