// assets/js/services/cash-service.js - SERVICIO CENTRALIZADO DE CAJA
class CashService {
  constructor() {
    this.baseURL = "http://localhost:3000";
    this.cache = {
      cashStatus: null,
      todaySales: null,
      lastUpdate: null,
      ttl: 60000, // 1 minuto de cache
    };
  }

  // ✅ OBTENER ESTADO ACTUAL DE CAJA
  async getCashStatus(forceRefresh = false) {
    // Verificar cache
    if (!forceRefresh && this.isCacheValid("cashStatus")) {
      console.log("💰 [CashService] Usando cache de estado de caja");
      return this.cache.cashStatus;
    }

    try {
      const user = this.getUserWithToken();
      if (!user?.token) {
        throw new Error("Usuario no autenticado");
      }

      console.log("💰 [CashService] Obteniendo estado de caja...");
      const response = await fetch(`${this.baseURL}/cash-register/status`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        // Caja cerrada - esto es normal, no es error
        this.cache.cashStatus = null;
        this.cache.lastUpdate = Date.now();
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al obtener estado de caja`);
      }

      const cashData = await response.json();

      // Actualizar cache
      this.cache.cashStatus = cashData;
      this.cache.lastUpdate = Date.now();

      console.log("💰 [CashService] Estado de caja obtenido:", cashData);
      return cashData;
    } catch (error) {
      console.error("❌ [CashService] Error obteniendo estado de caja:", error);
      throw error;
    }
  }

  // ✅ ABRIR CAJA
  async openCashRegister(startingCash, observations = "") {
    try {
      const user = this.getUserWithToken();
      if (!user?.token) {
        throw new Error("Usuario no autenticado");
      }

      console.log("💰 [CashService] Abriendo caja con monto:", startingCash);
      const response = await fetch(`${this.baseURL}/cash-register/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          startingcash: parseFloat(startingCash),
          observations: observations,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Error ${response.status} al abrir caja`
        );
      }

      const result = await response.json();

      // Invalidar cache
      this.cache.cashStatus = null;
      this.cache.todaySales = null;

      console.log("💰 [CashService] Caja abierta correctamente:", result);
      return result;
    } catch (error) {
      console.error("❌ [CashService] Error abriendo caja:", error);
      throw error;
    }
  }

  // ✅ CERRAR CAJA
  async closeCashRegister(cashRegisterId, endingCash, observations = "") {
    try {
      const user = this.getUserWithToken();
      if (!user?.token) {
        throw new Error("Usuario no autenticado");
      }

      console.log("💰 [CashService] Cerrando caja ID:", cashRegisterId);
      const response = await fetch(
        `${this.baseURL}/cash-register/${cashRegisterId}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            endingcash: parseFloat(endingCash),
            observations: observations,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Error ${response.status} al cerrar caja`
        );
      }

      const result = await response.json();

      // Invalidar cache
      this.cache.cashStatus = null;
      this.cache.todaySales = null;

      console.log("💰 [CashService] Caja cerrada correctamente:", result);
      return result;
    } catch (error) {
      console.error("❌ [CashService] Error cerrando caja:", error);
      throw error;
    }
  }

  // ✅ OBTENER VENTAS DEL DÍA
  async getTodaySales(cashRegisterId = null, forceRefresh = false) {
    // Verificar cache
    const cacheKey = `todaySales_${cashRegisterId || "all"}`;
    if (!forceRefresh && this.isCacheValid(cacheKey)) {
      console.log("💰 [CashService] Usando cache de ventas del día");
      return this.cache[cacheKey];
    }

    try {
      const user = this.getUserWithToken();
      if (!user?.token) {
        throw new Error("Usuario no autenticado");
      }

      const today = new Date().toISOString().split("T")[0];
      let url = `${this.baseURL}/sales?date=${today}`;

      if (cashRegisterId) {
        url += `&cashregister=${cashRegisterId}`;
      }

      console.log("💰 [CashService] Obteniendo ventas del día...");
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} al obtener ventas`);
      }

      const sales = await response.json();

      // Actualizar cache
      this.cache[cacheKey] = sales;
      this.cache.lastUpdate = Date.now();

      console.log(`💰 [CashService] ${sales.length} ventas obtenidas`);
      return sales;
    } catch (error) {
      console.error("❌ [CashService] Error obteniendo ventas:", error);
      // En caso de error, retornar array vacío en lugar de fallar completamente
      return [];
    }
  }

  // ✅ CALCULAR MÉTRICAS DE VENTAS
  calculateMetrics(sales, cashRegisterId = null) {
    if (!Array.isArray(sales) || sales.length === 0) {
      return {
        totalSales: 0,
        transactions: 0,
        cashTotal: 0,
        cardTotal: 0,
        virtualTotal: 0,
        totalProfit: 0,
        averageTicket: 0,
      };
    }

    let totalSales = 0;
    let transactions = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let virtualTotal = 0;
    let totalProfit = 0;

    const filteredSales = cashRegisterId
      ? sales.filter((sale) => sale.cashregisterid === cashRegisterId)
      : sales;

    filteredSales.forEach((sale) => {
      const saleAmount = parseFloat(sale.totalamount) || 0;
      const saleProfit = parseFloat(sale.profit) || 0;

      totalSales += saleAmount;
      totalProfit += saleProfit;
      transactions++;

      const paymentMethod = sale.paymentmethod?.toLowerCase();
      if (paymentMethod === "cash" || paymentMethod === "efectivo") {
        cashTotal += saleAmount;
      } else if (paymentMethod === "card" || paymentMethod === "tarjeta") {
        cardTotal += saleAmount;
      } else {
        virtualTotal += saleAmount;
      }
    });

    return {
      totalSales,
      transactions,
      cashTotal,
      cardTotal,
      virtualTotal,
      totalProfit,
      averageTicket: transactions > 0 ? totalSales / transactions : 0,
    };
  }

  // ✅ CALCULAR TIEMPO ACTIVA
  calculateOpenDuration(startTime) {
    if (!startTime) return "0h 0m";

    try {
      const start = new Date(startTime);
      const now = new Date();

      if (isNaN(start.getTime())) {
        return "0h 0m";
      }

      const diffMs = now - start;
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `${diffHrs}h ${diffMins}m`;
    } catch (error) {
      console.warn("⚠️ [CashService] Error calculando duración:", error);
      return "0h 0m";
    }
  }

  // ✅ FORMATEAR HORA
  formatTime(dateStr) {
    try {
      if (!dateStr) return "--";
      const date = new Date(dateStr);
      return isNaN(date.getTime())
        ? "--"
        : date.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          });
    } catch (error) {
      return "--";
    }
  }

  // ✅ VERIFICAR SI LA CAJA ESTÁ ABIERTA (MÉTODO DE CONVENIENCIA)
  async isCashRegisterOpen() {
    try {
      const status = await this.getCashStatus();
      return !!status;
    } catch (error) {
      return false;
    }
  }

  // ✅ OBTENER RESUMEN COMPLETO (CAJA + MÉTRICAS)
  async getFullSummary(cashRegisterId = null) {
    try {
      const [cashStatus, todaySales] = await Promise.all([
        this.getCashStatus(),
        this.getTodaySales(cashRegisterId),
      ]);

      const metrics = this.calculateMetrics(todaySales, cashRegisterId);

      return {
        cashStatus,
        sales: todaySales,
        metrics,
        openDuration: cashStatus
          ? this.calculateOpenDuration(cashStatus.starttime)
          : "0h 0m",
        lastUpdate: new Date(),
      };
    } catch (error) {
      console.error(
        "❌ [CashService] Error obteniendo resumen completo:",
        error
      );
      throw error;
    }
  }

  // ✅ INVALIDAR CACHE (PARA FORZAR ACTUALIZACIÓN)
  invalidateCache() {
    this.cache = {
      cashStatus: null,
      todaySales: null,
      lastUpdate: null,
      ttl: 60000,
    };
    console.log("💰 [CashService] Cache invalidado");
  }

  // ✅ VERIFICAR SI EL CACHE ES VÁLIDO
  isCacheValid(key) {
    if (!this.cache[key] || !this.cache.lastUpdate) {
      return false;
    }

    const now = Date.now();
    return now - this.cache.lastUpdate < this.cache.ttl;
  }

  // ✅ OBTENER USUARIO AUTENTICADO
  getUserWithToken() {
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
      console.error("❌ [CashService] Error obteniendo usuario:", error);
      return null;
    }
  }

  // ✅ MANEJO DE ERRORES DE AUTENTICACIÓN
  handleAuthError(error) {
    if (error.message.includes("401") || error.message.includes("token")) {
      console.error("🔐 [CashService] Error de autenticación");

      // Limpiar almacenamiento local
      localStorage.removeItem("user");
      sessionStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      // Redirigir a login
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 1000);

      throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
    }
    throw error;
  }
}

// ✅ CREAR INSTANCIA GLOBAL
window.cashService = new CashService();

// ✅ EXPORTAR PARA MÓDULOS ES6
export default window.cashService;
