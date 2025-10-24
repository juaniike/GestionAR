// assets/js/stock-card.js - MÓDULO PARA LA TARJETA DE STOCK

class StockCard {
  constructor() {
    this.selectors = {
      critical: "stock-critical",
      stable: "stock-stable",
      over: "stock-over",
      progress: "stock-progress",
      timestamp: "stock-timestamp",
    };
    this.stats = { critical: 0, stable: 0, over: 0, total: 0 };
  }

  async init() {
    console.log("🔄 Inicializando tarjeta de stock...");

    // Verificar que los elementos existan
    if (!this.elementsExist()) {
      console.warn("⚠️ Elementos de stock card no encontrados");
      return this;
    }

    await this.update();

    // Actualizar automáticamente cada 5 minutos
    setInterval(() => this.update(), 5 * 60 * 1000);

    console.log("✅ Stock card inicializada");
    return this;
  }

  async update() {
    try {
      this.showLoading();

      const products = await this.fetchProducts();
      this.calculateStats(products);
      this.render();

      console.log("📊 Stock card actualizada:", this.stats);
    } catch (error) {
      console.error("❌ Error actualizando stock card:", error);
      this.showError();
    }
  }

  async fetchProducts() {
    const user = this.getUserWithToken();
    if (!user?.token) throw new Error("Usuario no autenticado");

    const response = await fetch("http://localhost:3000/products", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok)
      throw new Error(`Error ${response.status} al obtener productos`);
    return await response.json();
  }

  calculateStats(products) {
    this.stats = { critical: 0, stable: 0, over: 0, total: products.length };

    products.forEach((product) => {
      const stock = product.stock || 0;
      const minStock = product.minstock || 5;
      const maxNormalStock = minStock * 3;

      if (stock === 0 || stock <= minStock) {
        this.stats.critical++;
      } else if (stock <= maxNormalStock) {
        this.stats.stable++;
      } else {
        this.stats.over++;
      }
    });

    // Calcular porcentajes
    this.stats.criticalPercent =
      this.stats.total > 0 ? (this.stats.critical / this.stats.total) * 100 : 0;
    this.stats.stablePercent =
      this.stats.total > 0 ? (this.stats.stable / this.stats.total) * 100 : 0;
    this.stats.overPercent =
      this.stats.total > 0 ? (this.stats.over / this.stats.total) * 100 : 0;
  }

  render() {
    // Actualizar números
    this.updateElement(this.selectors.critical, this.stats.critical);
    this.updateElement(this.selectors.stable, this.stats.stable);
    this.updateElement(this.selectors.over, this.stats.over);

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

    progressBar.innerHTML = `
            <div class="progress-bar bg-danger" style="width: ${this.stats.criticalPercent}%"
                 title="${this.stats.critical} productos en stock crítico"></div>
            <div class="progress-bar bg-success" style="width: ${this.stats.stablePercent}%"
                 title="${this.stats.stable} productos en stock estable"></div>
            <div class="progress-bar bg-warning" style="width: ${this.stats.overPercent}%"
                 title="${this.stats.over} productos en sobre-stock"></div>
        `;
  }

  updateTimestamp() {
    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) {
      const now = new Date();
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
    this.updateElement(this.selectors.critical, "...");
    this.updateElement(this.selectors.stable, "...");
    this.updateElement(this.selectors.over, "...");

    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) timestampElement.textContent = "Actualizando...";
  }

  showError() {
    this.updateElement(this.selectors.critical, "0");
    this.updateElement(this.selectors.stable, "0");
    this.updateElement(this.selectors.over, "0");

    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) timestampElement.textContent = "Error al cargar";
  }

  elementsExist() {
    return (
      document.getElementById(this.selectors.critical) &&
      document.getElementById(this.selectors.stable) &&
      document.getElementById(this.selectors.over)
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

  // Obtener estadísticas actuales (para otros módulos)
  getStats() {
    return { ...this.stats };
  }
}

// ✅ FUNCIÓN DE INICIALIZACIÓN EXPORTADA
export async function initStockCard() {
  try {
    // Crear instancia global
    window.stockCard = new StockCard();
    await window.stockCard.init();
    return window.stockCard;
  } catch (error) {
    console.error("❌ Error inicializando stock card:", error);
    return null;
  }
}

// Exportar la clase por si se necesita
export default StockCard;
