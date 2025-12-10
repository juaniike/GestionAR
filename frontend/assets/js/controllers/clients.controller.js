// assets/js/services/clients.service.js
class ClientsService {
  constructor(apiService) {
    this.apiService = apiService;
    this.cache = {
      clients: null,
      accountData: {}, // Cache por cliente
      lastUpdate: null,
      ttl: 60000, // 1 minuto
    };
    console.log("👥 ClientsService instanciado");
  }

  async getAllClients(forceRefresh = false) {
    try {
      if (!forceRefresh && this.isCacheValid("clients")) {
        console.log("👥 [ClientsService] Usando clientes en cache");
        return this.cache.clients;
      }

      console.log("👥 [ClientsService] Obteniendo clientes...");
      const clients = await this.apiService.get(
        this.apiService.endpoints.CLIENTS
      );

      const processedClients = clients.map((client) => ({
        id: client.id,
        name: client.name,
        company: client.company,
        cuil: client.cuil,
        email: client.email,
        phone: client.phone,
        address: client.address,
        type: client.type,
        balance: parseFloat(client.balance) || 0,
        credit_limit: parseFloat(client.credit_limit) || 0,
        credit_days: parseInt(client.credit_days) || 30,
        current_account: client.current_account || false,
        status: client.status || "active",
        observations: client.observations,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
      }));

      this.cache.clients = processedClients;
      this.cache.lastUpdate = Date.now();

      console.log(
        `👥 [ClientsService] ${processedClients.length} clientes cargados`
      );
      return processedClients;
    } catch (error) {
      console.error("❌ [ClientsService] Error obteniendo clientes:", error);
      throw error;
    }
  }

  async getClientById(id) {
    try {
      console.log(`👥 [ClientsService] Obteniendo cliente #${id}...`);
      const client = await this.apiService.get(
        this.apiService.endpoints.CLIENT_BY_ID(id)
      );
      return this.processClientData(client);
    } catch (error) {
      console.error(
        `❌ [ClientsService] Error obteniendo cliente ${id}:`,
        error
      );
      throw error;
    }
  }

  async createClient(clientData) {
    try {
      console.log("👥 [ClientsService] Creando cliente...", clientData);

      const payload = {
        name: clientData.name,
        company: clientData.company || null,
        cuil: clientData.cuil || null,
        email: clientData.email || null,
        phone: clientData.phone || null,
        address: clientData.address || null,
        type: clientData.type || "client",
        credit_limit: clientData.credit_limit || 0,
        credit_days: clientData.credit_days || 30,
        current_account: clientData.current_account || false,
      };

      const result = await this.apiService.post(
        this.apiService.endpoints.CLIENTS,
        payload
      );
      this.clearCache();

      console.log("👥 [ClientsService] Cliente creado:", result);
      return result;
    } catch (error) {
      console.error("❌ [ClientsService] Error creando cliente:", error);
      throw error;
    }
  }

  async updateClient(id, clientData) {
    try {
      console.log(`👥 [ClientsService] Actualizando cliente #${id}...`);

      const payload = {
        name: clientData.name,
        company: clientData.company,
        cuil: clientData.cuil,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        type: clientData.type,
        balance: clientData.balance,
        credit_limit: clientData.credit_limit,
        credit_days: clientData.credit_days,
        current_account: clientData.current_account,
        status: clientData.status,
      };

      const result = await this.apiService.put(
        this.apiService.endpoints.CLIENT_BY_ID(id),
        payload
      );
      this.clearCache();

      console.log(`👥 [ClientsService] Cliente #${id} actualizado`);
      return result;
    } catch (error) {
      console.error(
        `❌ [ClientsService] Error actualizando cliente ${id}:`,
        error
      );
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      console.log(`👥 [ClientsService] Eliminando cliente #${id}...`);
      const result = await this.apiService.delete(
        this.apiService.endpoints.CLIENT_BY_ID(id)
      );
      this.clearCache();

      console.log(`👥 [ClientsService] Cliente #${id} eliminado`);
      return result;
    } catch (error) {
      console.error(
        `❌ [ClientsService] Error eliminando cliente ${id}:`,
        error
      );
      throw error;
    }
  }

  // ✅ NUEVO: Obtener saldo y resumen de cuenta corriente
  async getAccountBalance(clientId) {
    try {
      console.log(
        `💰 [ClientsService] Obteniendo saldo cliente #${clientId}...`
      );

      // Verificar cache primero
      if (
        this.cache.accountData[clientId] &&
        this.isCacheValid(`account_${clientId}`)
      ) {
        return this.cache.accountData[clientId];
      }

      const response = await this.apiService.get(
        `${this.apiService.endpoints.CLIENTS}/${clientId}/account-balance`
      );

      const accountData = {
        client_id: clientId,
        total_debt: parseFloat(response.total_debt) || 0,
        total_paid: parseFloat(response.total_paid) || 0,
        pending_balance: parseFloat(response.pending_balance) || 0,
        pending_count: parseInt(response.pending_count) || 0,
        credit_limit: parseFloat(response.credit_limit) || 0,
        available_credit: parseFloat(response.available_credit) || 0,
        last_updated: new Date().toISOString(),
      };

      // Actualizar cache
      this.cache.accountData[clientId] = accountData;

      console.log(
        `💰 [ClientsService] Saldo obtenido: $${accountData.pending_balance}`
      );
      return accountData;
    } catch (error) {
      console.error(`❌ [ClientsService] Error obteniendo saldo:`, error);
      // Retornar datos vacíos en caso de error
      return {
        client_id: clientId,
        total_debt: 0,
        total_paid: 0,
        pending_balance: 0,
        pending_count: 0,
        credit_limit: 0,
        available_credit: 0,
        last_updated: new Date().toISOString(),
      };
    }
  }

  // ✅ NUEVO: Obtener ventas pendientes de pago
  async getPendingSales(clientId) {
    try {
      console.log(
        `📋 [ClientsService] Obteniendo ventas pendientes cliente #${clientId}...`
      );

      const response = await this.apiService.get(
        `${this.apiService.endpoints.CLIENTS}/${clientId}/pending-sales`
      );

      const pendingSales = Array.isArray(response)
        ? response.map((sale) => ({
            id: sale.id,
            ticket_number: sale.ticket_number,
            date: sale.date,
            total: parseFloat(sale.total) || 0,
            total_paid: parseFloat(sale.total_paid) || 0,
            pending_amount:
              parseFloat(sale.total) - parseFloat(sale.total_paid),
            credit_status: sale.credit_status || "pending",
            paymentmethod: sale.paymentmethod,
            items_count: sale.SalesItems?.length || 0,
          }))
        : [];

      console.log(
        `📋 [ClientsService] ${pendingSales.length} ventas pendientes`
      );
      return pendingSales;
    } catch (error) {
      console.error(
        `❌ [ClientsService] Error obteniendo ventas pendientes:`,
        error
      );
      return [];
    }
  }

  // ✅ NUEVO: Registrar pago a cuenta corriente
  async registerPayment(clientId, paymentData) {
    try {
      console.log(
        `💰 [ClientsService] Registrando pago cliente #${clientId}...`,
        paymentData
      );

      const payload = {
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method || "cash",
        receipt_number: paymentData.receipt_number || null,
        observations: paymentData.observations || null,
        sale_ids: paymentData.sale_ids || [], // IDs específicos de ventas a aplicar
      };

      const response = await this.apiService.post(
        `${this.apiService.endpoints.CLIENTS}/${clientId}/pay-account`,
        payload
      );

      // Limpiar cache de este cliente
      delete this.cache.accountData[clientId];
      this.cache.clients = null; // Forzar recarga de clientes

      console.log(`💰 [ClientsService] Pago registrado: $${payload.amount}`);
      return response;
    } catch (error) {
      console.error(`❌ [ClientsService] Error registrando pago:`, error);
      throw error;
    }
  }

  // ✅ NUEVO: Obtener historial de movimientos de cuenta
  async getAccountMovements(clientId, filters = {}) {
    try {
      console.log(
        `📊 [ClientsService] Obteniendo movimientos cliente #${clientId}...`
      );

      const queryParams = new URLSearchParams();
      if (filters.startDate) queryParams.append("startDate", filters.startDate);
      if (filters.endDate) queryParams.append("endDate", filters.endDate);
      if (filters.type) queryParams.append("type", filters.type);

      const endpoint = queryParams.toString()
        ? `${this.apiService.endpoints.CLIENTS}/${clientId}/account-movements?${queryParams}`
        : `${this.apiService.endpoints.CLIENTS}/${clientId}/account-movements`;

      const response = await this.apiService.get(endpoint);

      const movements = Array.isArray(response)
        ? response.map((mov) => ({
            id: mov.id,
            date: mov.date,
            type: mov.type, // 'debt' o 'payment'
            amount: parseFloat(mov.amount) || 0,
            concept: mov.concept,
            sale_id: mov.sale_id,
            receipt_number: mov.receipt_number,
            payment_method: mov.payment_method,
            balance_after: parseFloat(mov.balance_after) || 0,
            observations: mov.observations,
          }))
        : [];

      console.log(
        `📊 [ClientsService] ${movements.length} movimientos obtenidos`
      );
      return movements;
    } catch (error) {
      console.error(`❌ [ClientsService] Error obteniendo movimientos:`, error);
      return [];
    }
  }

  // ✅ NUEVO: Obtener resumen de crédito (para dashboard)
  async getCreditSummary() {
    try {
      console.log(`📈 [ClientsService] Obteniendo resumen de crédito...`);

      const response = await this.apiService.get(
        `${this.apiService.endpoints.CLIENTS}/credit-summary`
      );

      return {
        total_clients: response.total_clients || 0,
        clients_with_credit: response.clients_with_credit || 0,
        total_credit_limit: parseFloat(response.total_credit_limit) || 0,
        total_debt: parseFloat(response.total_debt) || 0,
        total_paid: parseFloat(response.total_paid) || 0,
        overdue_clients: response.overdue_clients || 0,
        overdue_amount: parseFloat(response.overdue_amount) || 0,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.error(
        `❌ [ClientsService] Error obteniendo resumen crédito:`,
        error
      );
      return {
        total_clients: 0,
        clients_with_credit: 0,
        total_credit_limit: 0,
        total_debt: 0,
        total_paid: 0,
        overdue_clients: 0,
        overdue_amount: 0,
        last_updated: new Date().toISOString(),
      };
    }
  }

  // ✅ NUEVO: Verificar si cliente puede comprar a crédito
  async canClientPurchaseOnCredit(clientId, purchaseAmount) {
    try {
      console.log(
        `🔍 [ClientsService] Verificando crédito cliente #${clientId} para $${purchaseAmount}...`
      );

      const accountData = await this.getAccountBalance(clientId);
      const availableCredit =
        accountData.credit_limit - accountData.pending_balance;

      const canPurchase = availableCredit >= purchaseAmount;

      console.log(
        `🔍 [ClientsService] Crédito disponible: $${availableCredit}, Puede comprar: ${
          canPurchase ? "Sí" : "No"
        }`
      );

      return {
        can_purchase: canPurchase,
        available_credit: availableCredit,
        purchase_amount: purchaseAmount,
        would_exceed: !canPurchase,
        exceeded_amount: canPurchase ? 0 : purchaseAmount - availableCredit,
        client_id: clientId,
      };
    } catch (error) {
      console.error(`❌ [ClientsService] Error verificando crédito:`, error);
      return {
        can_purchase: false,
        available_credit: 0,
        purchase_amount: purchaseAmount,
        would_exceed: true,
        exceeded_amount: purchaseAmount,
        client_id: clientId,
        error: error.message,
      };
    }
  }

  // Métodos de utilidad
  processClientData(client) {
    return {
      id: client.id,
      name: client.name,
      company: client.company,
      cuil: client.cuil,
      email: client.email,
      phone: client.phone,
      address: client.address,
      type: client.type,
      balance: parseFloat(client.balance) || 0,
      credit_limit: parseFloat(client.credit_limit) || 0,
      credit_days: parseInt(client.credit_days) || 30,
      current_account: client.current_account || false,
      status: client.status || "active",
      observations: client.observations,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  calculateClientsSummary(clients) {
    const activeClients = clients.filter(
      (client) => client.type === "client" && client.status === "active"
    );

    const suppliers = clients.filter((client) => client.type === "supplier");

    // Clientes con cuenta corriente
    const clientsWithCredit = clients.filter(
      (client) => client.type === "client" && client.current_account === true
    );

    // Total deuda en cuentas corrientes
    const totalDebt = clientsWithCredit.reduce((sum, client) => {
      return sum + (parseFloat(client.balance) || 0);
    }, 0);

    // Total límite de crédito
    const totalCreditLimit = clientsWithCredit.reduce((sum, client) => {
      return sum + (parseFloat(client.credit_limit) || 0);
    }, 0);

    // Clientes morosos (saldo > límite)
    const overdueClients = clientsWithCredit.filter((client) => {
      const balance = parseFloat(client.balance) || 0;
      const limit = parseFloat(client.credit_limit) || 0;
      return balance > limit && limit > 0; // Solo si tiene límite definido
    });

    const overdueAmount = overdueClients.reduce((sum, client) => {
      const balance = parseFloat(client.balance) || 0;
      const limit = parseFloat(client.credit_limit) || 0;
      return sum + (balance - limit);
    }, 0);

    return {
      total: clients.length,
      active: activeClients.length,
      suppliers: suppliers.length,
      with_credit: clientsWithCredit.length,
      total_debt: parseFloat(totalDebt.toFixed(2)),
      total_credit_limit: parseFloat(totalCreditLimit.toFixed(2)),
      available_credit: parseFloat((totalCreditLimit - totalDebt).toFixed(2)),
      overdue_clients: overdueClients.length,
      overdue_amount: parseFloat(overdueAmount.toFixed(2)),
      credit_utilization:
        totalCreditLimit > 0
          ? parseFloat(((totalDebt / totalCreditLimit) * 100).toFixed(1))
          : 0,
    };
  }

  getClientTypeText(type) {
    const types = {
      client: "Cliente",
      supplier: "Proveedor",
    };
    return types[type] || type;
  }

  formatBalance(balance) {
    const amount = parseFloat(balance) || 0;
    return {
      amount: Math.abs(amount),
      isDebt: amount < 0,
      isCredit: amount > 0,
      formatted: `$${Math.abs(amount).toFixed(2)} ${
        amount < 0 ? "(Debe)" : amount > 0 ? "(A Favor)" : "(Saldo Cero)"
      }`,
    };
  }

  formatCreditStatus(status) {
    const statuses = {
      paid: { text: "Pagado", class: "success" },
      pending: { text: "Pendiente", class: "warning" },
      partial: { text: "Parcial", class: "info" },
      overdue: { text: "Vencido", class: "danger" },
    };
    return statuses[status] || { text: status, class: "secondary" };
  }

  isCacheValid(cacheKey = "clients") {
    if (cacheKey === "clients") {
      return (
        this.cache.clients &&
        this.cache.lastUpdate &&
        Date.now() - this.cache.lastUpdate < this.cache.ttl
      );
    } else {
      // Para cache de datos de cuenta específicos
      const cachedData =
        this.cache.accountData[cacheKey.replace("account_", "")];
      return (
        cachedData &&
        Date.now() - new Date(cachedData.last_updated).getTime() <
          this.cache.ttl
      );
    }
  }

  clearCache() {
    this.cache.clients = null;
    this.cache.accountData = {};
    this.cache.lastUpdate = null;
    console.log("👥 [ClientsService] Cache limpiado");
  }

  clearClientCache(clientId) {
    delete this.cache.accountData[clientId];
    console.log(`👥 [ClientsService] Cache limpiado para cliente ${clientId}`);
  }
}

export default ClientsService;
