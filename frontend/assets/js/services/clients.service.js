// assets/js/services/clients.service.js
class ClientsService {
  constructor(apiService) {
    this.apiService = apiService;
    this.cache = {
      clients: null,
      lastUpdate: null,
      ttl: 60000, // 1 minuto
    };
    console.log("👥 ClientsService instanciado");
  }

  async getAllClients(forceRefresh = false) {
    try {
      if (!forceRefresh && this.isCacheValid()) {
        console.log("👥 [ClientsService] Usando clientes en cache");
        return this.cache.clients;
      }

      console.log("👥 [ClientsService] Obteniendo clientes...");
      const clients = await this.apiService.get(
        this.apiService.endpoints.CLIENTS
      );

      // Procesar datos según tu modelo
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
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }

  calculateClientsSummary(clients) {
    const activeClients = clients.filter(
      (client) => client.type === "client" && client.balance >= 0
    );

    const suppliers = clients.filter((client) => client.type === "supplier");
    const totalDebt = clients.reduce((sum, client) => {
      // Considerar saldo negativo como deuda
      return client.balance < 0 ? sum + Math.abs(client.balance) : sum;
    }, 0);

    const totalCredit = clients.reduce((sum, client) => {
      // Considerar saldo positivo como crédito
      return client.balance > 0 ? sum + client.balance : sum;
    }, 0);

    return {
      total: clients.length,
      active: activeClients.length,
      suppliers: suppliers.length,
      totalDebt: parseFloat(totalDebt.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      netBalance: parseFloat((totalCredit - totalDebt).toFixed(2)),
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
      formatted: `$${Math.abs(amount).toFixed(2)} ${
        amount < 0 ? "(Debe)" : "(A Favor)"
      }`,
    };
  }

  isCacheValid() {
    return (
      this.cache.clients &&
      this.cache.lastUpdate &&
      Date.now() - this.cache.lastUpdate < this.cache.ttl
    );
  }

  clearCache() {
    this.cache.clients = null;
    this.cache.lastUpdate = null;
    console.log("👥 [ClientsService] Cache limpiado");
  }
}

export default ClientsService;
