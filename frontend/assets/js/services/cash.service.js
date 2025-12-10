// assets/js/services/cash.service.js
class CashService {
  constructor(apiService) {
    this.apiService = apiService;
    this.cache = {
      cashStatus: null,
      todaySales: null,
      movements: null,
      lastUpdate: null,
      ttl: 30000, // 30 segundos
    };
    console.log("💰 CashService instanciado");
  }

  async getCashStatus(forceRefresh = false) {
    try {
      // Verificar cache
      if (!forceRefresh && this.isCacheValid()) {
        console.log("💰 [CashService] Usando datos en cache");
        return this.cache.cashStatus;
      }

      console.log("💰 [CashService] Obteniendo estado de caja...");
      const response = await this.apiService.get(
        this.apiService.endpoints.CASH_STATUS
      );

      // ✅ CORREGIDO: Manejar estructura de la API
      let cashData = null;
      if (response && response.success === true) {
        cashData = response.data || null;
      } else if (response && response.id) {
        // Caso: Datos directamente (backward compatibility)
        cashData = response;
      }

      this.cache.cashStatus = cashData;
      this.cache.lastUpdate = Date.now();

      console.log(
        "💰 [CashService] Estado de caja:",
        cashData ? "ABIERTA" : "CERRADA"
      );
      return cashData;
    } catch (error) {
      if (
        error.message.includes("404") ||
        error.message.includes("Not Found")
      ) {
        console.log("💰 [CashService] No hay caja abierta");
        this.cache.cashStatus = null;
        return null;
      }
      console.error("❌ [CashService] Error:", error.message);
      return null;
    }
  }

  async openCashRegister(initialAmount, observations = "") {
    try {
      console.log("💰 [CashService] Abriendo caja:", initialAmount);

      const result = await this.apiService.post(
        this.apiService.endpoints.CASH_OPEN,
        {
          startingcash: parseFloat(initialAmount),
          observations: observations,
        }
      );

      this.clearCache();
      console.log("💰 [CashService] Caja abierta:", result);
      return result;
    } catch (error) {
      console.error("❌ [CashService] Error abriendo caja:", error);
      throw error;
    }
  }

  async closeCashRegister(cashRegisterId, finalAmount, observations = "") {
    try {
      console.log("💰 [CashService] Cerrando caja:", finalAmount);

      const result = await this.apiService.post(
        this.apiService.endpoints.CASH_CLOSE(cashRegisterId),
        {
          endingcash: parseFloat(finalAmount),
          observations: observations,
        }
      );

      this.clearCache();
      console.log("💰 [CashService] Caja cerrada:", result);
      return result;
    } catch (error) {
      console.error("❌ [CashService] Error cerrando caja:", error);
      throw error;
    }
  }

  // ✅ CORREGIDO: Obtener todas las ventas
  async getAllSales(filters = {}) {
    try {
      console.log("💰 [CashService] Obteniendo todas las ventas...", filters);

      // Construir query params
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

      console.log("📡 [CashService] Respuesta recibida:", response);

      // ✅ CORRECCIÓN: Manejar estructura de la API
      let salesArray = [];

      if (
        response &&
        response.success === true &&
        Array.isArray(response.data)
      ) {
        // Caso: { success: true, data: [...] }
        salesArray = response.data;
      } else if (Array.isArray(response)) {
        // Caso: Ya es array directamente
        salesArray = response;
      } else if (response && Array.isArray(response.data)) {
        // Caso: { data: [...] }
        salesArray = response.data;
      } else if (response && response.success === true && response.data) {
        // Caso: { success: true, data: {...}} (pero no array)
        // Convertir a array si es un solo objeto
        salesArray = [response.data];
      } else {
        console.warn("⚠️ [CashService] Estructura inesperada:", response);
        salesArray = [];
      }

      console.log(`💰 [CashService] ${salesArray.length} ventas obtenidas`);
      return salesArray;
    } catch (error) {
      console.error("❌ [CashService] Error obteniendo ventas:", error);
      return [];
    }
  }

  // ✅ CORREGIDO: Obtener ventas del día
  async getTodaySales(cashRegisterId = null) {
    try {
      // Si ya tenemos ventas en cache y son recientes, usarlas
      if (
        this.cache.todaySales &&
        Date.now() - this.cache.lastUpdate < this.cache.ttl
      ) {
        return this.cache.todaySales;
      }

      console.log("💰 [CashService] Obteniendo ventas del día...");

      // ✅ Usar el método corregido getAllSales()
      const allSales = await this.getAllSales();

      // Asegurar que sea un array
      const salesArray = Array.isArray(allSales) ? allSales : [];

      const today = new Date().toISOString().split("T")[0];
      const todaySales = salesArray.filter((sale) => {
        try {
          const saleDate = sale.date
            ? new Date(sale.date).toISOString().split("T")[0]
            : null;
          return saleDate === today;
        } catch (error) {
          console.warn("⚠️ Error procesando fecha de venta:", sale);
          return false;
        }
      });

      this.cache.todaySales = todaySales;
      this.cache.lastUpdate = Date.now();

      console.log(
        `💰 [CashService] ${todaySales.length} ventas de hoy cargadas`
      );
      return todaySales;
    } catch (error) {
      console.error("❌ [CashService] Error obteniendo ventas de hoy:", error);
      return [];
    }
  }

  // ✅ CORREGIDO: Obtener movimientos
  async getMovements(filters = {}) {
    try {
      console.log("💰 [CashService] Obteniendo movimientos...", filters);

      // Construir parámetros de consulta
      const queryParams = new URLSearchParams();
      if (filters.cash_register_id)
        queryParams.append("cash_register_id", filters.cash_register_id);
      if (filters.type) queryParams.append("type", filters.type);
      if (filters.category) queryParams.append("category", filters.category);
      if (filters.date) queryParams.append("date", filters.date);

      const url = `${this.apiService.endpoints.MOVEMENTS}?${queryParams}`;
      const response = await this.apiService.get(url);

      // ✅ CORRECCIÓN: Manejar estructura de la API
      let movementsArray = [];

      if (
        response &&
        response.success === true &&
        Array.isArray(response.data)
      ) {
        movementsArray = response.data;
      } else if (Array.isArray(response)) {
        movementsArray = response;
      } else if (response && Array.isArray(response.data)) {
        movementsArray = response.data;
      } else {
        console.warn("⚠️ Estructura inesperada en movimientos:", response);
        movementsArray = [];
      }

      console.log(
        `💰 [CashService] ${movementsArray.length} movimientos obtenidos`
      );
      return movementsArray;
    } catch (error) {
      console.error("❌ [CashService] Error obteniendo movimientos:", error);
      return [];
    }
  }

  // ✅ NUEVO: Crear movimiento REAL
  async createMovement(movementData) {
    try {
      console.log("💰 [CashService] Creando movimiento:", movementData);

      // Validar datos requeridos
      if (!movementData.type || !movementData.concept || !movementData.amount) {
        throw new Error("Datos incompletos para crear movimiento");
      }

      const movementPayload = {
        type: movementData.type,
        concept: movementData.concept,
        amount: parseFloat(movementData.amount),
        category: movementData.category || "other",
        payment_method: movementData.payment_method || "cash",
        receipt_number: movementData.receipt_number || null,
        observations: movementData.observations || null,
        cash_register_id: movementData.cash_register_id,
      };

      const result = await this.apiService.post(
        this.apiService.endpoints.MOVEMENTS,
        movementPayload
      );

      // Invalidar cache
      this.clearCache();

      console.log("💰 [CashService] Movimiento creado:", result);
      return result;
    } catch (error) {
      console.error("❌ [CashService] Error creando movimiento:", error);
      throw error;
    }
  }

  // ✅ CORREGIDO: Obtener movimientos del día actual
  async getTodayMovements(cashRegisterId = null) {
    try {
      console.log("💰 [CashService] Obteniendo movimientos de hoy...");

      const queryParams = new URLSearchParams();
      if (cashRegisterId)
        queryParams.append("cash_register_id", cashRegisterId);

      const url = `${this.apiService.endpoints.MOVEMENTS_TODAY}?${queryParams}`;
      const response = await this.apiService.get(url);

      // ✅ CORRECCIÓN: Manejar estructura de la API
      let movementsArray = [];

      if (
        response &&
        response.success === true &&
        Array.isArray(response.data)
      ) {
        movementsArray = response.data;
      } else if (Array.isArray(response)) {
        movementsArray = response;
      } else if (response && Array.isArray(response.data)) {
        movementsArray = response.data;
      } else {
        console.warn("⚠️ Estructura inesperada en movimientos hoy:", response);
        movementsArray = [];
      }

      console.log(
        `💰 [CashService] ${movementsArray.length} movimientos de hoy`
      );
      return movementsArray;
    } catch (error) {
      console.error(
        "❌ [CashService] Error obteniendo movimientos de hoy:",
        error
      );
      return [];
    }
  }

  async getMovementTotals(cashRegisterId, date = null) {
    try {
      console.log("💰 [CashService] Obteniendo totales de movimientos...");

      // ✅ CORRECCIÓN CRÍTICA: Si no hay ID válido, verificar estado real
      if (
        !cashRegisterId ||
        cashRegisterId === "null" ||
        cashRegisterId === "undefined"
      ) {
        console.log(
          "🔍 cashRegisterId inválido, verificando estado de caja..."
        );

        // Obtener el estado ACTUAL de la caja
        const cashStatus = await this.getCashStatus();

        // Si no hay caja abierta, devolver ceros inmediatamente
        if (!cashStatus || cashStatus.status !== "open") {
          console.log("ℹ️  No hay caja abierta, devolviendo ceros");
          return { ingresos: 0, egresos: 0 };
        }

        // Si HAY caja abierta, usar su ID
        cashRegisterId = cashStatus.id;
        console.log("✅ Caja abierta encontrada, usando ID:", cashRegisterId);
      }

      // Solo construir la query si tenemos un ID válido
      const queryParams = new URLSearchParams();
      queryParams.append("cash_register_id", cashRegisterId);

      if (date) {
        queryParams.append("date", date);
      }

      const url = `${this.apiService.endpoints.MOVEMENTS_TOTALS}?${queryParams}`;
      console.log("🌐 URL de consulta:", url);

      const response = await this.apiService.get(url);
      console.log("💰 [CashService] Respuesta API:", response);

      // ✅ Manejo simple de respuesta
      if (response && response.success === true && response.data) {
        return response.data;
      } else if (
        response &&
        (response.ingresos !== undefined || response.egresos !== undefined)
      ) {
        return response;
      } else {
        console.warn("⚠️  Respuesta inesperada, devolviendo ceros:", response);
        return { ingresos: 0, egresos: 0 };
      }
    } catch (error) {
      console.error(
        "❌ [CashService] Error obteniendo totales:",
        error.message
      );
      // Si hay cualquier error, devolver ceros (la UI no se rompe)
      return { ingresos: 0, egresos: 0 };
    }
  }

  // ✅ NUEVO: Eliminar movimiento
  async deleteMovement(id) {
    try {
      console.log(`💰 [CashService] Eliminando movimiento #${id}...`);

      const response = await this.apiService.delete(
        `${this.apiService.endpoints.MOVEMENTS}/${id}`
      );

      this.clearCache();

      // ✅ CORRECCIÓN: Manejar estructura de la API
      if (response && response.success === true) {
        console.log("💰 [CashService] Movimiento eliminado:", response);
        return response;
      } else {
        console.warn("💰 [CashService] Respuesta inesperada:", response);
        return response || { success: true };
      }
    } catch (error) {
      console.error(
        `❌ [CashService] Error eliminando movimiento ${id}:`,
        error
      );
      throw error;
    }
  }

  // ✅ MEJORADO: Calcular métricas incluyendo movimientos
  calculateMetrics(sales, movements = [], cashRegisterId) {
    // Calcular métricas de ventas
    const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const transactions = sales.length;
    const averageTicket = transactions > 0 ? totalSales / transactions : 0;

    // Calcular distribución por método de pago (solo ventas)
    const paymentMethods = {
      cash: 0,
      card: 0,
      virtualpay: 0,
    };

    sales.forEach((sale) => {
      if (
        sale.paymentmethod &&
        paymentMethods.hasOwnProperty(sale.paymentmethod)
      ) {
        paymentMethods[sale.paymentmethod] += sale.total || 0;
      }
    });

    // ✅ NUEVO: Calcular totales de movimientos
    const movementIngresos = movements
      .filter((m) => m.type === "ingreso")
      .reduce((sum, m) => sum + (m.amount || 0), 0);

    const movementEgresos = movements
      .filter((m) => m.type === "egreso")
      .reduce((sum, m) => sum + (m.amount || 0), 0);

    return {
      // Métricas de ventas
      totalSales: parseFloat(totalSales.toFixed(2)),
      transactions,
      averageTicket: parseFloat(averageTicket.toFixed(2)),
      cashTotal: parseFloat(paymentMethods.cash.toFixed(2)),
      cardTotal: parseFloat(paymentMethods.card.toFixed(2)),
      virtualTotal: parseFloat(paymentMethods.virtualpay.toFixed(2)),

      // ✅ NUEVO: Métricas de movimientos
      movementIngresos: parseFloat(movementIngresos.toFixed(2)),
      movementEgresos: parseFloat(movementEgresos.toFixed(2)),
      netMovements: parseFloat((movementIngresos - movementEgresos).toFixed(2)),
    };
  }

  // Métodos de utilidad
  calculateOpenDuration(startTime) {
    if (!startTime) return "0h 0m";
    const diff = new Date() - new Date(startTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  formatTime(dateStr) {
    return dateStr ? new Date(dateStr).toLocaleTimeString("es-AR") : "--:--";
  }

  getCashState(cashData) {
    if (!cashData) {
      return {
        isOpen: false,
        operator: null,
        currentAmount: 0,
        startTime: null,
        duration: "0h 0m",
      };
    }

    return {
      isOpen: cashData.status === "open",
      operator: `Usuario ${cashData.userid}`,
      currentAmount: parseFloat(cashData.startingcash) || 0,
      startTime: cashData.starttime,
      duration: this.calculateOpenDuration(cashData.starttime),
      id: cashData.id,
    };
  }

  isCacheValid() {
    return (
      this.cache.cashStatus &&
      this.cache.lastUpdate &&
      Date.now() - this.cache.lastUpdate < this.cache.ttl
    );
  }

  clearCache() {
    this.cache = {
      cashStatus: null,
      todaySales: null,
      movements: null,
      lastUpdate: null,
      ttl: 30000,
    };
    console.log("💰 [CashService] Cache completamente limpiado");
  }
}

export default CashService;
