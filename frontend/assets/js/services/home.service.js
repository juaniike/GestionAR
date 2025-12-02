// assets/js/services/home.service.js
class HomeService {
  constructor(
    apiService,
    productsService,
    salesService,
    clientsService,
    cashService
  ) {
    this.apiService = apiService;
    this.productsService = productsService;
    this.salesService = salesService;
    this.clientsService = clientsService;
    this.cashService = cashService;

    this.cache = {
      metrics: null,
      lastUpdate: null,
      ttl: 30000, // 30 segundos
    };

    console.log("🏠 HomeService instanciado");
  }

  async getHomeMetrics(forceRefresh = false) {
    try {
      // Verificar cache
      if (!forceRefresh && this.isCacheValid()) {
        console.log("🏠 [HomeService] Usando métricas en cache");
        return this.cache.metrics;
      }

      console.log("🏠 [HomeService] Obteniendo métricas del home...");

      // Cargar datos en paralelo desde servicios especializados
      const [products, sales, cashStatus, clients, consolidated] =
        await Promise.all([
          this.productsService.getAllProducts().catch(() => []),
          this.salesService.getAllSales().catch(() => []),
          this.cashService.getCashStatus().catch(() => null),
          this.clientsService.getAllClients().catch(() => []),
          this.salesService.getConsolidatedData().catch(() => ({})),
        ]);

      // Procesar y calcular métricas
      const metrics = this.calculateHomeMetrics(
        products,
        sales,
        cashStatus,
        clients,
        consolidated
      );

      this.cache.metrics = metrics;
      this.cache.lastUpdate = Date.now();

      console.log("🏠 [HomeService] Métricas calculadas:", metrics);
      return metrics;
    } catch (error) {
      console.error("❌ [HomeService] Error obteniendo métricas:", error);
      throw error;
    }
  }

  calculateHomeMetrics(products, sales, cashStatus, clients, consolidated) {
    const today = new Date().toDateString();

    // Calcular ventas de hoy
    const todaySales = sales.filter(
      (sale) => new Date(sale.date).toDateString() === today
    );

    // Calcular resumen de stock
    const stockSummary = this.productsService.calculateStockSummary(products);

    // Calcular resumen de ventas
    const salesSummary = this.salesService.calculateSalesSummary(sales);

    // Calcular resumen de clientes
    const clientsSummary = this.clientsService.calculateClientsSummary(clients);

    // Estado del sistema
    const systemStatus = cashStatus ? "optimal" : "stable";

    return {
      // Métricas principales
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce(
        (sum, sale) => sum + (sale.total || 0),
        0
      ),
      todayProfit: todaySales.reduce(
        (sum, sale) => sum + (sale.profit || 0),
        0
      ),

      // Totales
      totalProducts: products.length,
      totalClients: clients.length,
      totalSales: sales.length,

      // Estado de stock
      stockAlerts: stockSummary.critical + stockSummary.outOfStock,
      lowStock: stockSummary.critical,
      outOfStock: stockSummary.outOfStock,

      // Estado financiero
      cashRegisterOpen: !!cashStatus,
      currentCash: cashStatus ? parseFloat(cashStatus.startingcash) || 0 : 0,

      // Métricas adicionales
      inventoryValue: stockSummary.totalValue,
      activeClients: clientsSummary.active,
      monthlyRevenue: salesSummary.monthTotal,

      // Estado del sistema
      systemStatus: systemStatus,
      lastUpdate: new Date().toISOString(),
    };
  }

  async getQuickActions() {
    return [
      {
        id: "new-sale",
        icon: "add_shopping_cart",
        label: "Nueva Venta",
        description: "Registrar nueva venta",
        color: "success",
        action: "openSalesForm",
        shortcut: "Ctrl+N",
      },
      {
        id: "view-dashboard",
        icon: "dashboard",
        label: "Ver Dashboard",
        description: "Estadísticas y gráficos",
        color: "primary",
        action: "navigateToDashboard",
        shortcut: "Ctrl+D",
      },
      {
        id: "manage-products",
        icon: "inventory_2",
        label: "Gestión Productos",
        description: "Administrar inventario",
        color: "info",
        action: "navigateToProducts",
        shortcut: "Ctrl+P",
      },
      {
        id: "sales-history",
        icon: "receipt",
        label: "Historial Ventas",
        description: "Ver todas las ventas",
        color: "secondary",
        action: "navigateToSales",
        shortcut: "Ctrl+H",
      },
      {
        id: "cash-register",
        icon: "point_of_sale",
        label: "Caja Registradora",
        description: "Gestión de caja",
        color: "warning",
        action: "navigateToCash",
        shortcut: "Ctrl+C",
      },
      {
        id: "manage-clients",
        icon: "groups",
        label: "Administrar Clientes",
        description: "Gestionar clientes",
        color: "dark",
        action: "navigateToClients",
        shortcut: "Ctrl+L",
      },
    ];
  }

  async getSystemInfo() {
    const user = this.getCurrentUser();
    const now = new Date();

    return {
      user: {
        username: user?.username || "No identificado",
        role: user?.role || "N/A",
        loginTime: user?.loginTime || now.toISOString(),
      },
      system: {
        os: "Funcionando correctamente",
        date: now.toLocaleDateString("es-AR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        time: now.toLocaleTimeString("es-AR"),
        status: "protected",
        version: "1.0.0",
      },
      performance: {
        loadTime: Date.now() - performance.timing.navigationStart,
        memory: "Optimal",
        uptime: this.calculateUptime(),
      },
    };
  }

  // Métodos de utilidad
  getCurrentUser() {
    try {
      return (
        JSON.parse(sessionStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("user"))
      );
    } catch (error) {
      return null;
    }
  }

  calculateUptime() {
    // Simular uptime del sistema
    const startTime = sessionStorage.getItem("systemStartTime") || Date.now();
    sessionStorage.setItem("systemStartTime", startTime);

    const uptime = Date.now() - parseInt(startTime);
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  isCacheValid() {
    return (
      this.cache.metrics &&
      this.cache.lastUpdate &&
      Date.now() - this.cache.lastUpdate < this.cache.ttl
    );
  }

  clearCache() {
    this.cache.metrics = null;
    this.cache.lastUpdate = null;
    console.log("🏠 [HomeService] Cache limpiado");
  }

  // Método para forzar actualización de todas las caches
  async refreshAllData() {
    console.log("🔄 [HomeService] Refrescando todos los datos...");

    // Limpiar caches de todos los servicios
    this.productsService.clearCache();
    this.salesService.clearCache();
    this.clientsService.clearCache();
    this.cashService.clearCache();
    this.clearCache();

    // Recargar métricas
    return await this.getHomeMetrics(true);
  }
}

export default HomeService;
