// assets/js/cash-card.js - VERSIÓN QUE USA SOLO LO NECESARIO

class CashCard {
  constructor() {
    this.selectors = {
      amount: "cash-amount",
      user: "cash-user",
      start: "cash-start",
      status: "cash-status",
      openDuration: "open-duration",
      timestamp: "cash-timestamp",
      btnAction: "btn-cash-action",
      btnClose: "btn-cash-close",
    };

    this.state = {
      isOpen: false,
      currentAmount: 0,
      openDuration: "0h 0m",
      lastUpdate: null,
      cashRegisterId: null,
      operator: null,
      startTime: null,
    };

    this.isInitialized = false;
    this.updateInterval = null;
    this.durationInterval = null;
    this.currentUser = null;
  }

  async init(user) {
    if (this.isInitialized) return this;

    console.log("🔄 [CashCard] Inicializando tarjeta de caja...");
    this.currentUser = user;

    if (!this.elementsExist()) {
      console.warn("⚠️ [CashCard] Elementos no encontrados");
      return this;
    }

    this.setupEventListeners();
    await this.update();

    // Actualizar automáticamente cada 2 minutos
    this.updateInterval = setInterval(() => this.update(), 2 * 60 * 1000);

    this.isInitialized = true;
    console.log("✅ [CashCard] Tarjeta de caja inicializada");
    return this;
  }

  async update() {
    try {
      this.showLoading();

      // ✅ USAR SERVICIO CENTRALIZADO - SOLO OBTENER ESTADO DE CAJA
      const cashStatus = await window.cashService.getCashStatus();

      if (cashStatus) {
        await this.processOpenState(cashStatus);
      } else {
        this.processClosedState();
      }

      this.render();
      console.log("💰 [CashCard] Actualizada:", this.state);
    } catch (error) {
      console.error("❌ [CashCard] Error actualizando:", error);
      this.showError(error.message);
    }
  }

  async processOpenState(cashData) {
    this.state = {
      isOpen: true,
      currentAmount: parseFloat(cashData.startingcash) || 0,
      openDuration: window.cashService.calculateOpenDuration(
        cashData.starttime
      ),
      lastUpdate: new Date(),
      cashRegisterId: cashData.id,
      operator: cashData.operator || this.currentUser?.username || "Operador",
      startTime: cashData.starttime,
    };

    // ✅ CARGAR SOLO EL EFECTIVO ACTUAL (sin métricas detalladas)
    await this.loadCurrentCashOnly(cashData.id);

    this.startDurationTimer(cashData.starttime);
  }

  async loadCurrentCashOnly(cashRegisterId) {
    try {
      // ✅ OBTENER SOLO LAS VENTAS PARA CALCULAR EFECTIVO
      const todaySales = await window.cashService.getTodaySales(cashRegisterId);

      // ✅ CALCULAR MANUALMENTE SOLO EL EFECTIVO (sin usar calculateMetrics)
      const cashSales = todaySales.reduce((total, sale) => {
        const paymentMethod = sale.paymentmethod?.toLowerCase();
        const saleAmount = parseFloat(sale.totalamount) || 0;

        // Solo sumar ventas en efectivo
        if (paymentMethod === "cash" || paymentMethod === "efectivo") {
          return total + saleAmount;
        }
        return total;
      }, 0);

      // Efectivo actual = monto inicial + ventas en efectivo
      const startingCash = parseFloat(this.state.currentAmount) || 0;
      this.state.currentAmount = startingCash + cashSales;

      console.log("💰 [CashCard] Efectivo calculado:", {
        startingCash,
        cashSales,
        total: this.state.currentAmount,
      });
    } catch (error) {
      console.warn("⚠️ [CashCard] Error calculando efectivo:", error);
    }
  }

  processClosedState() {
    this.state = {
      isOpen: false,
      currentAmount: 0,
      openDuration: "0h 0m",
      lastUpdate: new Date(),
      cashRegisterId: null,
      operator: null,
      startTime: null,
    };

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  startDurationTimer(startTime) {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    this.durationInterval = setInterval(() => {
      if (this.state.isOpen && startTime) {
        this.state.openDuration =
          window.cashService.calculateOpenDuration(startTime);
        this.updateElement(
          this.selectors.openDuration,
          this.state.openDuration
        );
      }
    }, 60 * 1000);
  }

  render() {
    if (this.state.isOpen) {
      this.renderOpenState();
    } else {
      this.renderClosedState();
    }
    this.updateTimestamp();
  }

  // En cash-card.js - modificar renderOpenState:
  renderOpenState() {
    const totalAmount = this.state.currentAmount;

    console.log("🎨 [CashCard] Renderizando estado ABIERTO:", {
      amount: totalAmount,
      operator: this.state.operator,
      startTime: this.state.startTime,
      duration: this.state.openDuration,
    });

    // ✅ MOSTRAR INFORMACIÓN MÁS CLARA
    let amountDisplay;
    if (totalAmount === 0) {
      amountDisplay = `<span class="text-warning">$0.00 <small>(sin movimientos)</small></span>`;
    } else {
      amountDisplay = `$${totalAmount.toLocaleString("es-AR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }

    this.updateElement(this.selectors.amount, amountDisplay);
    this.updateElement(this.selectors.user, `Operador: ${this.state.operator}`);
    this.updateElement(
      this.selectors.start,
      `Iniciada: ${window.cashService.formatTime(this.state.startTime)}`
    );
    this.updateElement(
      this.selectors.status,
      `<span class="badge bg-success">Abierta</span>`
    );
    this.updateElement(this.selectors.openDuration, this.state.openDuration);

    this.renderActionButton("Registrar Venta", "btn-success", () =>
      this.openSalesForm()
    );
    this.showElement(this.selectors.btnClose);
  }

  renderClosedState() {
    this.updateElement(this.selectors.amount, "$0.00");
    this.updateElement(this.selectors.user, "Operador: --");
    this.updateElement(this.selectors.start, "Caja cerrada");
    this.updateElement(
      this.selectors.status,
      `<span class="badge bg-danger">Cerrada</span>`
    );
    this.updateElement(this.selectors.openDuration, "0h 0m");

    this.renderActionButton("Abrir Caja", "btn-success", () =>
      this.openCashRegister()
    );
    this.hideElement(this.selectors.btnClose);
  }

  renderActionButton(text, buttonClass, onClick) {
    const actionButton = document.getElementById(this.selectors.btnAction);
    if (!actionButton) return;

    const icon = text.includes("Registrar") ? "shopping_cart" : "point_of_sale";

    actionButton.innerHTML = `
      <i class="material-icons align-middle me-1">${icon}</i>
      ${text}
    `;
    actionButton.className = `btn ${buttonClass} btn-sm flex-grow-1 cash-action-btn`;
    actionButton.onclick = onClick;
    actionButton.disabled = false;
  }

  // ✅ MÉTODOS DE ACCIÓN
  async openCashRegister() {
    try {
      this.disableButtons();

      const monto = prompt("Ingrese monto inicial de la caja:");
      if (!monto || isNaN(monto) || parseFloat(monto) < 0) {
        alert("Por favor ingrese un monto válido mayor o igual a 0");
        this.enableButtons();
        return;
      }

      console.log("🔄 [CashCard] Abriendo caja con monto:", monto);
      await window.cashService.openCashRegister(
        parseFloat(monto),
        "Apertura desde dashboard"
      );

      alert("✅ Caja abierta correctamente");
      await this.update();
    } catch (error) {
      console.error("❌ [CashCard] Error abriendo caja:", error);
      alert(`❌ ${error.message || "Error al abrir la caja"}`);
    } finally {
      this.enableButtons();
    }
  }

  async closeCashRegister() {
    try {
      if (!this.state.cashRegisterId) {
        alert("No hay caja abierta actualmente");
        return;
      }

      this.disableButtons();

      const monto = prompt(
        "Ingrese monto final de la caja:",
        this.state.currentAmount.toFixed(2)
      );
      if (!monto || isNaN(monto)) {
        alert("Por favor ingrese un monto válido");
        this.enableButtons();
        return;
      }

      console.log("🔄 [CashCard] Cerrando caja ID:", this.state.cashRegisterId);
      await window.cashService.closeCashRegister(
        this.state.cashRegisterId,
        parseFloat(monto),
        "Cierre desde dashboard"
      );

      alert("✅ Caja cerrada correctamente");
      await this.update();
    } catch (error) {
      console.error("❌ [CashCard] Error cerrando caja:", error);
      alert(`❌ ${error.message || "Error al cerrar la caja"}`);
    } finally {
      this.enableButtons();
    }
  }

  openSalesForm() {
    console.log("📋 [CashCard] Abriendo formulario de venta...");

    if (!this.state.isOpen) {
      alert("La caja está cerrada. Ábrala antes de registrar una venta.");
      return;
    }

    if (typeof window.mostrarFormularioVentas === "function") {
      window.mostrarFormularioVentas();
    } else {
      console.error(
        "❌ [CashCard] Función de formulario de ventas no disponible"
      );
      alert(
        "Error: El formulario de ventas no está cargado. Recarga la página."
      );
    }
  }

  // ✅ MÉTODOS DE UTILIDAD (se mantienen igual)
  setupEventListeners() {
    const closeBtn = document.getElementById(this.selectors.btnClose);
    if (closeBtn) closeBtn.onclick = () => this.closeCashRegister();
  }

  disableButtons() {
    const actionBtn = document.getElementById(this.selectors.btnAction);
    const closeBtn = document.getElementById(this.selectors.btnClose);
    if (actionBtn) actionBtn.disabled = true;
    if (closeBtn) closeBtn.disabled = true;
  }

  enableButtons() {
    const actionBtn = document.getElementById(this.selectors.btnAction);
    const closeBtn = document.getElementById(this.selectors.btnClose);
    if (actionBtn) actionBtn.disabled = false;
    if (closeBtn) closeBtn.disabled = false;
  }

  showElement(selector) {
    const element = document.getElementById(selector);
    if (element) element.classList.remove("d-none");
  }

  hideElement(selector) {
    const element = document.getElementById(selector);
    if (element) element.classList.add("d-none");
  }

  updateElement(selector, value) {
    const element = document.getElementById(selector);
    if (element) {
      if (typeof value === "string" && value.includes("<")) {
        element.innerHTML = value;
      } else {
        element.textContent = value;
      }
    }
  }

  updateTimestamp() {
    const timestampElement = document.getElementById(this.selectors.timestamp);
    if (timestampElement) {
      const now = this.state.lastUpdate || new Date();
      timestampElement.textContent = `Actualizado: ${now.toLocaleTimeString(
        "es-AR",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`;
    }
  }

  showLoading() {
    this.updateElement(this.selectors.amount, "...");
    this.updateElement(this.selectors.start, "Cargando estado...");
    this.updateElement(
      this.selectors.status,
      `<span class="badge bg-warning">Cargando...</span>`
    );
    this.disableButtons();
  }

  showError(message = "Error de conexión") {
    this.updateElement(this.selectors.amount, "$0.00");
    this.updateElement(this.selectors.start, message);
    this.updateElement(
      this.selectors.status,
      `<span class="badge bg-danger">Error</span>`
    );
    this.renderActionButton("Reintentar", "btn-warning", () => this.refresh());
    this.hideElement(this.selectors.btnClose);
  }

  elementsExist() {
    const requiredSelectors = [
      this.selectors.amount,
      this.selectors.start,
      this.selectors.status,
      this.selectors.btnAction,
    ];
    return requiredSelectors.every((selector) =>
      document.getElementById(selector)
    );
  }

  async refresh() {
    console.log("🔄 [CashCard] Forzando actualización...");
    window.cashService.invalidateCache();
    await this.update();
  }

  getState() {
    return { ...this.state };
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      console.log("🧹 [CashCard] Intervalo de actualización limpiado");
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      console.log("🧹 [CashCard] Intervalo de duración limpiado");
    }
    this.isInitialized = false;
  }
}

// ✅ FUNCIÓN DE INICIALIZACIÓN (se mantiene igual)
export async function initCashCard(user) {
  try {
    if (window.cashCard) window.cashCard.destroy();
    window.cashCard = new CashCard();
    await window.cashCard.init(user);
    console.log("✅ [CashCard] Instancia global creada");
    return window.cashCard;
  } catch (error) {
    console.error("❌ [CashCard] Error inicializando:", error);
    return null;
  }
}

export async function recargarEstadoCaja() {
  console.log("🔄 [CashCard] Recargando estado de caja...");
  if (window.cashCard && typeof window.cashCard.refresh === "function") {
    await window.cashCard.refresh();
  } else {
    console.warn("⚠️ [CashCard] Instancia no disponible para recargar");
  }
}

window.recargarEstadoCaja = recargarEstadoCaja;
