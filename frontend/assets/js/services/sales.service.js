// assets/js/services/sales.service.js
class SalesService {
  constructor(apiService) {
    this.apiService = apiService;
    this.cache = {
      sales: null,
      consolidated: null,
      lastUpdate: null,
      ttl: 30000, // 30 segundos
    };
    console.log("🧾 SalesService instanciado");
  }

  async getAllSales(filters = {}) {
    try {
      console.log("🧾 [SalesService] Obteniendo ventas...", filters);

      // Construir query params para filtros
      const queryParams = new URLSearchParams();
      if (filters.userid) queryParams.append("userid", filters.userid);
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.paymentmethod)
        queryParams.append("paymentmethod", filters.paymentmethod);
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);

      const endpoint = queryParams.toString()
        ? `${this.apiService.endpoints.SALES}?${queryParams}`
        : this.apiService.endpoints.SALES;

      const response = await this.apiService.get(endpoint);

      console.log("📡 [SalesService] Respuesta recibida:", response);

      // ✅ CORRECCIÓN: Extraer array correctamente
      let salesData = [];

      if (response && response.success && Array.isArray(response.data)) {
        // Caso: { success: true, data: [...] }
        salesData = response.data;
      } else if (Array.isArray(response)) {
        // Caso: Ya es array directamente
        salesData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        // Caso: { data: [...] }
        salesData = response.data;
      } else {
        console.warn("⚠️ [SalesService] Estructura inesperada:", response);
        salesData = [];
      }

      console.log(
        `📊 [SalesService] Datos brutos:`,
        salesData.length,
        "ventas recibidas"
      );

      // ✅ CORRECCIÓN: Usar la variable CORRECTA (salesData, no sales)
      const processedSales = salesData.map((sale) =>
        this.processSaleData(sale)
      );

      this.cache.sales = processedSales;
      this.cache.lastUpdate = Date.now();

      console.log(
        `🧾 [SalesService] ${processedSales.length} ventas procesadas`
      );
      return processedSales;
    } catch (error) {
      console.error("❌ [SalesService] Error obteniendo ventas:", error);
      throw error;
    }
  }

  async getSaleById(id) {
    try {
      console.log(`🧾 [SalesService] Obteniendo venta #${id}...`);
      const sale = await this.apiService.get(
        this.apiService.endpoints.SALE_BY_ID(id)
      );
      return this.processSaleData(sale);
    } catch (error) {
      console.error(`❌ [SalesService] Error obteniendo venta ${id}:`, error);
      throw error;
    }
  }

  async createSale(saleData) {
    try {
      console.log("🧾 [SalesService] Creando venta...", saleData);

      const payload = {
        items: saleData.items,
        paymentmethod: saleData.paymentmethod || "cash",
      };

      const result = await this.apiService.post(
        this.apiService.endpoints.SALES,
        payload
      );
      this.clearCache();

      console.log("🧾 [SalesService] Venta creada:", result);
      return result;
    } catch (error) {
      console.error("❌ [SalesService] Error creando venta:", error);
      throw error;
    }
  }

  async getSalesByUser(userId, limit = null) {
    try {
      console.log(
        `🧾 [SalesService] Obteniendo ventas del usuario #${userId}...`
      );
      const sales = await this.apiService.get(
        this.apiService.endpoints.SALES_BY_USER(userId)
      );
      return sales.map((sale) => this.processSaleData(sale));
    } catch (error) {
      console.error(
        `❌ [SalesService] Error obteniendo ventas del usuario ${userId}:`,
        error
      );
      throw error;
    }
  }

  async getDailyReport() {
    try {
      console.log("🧾 [SalesService] Obteniendo reporte diario...");
      return await this.apiService.get(
        this.apiService.endpoints.SALES_DAILY_REPORT
      );
    } catch (error) {
      console.error(
        "❌ [SalesService] Error obteniendo reporte diario:",
        error
      );
      throw error;
    }
  }

  async getConsolidatedData() {
    try {
      if (this.cache.consolidated && this.isCacheValid()) {
        return this.cache.consolidated;
      }

      console.log("🧾 [SalesService] Obteniendo datos consolidados...");
      const consolidated = await this.apiService.get(
        this.apiService.endpoints.SALES_CONSOLIDATED
      );

      this.cache.consolidated = consolidated;
      this.cache.lastUpdate = Date.now();

      return consolidated;
    } catch (error) {
      console.error(
        "❌ [SalesService] Error obteniendo datos consolidados:",
        error
      );
      throw error;
    }
  }

  async applyDiscount(items, discountRate = 0.1) {
    try {
      console.log("🧾 [SalesService] Aplicando descuento...");
      const result = await this.apiService.post(
        this.apiService.endpoints.SALES_APPLY_DISCOUNT,
        {
          items: items,
          discountRate: discountRate,
        }
      );
      return result;
    } catch (error) {
      console.error("❌ [SalesService] Error aplicando descuento:", error);
      throw error;
    }
  }

  async generateTicket(saleId) {
    try {
      console.log(
        `🧾 [SalesService] Generando ticket para venta #${saleId}...`
      );
      return await this.apiService.get(
        this.apiService.endpoints.SALES_GENERATE_TICKET(saleId)
      );
    } catch (error) {
      console.error(
        `❌ [SalesService] Error generando ticket ${saleId}:`,
        error
      );
      throw error;
    }
  }

  async cancelSale(saleId) {
    try {
      console.log(`🧾 [SalesService] Cancelando venta #${saleId}...`);
      const result = await this.apiService.patch(
        this.apiService.endpoints.SALES_CANCEL(saleId)
      );
      this.clearCache();
      return result;
    } catch (error) {
      console.error(
        `❌ [SalesService] Error cancelando venta ${saleId}:`,
        error
      );
      throw error;
    }
  }

  async getSaleItems(saleId) {
    try {
      console.log(`🧾 [SalesService] Obteniendo items de venta #${saleId}...`);
      return await this.apiService.get(
        this.apiService.endpoints.SALES_ITEMS(saleId)
      );
    } catch (error) {
      console.error(
        `❌ [SalesService] Error obteniendo items de venta ${saleId}:`,
        error
      );
      throw error;
    }
  }

  async getSoldProducts() {
    try {
      console.log("🧾 [SalesService] Obteniendo productos vendidos...");
      return await this.apiService.get(
        this.apiService.endpoints.SALES_SOLD_PRODUCTS
      );
    } catch (error) {
      console.error(
        "❌ [SalesService] Error obteniendo productos vendidos:",
        error
      );
      throw error;
    }
  }

  processSaleData(sale) {
    return {
      id: sale.id,
      userid: sale.userid,
      // ✅ CORRECCIÓN: cash_register_id en lugar de cashid
      cash_register_id: sale.cash_register_id || null,
      client_id: sale.client_id || null,
      date: sale.date ? new Date(sale.date) : new Date(),
      total: parseFloat(sale.total) || 0,
      profit: parseFloat(sale.profit) || 0,
      subtotal: parseFloat(sale.subtotal) || 0,
      tax: parseFloat(sale.tax) || 0,
      discount: parseFloat(sale.discount) || 0,
      paymentmethod: sale.paymentmethod || "cash",
      status: sale.status || "paid",
      observations: sale.observations || null,
      ticket_number: sale.ticket_number || null,
      items: sale.SalesItems
        ? sale.SalesItems.map((item) => ({
            id: item.id,
            productid: item.productid,
            quantity: item.quantity,
            unitprice: parseFloat(item.unitprice) || 0,
            totalprice: parseFloat(item.totalprice) || 0,
            product: item.Product
              ? {
                  id: item.Product.id,
                  barcode: item.Product.barcode,
                  name: item.Product.name,
                  category: item.Product.category,
                  price: parseFloat(item.Product.price) || 0,
                  cost: parseFloat(item.Product.cost) || 0,
                  stock: item.Product.stock || 0,
                  minstock: item.Product.minstock || 0,
                }
              : null,
          }))
        : [],
      client: sale.Client
        ? {
            id: sale.Client.id,
            name: sale.Client.name,
            email: sale.Client.email,
            phone: sale.Client.phone,
          }
        : null,
    };
  }

  calculateSalesSummary(sales) {
    const today = new Date().toDateString();
    const todaySales = sales.filter(
      (sale) => new Date(sale.date).toDateString() === today
    );

    const totalToday = todaySales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    const profitToday = todaySales.reduce(
      (sum, sale) => sum + (sale.profit || 0),
      0
    );

    const monthSales = sales.filter((sale) => {
      const saleDate = new Date(sale.date);
      const now = new Date();
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    });

    const totalMonth = monthSales.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );

    // Calcular método de pago más usado
    const paymentMethods = {};
    sales.forEach((sale) => {
      paymentMethods[sale.paymentmethod] =
        (paymentMethods[sale.paymentmethod] || 0) + 1;
    });

    const mainPaymentMethod = Object.keys(paymentMethods).reduce(
      (a, b) => (paymentMethods[a] > paymentMethods[b] ? a : b),
      "cash"
    );

    return {
      todayCount: todaySales.length,
      todayTotal: parseFloat(totalToday.toFixed(2)),
      todayProfit: parseFloat(profitToday.toFixed(2)),
      monthCount: monthSales.length,
      monthTotal: parseFloat(totalMonth.toFixed(2)),
      totalCount: sales.length,
      mainPaymentMethod: this.getPaymentMethodText(mainPaymentMethod),
    };
  }

  getPaymentMethodText(method) {
    const methods = {
      cash: "Efectivo",
      card: "Tarjeta",
      virtualpay: "Pago Virtual",
    };
    return methods[method] || method;
  }

  getStatusText(status) {
    const statuses = {
      paid: "Pagada",
      pending: "Pendiente",
      canceled: "Cancelada",
    };
    return statuses[status] || status;
  }

  formatSaleDate(dateString) {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("es-AR");
    } catch {
      return "Fecha inválida";
    }
  }

  formatSaleTime(dateString) {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  isCacheValid() {
    return (
      this.cache.lastUpdate &&
      Date.now() - this.cache.lastUpdate < this.cache.ttl
    );
  }

  clearCache() {
    this.cache.sales = null;
    this.cache.consolidated = null;
    this.cache.lastUpdate = null;
    console.log("🧾 [SalesService] Cache limpiado");
  }
}

export default SalesService;
