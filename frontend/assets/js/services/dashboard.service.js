// assets/js/services/dashboard.service.js
class DashboardService {
  constructor(apiService) {
    this.apiService = apiService;
    this.cache = {
      dashboardData: null,
      lastUpdate: null,
      ttl: 60000, // 1 minuto
    };
    console.log("📊 DashboardService inicializado");
  }

  async getDashboardData(forceRefresh = false) {
    try {
      // Verificar cache
      if (!forceRefresh && this.isCacheValid()) {
        console.log("📊 [DashboardService] Usando datos en cache");
        return this.cache.dashboardData;
      }

      console.log("📊 [DashboardService] Obteniendo datos del dashboard...");

      const [sales, products, clients, cashStatus] = await Promise.all([
        this.apiService.get(this.apiService.endpoints.SALES),
        this.apiService.get(this.apiService.endpoints.PRODUCTS),
        this.apiService.get(this.apiService.endpoints.CLIENTS),
        this.apiService.get(this.apiService.endpoints.CASH_STATUS),
      ]);

      const dashboardData = {
        sales: sales || [],
        products: products || [],
        clients: clients || [],
        cashStatus: cashStatus || null,
        metrics: this.calculateMetrics(sales, products, clients, cashStatus),
        timestamp: new Date().toISOString(),
      };

      // Actualizar cache
      this.cache.dashboardData = dashboardData;
      this.cache.lastUpdate = Date.now();

      console.log("✅ [DashboardService] Datos del dashboard cargados:", {
        ventas: dashboardData.sales.length,
        productos: dashboardData.products.length,
        clientes: dashboardData.clients.length,
        caja: dashboardData.cashStatus ? "Abierta" : "Cerrada",
      });

      return dashboardData;
    } catch (error) {
      console.error("❌ [DashboardService] Error obteniendo datos:", error);
      throw error;
    }
  }

  calculateMetrics(sales, products, clients, cashStatus) {
    const today = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter(
      (sale) => sale.date && sale.date.startsWith(today)
    );

    // Métricas de ventas
    const totalSales = todaySales.length;
    const totalRevenue = todaySales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Métricas de stock
    const criticalStock = products.filter(
      (p) => (p.stock || 0) <= (p.minstock || 5) && (p.stock || 0) > 0
    ).length;
    const outOfStock = products.filter((p) => (p.stock || 0) === 0).length;

    // Métricas de clientes
    const activeClients = clients.filter(
      (c) => c.estado === "activo" || c.status === "active"
    ).length;
    const clientsWithCC = clients.filter(
      (c) => c.cuenta_corriente === true
    ).length;

    return {
      // Ventas
      totalSales,
      totalRevenue: parseFloat(Number(totalRevenue).toFixed(2)),
      averageTicket: parseFloat(averageTicket.toFixed(2)),

      // Stock
      totalProducts: products.length,
      criticalStock,
      outOfStock,

      // Clientes
      totalClients: clients.length,
      activeClients,
      clientsWithCC,

      // Caja
      cashRegisterOpen: !!cashStatus,
      cashRegisterId: cashStatus ? cashStatus.id : null,
    };
  }

  async getQuickStats() {
    try {
      const data = await this.getDashboardData();
      return {
        salesToday: data.metrics.totalSales,
        revenueToday: data.metrics.totalRevenue,
        criticalProducts: data.metrics.criticalStock,
        cashStatus: data.cashStatus ? "Abierta" : "Cerrada",
      };
    } catch (error) {
      console.error(
        "❌ [DashboardService] Error obteniendo stats rápidos:",
        error
      );
      return {
        salesToday: 0,
        revenueToday: 0,
        criticalProducts: 0,
        cashStatus: "Error",
      };
    }
  }

  async getSalesTrend(days = 7) {
    try {
      const sales = await this.apiService.get(this.apiService.endpoints.SALES);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const filteredSales = sales.filter((sale) => {
        const saleDate = new Date(sale.date);
        return saleDate >= startDate && saleDate <= endDate;
      });

      // Agrupar por día
      const salesByDay = {};
      filteredSales.forEach((sale) => {
        const date = sale.date.split("T")[0];
        if (!salesByDay[date]) {
          salesByDay[date] = { count: 0, revenue: 0 };
        }
        salesByDay[date].count += 1;
        salesByDay[date].revenue += sale.total || 0;
      });

      return salesByDay;
    } catch (error) {
      console.error("❌ [DashboardService] Error obteniendo tendencia:", error);
      return {};
    }
  }

  isCacheValid() {
    return (
      this.cache.dashboardData &&
      this.cache.lastUpdate &&
      Date.now() - this.cache.lastUpdate < this.cache.ttl
    );
  }

  clearCache() {
    this.cache.dashboardData = null;
    this.cache.lastUpdate = null;
    console.log("📊 [DashboardService] Cache limpiado");
  }

  async refreshData() {
    this.clearCache();
    return await this.getDashboardData(true);
  }
}

export default DashboardService;
