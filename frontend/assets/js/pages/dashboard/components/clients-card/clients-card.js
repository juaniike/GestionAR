// clients-card.js - VERSIÓN MEJORADA (BASADA EN STOCK CARD)
class ClientsCard {
  constructor() {
    this.selectors = {
      debtCount: "clients-debt-count",
      lastDebt: "clients-last-debt",
      totalDebt: "clients-total-debt",
      progress: "clients-progress",
      timestamp: "clients-timestamp",
    };
    this.stats = {
      debtCount: 0,
      totalDebt: 0,
      lastClient: "Ninguno",
      lastUpdate: null,
    };
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return this;

    console.log("🔄 Inicializando tarjeta de clientes...");

    // Verificar que los elementos existan
    if (!this.elementsExist()) {
      console.warn("⚠️ Elementos de clients card no encontrados");
      return this;
    }

    await this.update();

    // Actualizar automáticamente cada 10 minutos
    setInterval(() => this.update(), 10 * 60 * 1000);

    this.isInitialized = true;
    console.log("✅ Clients card inicializada");
    return this;
  }

  async update() {
    try {
      this.showLoading();

      const clients = await this.fetchClients();
      this.calculateStats(clients);
      this.render();

      console.log("📊 Clients card actualizada:", this.stats);
    } catch (error) {
      console.error("❌ Error actualizando clients card:", error);
      this.showError();
    }
  }

  async fetchClients() {
    const user = this.getUserWithToken();
    if (!user?.token) throw new Error("Usuario no autenticado");

    const response = await fetch("http://localhost:3000/clients", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status} al obtener clientes`);
    }

    return await response.json();
  }

  calculateStats(clients) {
    if (!Array.isArray(clients) || clients.length === 0) {
      this.stats = {
        debtCount: 0,
        totalDebt: 0,
        lastClient: "Ninguno",
        lastUpdate: new Date(),
      };
      return;
    }

    // Filtrar clientes con deuda (balance negativo)
    const clientsWithDebt = clients.filter((client) => {
      const balance = parseFloat(client.balance) || 0;
      return balance < 0;
    });

    // Calcular deuda total
    const totalDebt = clientsWithDebt.reduce((sum, client) => {
      return sum + Math.abs(parseFloat(client.balance) || 0);
    }, 0);

    // Encontrar cliente con deuda más reciente (por fecha de última transacción)
    const lastClientWithDebt = this.findLastClientWithDebt(clientsWithDebt);

    this.stats = {
      debtCount: clientsWithDebt.length,
      totalDebt: totalDebt,
      lastClient: lastClientWithDebt,
      lastUpdate: new Date(),
      totalClients: clients.length,
      debtPercentage:
        clients.length > 0
          ? (clientsWithDebt.length / clients.length) * 100
          : 0,
    };
  }

  findLastClientWithDebt(clientsWithDebt) {
    if (clientsWithDebt.length === 0) return "Ninguno";

    // Ordenar por fecha de última transacción (si existe) o usar el primero
    const sortedClients = [...clientsWithDebt].sort((a, b) => {
      const dateA = a.lastTransaction
        ? new Date(a.lastTransaction)
        : new Date(0);
      const dateB = b.lastTransaction
        ? new Date(b.lastTransaction)
        : new Date(0);
      return dateB - dateA; // Más reciente primero
    });

    return sortedClients[0].name || "Cliente sin nombre";
  }

  render() {
    // Actualizar números
    this.updateElement(this.selectors.debtCount, this.stats.debtCount);
    this.updateElement(
      this.selectors.lastDebt,
      `Cliente: ${this.stats.lastClient}`
    );
    this.updateElement(
      this.selectors.totalDebt,
      `Total: $${this.stats.totalDebt.toFixed(2)}`
    );

    // Actualizar barra de progreso
    this.renderProgressBar();

    // Actualizar timestamp
    this.updateTimestamp();
  }

  updateElement(selector, value) {
    const element = document.getElementById(selector);
    if (element) element.textContent = value;
  }

  renderProgressBar() {
    const progressBar = document.getElementById(this.selectors.progress);
    if (!progressBar) return;

    // Progreso basado en porcentaje de clientes con deuda
    const progress = Math.min(this.stats.debtPercentage, 100);

    progressBar.innerHTML = `
      <div class="progress-bar bg-danger" style="width: ${progress}%"
           title="${this.stats.debtCount} de ${this.stats.totalClients} clientes con deuda"></div>
    `;
  }

  updateTimestamp() {
    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) {
      const now = this.stats.lastUpdate || new Date();
      timestampElement.textContent = `Actualizado: ${now.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;
    }
  }

  showLoading() {
    this.updateElement(this.selectors.debtCount, "...");
    this.updateElement(this.selectors.lastDebt, "Cargando...");
    this.updateElement(this.selectors.totalDebt, "Calculando...");

    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) timestampElement.textContent = "Actualizando...";
  }

  showError() {
    this.updateElement(this.selectors.debtCount, "0");
    this.updateElement(this.selectors.lastDebt, "Error al cargar");
    this.updateElement(this.selectors.totalDebt, "---");

    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) timestampElement.textContent = "Error al cargar";
  }

  elementsExist() {
    return (
      document.getElementById(this.selectors.debtCount) &&
      document.getElementById(this.selectors.lastDebt) &&
      document.getElementById(this.selectors.totalDebt)
    );
  }

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
      return null;
    }
  }

  // Método para forzar actualización desde otros módulos
  async refresh() {
    await this.update();
  }

  // Obtener estadísticas actuales
  getStats() {
    return { ...this.stats };
  }
}

// ✅ FUNCIÓN DE INICIALIZACIÓN EXPORTADA
export async function initClientsCard() {
  try {
    // Crear instancia global
    window.clientsCard = new ClientsCard();
    await window.clientsCard.init();
    return window.clientsCard;
  } catch (error) {
    console.error("❌ Error inicializando clients card:", error);
    return null;
  }
}

// Mantener compatibilidad con función original
export default ClientsCard;
