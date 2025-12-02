import { showAlert } from "../plugins/alerts.js";

class CashController {
  constructor(cashService, authService) {
    this.cashService = cashService;
    this.authService = authService;
    this.currentUser = null;
    this.cashRegisterId = null;
    this.eventListeners = [];
    this.updateInterval = null;
    this.durationInterval = null;

    console.log("🔄 [CashController] Controlador de caja inicializado");
  }

  async init() {
    console.log(
      "🔄 [CashController] Inicializando página de caja registradora..."
    );

    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.showError("Usuario no autenticado");
      return;
    }

    // Configurar eventos
    this.initCashRegisterEvents();
    // Cargar datos iniciales
    await this.loadCashRegisterData();
    // Configurar actualización automática
    this.setupAutoRefresh();

    console.log("✅ [CashController] Página de caja registradora inicializada");
  }

  initCashRegisterEvents() {
    // Limpiar event listeners anteriores
    this.cleanupEventListeners();

    // Botones principales
    this.setupButton("btn-abrir-caja", () => this.abrirCajaModal());
    this.setupButton("btn-cerrar-caja", () => this.cerrarCajaModal());
    this.setupButton("btn-movimiento", () => this.nuevoMovimientoModal());
    this.setupButton("btn-reporte-caja", () => this.generarReporteDiario());

    // Modal abrir caja
    this.setupButton("btn-confirmar-apertura", () =>
      this.confirmarAperturaCaja()
    );

    // Modal cerrar caja
    this.setupButton("btn-confirmar-cierre", () => this.confirmarCierreCaja());

    // Modal nuevo movimiento
    this.setupButton("btn-guardar-movimiento", () => this.guardarMovimiento());

    // Filtros y inputs
    this.setupInput("monto-final", "input", () => this.calcularDiferencia());
    this.setupButton("btn-refresh-movimientos", () => this.loadMovimientos());
    this.setupButton("btn-ver-todos-movimientos", () =>
      this.mostrarTodosMovimientos()
    );

    const filtroFecha = document.getElementById("filtro-fecha-movimientos");
    const filtroTipo = document.getElementById("filtro-tipo-movimiento");

    if (filtroFecha)
      this.setupElement(filtroFecha, "change", () => this.loadMovimientos());
    if (filtroTipo)
      this.setupElement(filtroTipo, "change", () => this.loadMovimientos());

    console.log("✅ [CashController] Eventos configurados");
  }

  setupButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
      this.setupElement(button, "click", handler);
    }
  }

  setupInput(inputId, eventType, handler) {
    const input = document.getElementById(inputId);
    if (input) {
      this.setupElement(input, eventType, handler);
    }
  }

  setupElement(element, eventType, handler) {
    element.addEventListener(eventType, handler);
    this.eventListeners.push({ element, eventType, handler });
  }

  async loadCashRegisterData() {
    try {
      console.log("🔄 [CashController] Actualizando datos de caja...");

      // Limpiar cache para forzar actualización
      this.cashService.clearCache();

      // Cargar datos en paralelo
      await Promise.all([
        this.loadEstadoCaja(),
        this.loadEstadisticas(),
        this.loadMovimientos(),
      ]);

      console.log("✅ [CashController] Datos de caja actualizados");
    } catch (error) {
      console.error("❌ [CashController] Error cargando datos:", error);
      this.showError("Error de conexión con el servidor");
    }
  }

  async loadEstadoCaja() {
    this.showCajaLoading();

    try {
      const cashStatus = await this.cashService.getCashStatus(true);

      if (cashStatus) {
        this.cashRegisterId = cashStatus.id;
        await this.showCajaAbierta(cashStatus);
      } else {
        this.showCajaCerrada();
      }

      this.actualizarBotonesAccion(!!cashStatus);
    } catch (error) {
      console.error(
        "❌ [CashController] Error cargando estado de caja:",
        error
      );
      this.showCajaError("Error: " + error.message);
    }
  }

  actualizarBotonesAccion(cajaAbierta) {
    const btnAbrir = document.getElementById("btn-abrir-caja");
    const btnCerrar = document.getElementById("btn-cerrar-caja");
    const btnMovimiento = document.getElementById("btn-movimiento");
    const btnReporte = document.getElementById("btn-reporte-caja");

    if (btnAbrir) {
      btnAbrir.classList.toggle("d-none", cajaAbierta);
    }

    if (btnCerrar) {
      btnCerrar.classList.toggle("d-none", !cajaAbierta);
    }

    if (btnMovimiento) btnMovimiento.disabled = !cajaAbierta;
    if (btnReporte) btnReporte.disabled = !cajaAbierta;
  }

  async showCajaAbierta(cashData) {
    const statusCard = document.getElementById("caja-status-card");
    const statusTitle = document.getElementById("caja-status-title");
    const statusDesc = document.getElementById("caja-status-desc");
    const montoActual = document.getElementById("caja-monto-actual");
    const operador = document.getElementById("caja-operador");
    const apertura = document.getElementById("caja-apertura");
    const tiempo = document.getElementById("caja-tiempo");

    if (statusCard) statusCard.className = "card caja-status-open";
    if (statusTitle) {
      statusTitle.textContent = "Caja Abierta";
      statusTitle.className = "text-success mb-1";
    }
    if (statusDesc)
      statusDesc.textContent = `Caja #${cashData.id} - Operaciones activas`;

    const startingCash = parseFloat(cashData.startingcash) || 0;
    const openDuration = this.cashService.calculateOpenDuration(
      cashData.starttime
    );
    const formattedTime = this.cashService.formatTime(cashData.starttime);

    // ✅ ACTUALIZADO: Solo mostrar monto inicial en apertura
    if (montoActual) {
      montoActual.textContent = `$${startingCash.toFixed(2)}`;
      montoActual.className = "text-success";
    }
    if (operador)
      operador.textContent =
        cashData.operator || this.currentUser?.username || "Usuario";
    if (apertura) apertura.textContent = formattedTime;
    if (tiempo) tiempo.textContent = openDuration;

    this.startDurationTimer(cashData.starttime);
    console.log("✅ [CashController] Estado de caja actualizado: ABIERTA");
  }

  showCajaCerrada() {
    const statusCard = document.getElementById("caja-status-card");
    const statusTitle = document.getElementById("caja-status-title");
    const statusDesc = document.getElementById("caja-status-desc");
    const montoActual = document.getElementById("caja-monto-actual");

    if (statusCard) statusCard.className = "card caja-status-closed";
    if (statusTitle) {
      statusTitle.textContent = "Caja Cerrada";
      statusTitle.className = "text-danger mb-1";
    }
    if (statusDesc) statusDesc.textContent = "No hay caja abierta actualmente";
    if (montoActual) {
      montoActual.textContent = "$0.00";
      montoActual.className = "text-danger";
    }

    this.cashRegisterId = null;

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    console.log("✅ [CashController] Estado de caja actualizado: CERRADA");
  }

  showCajaLoading() {
    const statusTitle = document.getElementById("caja-status-title");
    const statusDesc = document.getElementById("caja-status-desc");

    if (statusTitle) statusTitle.textContent = "Cargando...";
    if (statusDesc) statusDesc.textContent = "Verificando estado de caja...";
  }

  showCajaError(message) {
    const statusTitle = document.getElementById("caja-status-title");
    const statusDesc = document.getElementById("caja-status-desc");

    if (statusTitle) {
      statusTitle.textContent = "Error";
      statusTitle.className = "text-warning mb-1";
    }
    if (statusDesc) statusDesc.textContent = message;
  }

  startDurationTimer(startTime) {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    this.durationInterval = setInterval(() => {
      if (startTime) {
        const tiempoElement = document.getElementById("caja-tiempo");
        if (tiempoElement) {
          tiempoElement.textContent =
            this.cashService.calculateOpenDuration(startTime);
        }
      }
    }, 60 * 1000);
  }

  async loadEstadisticas() {
    try {
      console.log("📊 [CashController] Cargando estadísticas...");

      // Obtener ventas de hoy
      const todaySales = await this.cashService.getTodaySales(
        this.cashRegisterId
      );
      console.log("📊 Ventas de hoy:", todaySales.length);

      // ✅ CORREGIDO: Obtener movimientos de hoy Y GUARDAR EN CACHE
      const todayMovements = await this.cashService.getTodayMovements(
        this.cashRegisterId
      );
      console.log("📊 Movimientos de hoy:", todayMovements.length);

      // ✅ CRÍTICO: Actualizar cache del servicio
      this.cashService.cache.movements = todayMovements;
      this.cashService.cache.lastUpdate = Date.now();

      // Obtener totales de movimientos
      const movementTotals = await this.cashService.getMovementTotals(
        this.cashRegisterId
      );
      console.log("📊 Totales movimientos:", movementTotals);

      // Calcular métricas
      const metrics = {
        totalSales: this.calculateTotalSales(todaySales),
        transactions: todaySales.length,
        averageTicket: this.calculateAverageTicket(todaySales),
        cashTotal: this.calculateCashTotal(todaySales),
        cardTotal: this.calculateCardTotal(todaySales),
        virtualTotal: this.calculateVirtualTotal(todaySales),
        movementIngresos: movementTotals.ingresos || 0,
        movementEgresos: movementTotals.egresos || 0,
        netMovements:
          (movementTotals.ingresos || 0) - (movementTotals.egresos || 0),
      };

      console.log("📊 Métricas calculadas:", metrics);
      this.updateEstadisticasUI(metrics);
    } catch (error) {
      console.error("❌ [CashController] Error cargando estadísticas:", error);
    }
  }

  // ✅ MEJORADO: Métodos auxiliares para cálculos
  calculateTotalSales(sales) {
    return sales.reduce(
      (total, sale) => total + (parseFloat(sale.total) || 0),
      0
    );
  }

  calculateAverageTicket(sales) {
    if (sales.length === 0) return 0;
    return this.calculateTotalSales(sales) / sales.length;
  }

  calculateCashTotal(sales) {
    return sales
      .filter((sale) => sale.paymentmethod === "cash")
      .reduce((total, sale) => total + (parseFloat(sale.total) || 0), 0);
  }

  calculateCardTotal(sales) {
    return sales
      .filter((sale) => sale.paymentmethod === "card")
      .reduce((total, sale) => total + (parseFloat(sale.total) || 0), 0);
  }

  calculateVirtualTotal(sales) {
    return sales
      .filter((sale) => sale.paymentmethod === "virtualpay")
      .reduce((total, sale) => total + (parseFloat(sale.total) || 0), 0);
  }

  updateEstadisticasUI(metrics) {
    console.log("📊 [CashController] Actualizando UI con:", metrics);

    // ✅ CORREGIDO: Calcular efectivo total con datos REALES del cache
    const cashStatus = this.cashService.cache.cashStatus;
    const startingCash = cashStatus
      ? parseFloat(cashStatus.startingcash) || 0
      : 0;

    // Ventas en efectivo
    const cashSales = metrics.cashTotal || 0;

    // ✅ CORREGIDO: Usar movimientos del CACHE (no de metrics)
    const todayMovements = this.cashService.cache.movements || [];
    console.log("📊 Movimientos en cache para cálculo:", todayMovements.length);

    // Filtrar solo movimientos en EFECTIVO
    const cashMovements = todayMovements.filter(
      (mov) => mov.payment_method === "cash"
    );
    console.log("📊 Movimientos en efectivo:", cashMovements.length);

    // Calcular ingresos adicionales en efectivo
    const ingresosAdicionalesEfectivo = cashMovements
      .filter((mov) => mov.type === "ingreso")
      .reduce((total, mov) => total + (parseFloat(mov.amount) || 0), 0);

    // Calcular egresos en efectivo
    const egresosEfectivo = cashMovements
      .filter((mov) => mov.type === "egreso")
      .reduce((total, mov) => total + (parseFloat(mov.amount) || 0), 0);

    // ✅ EFECTIVO FÍSICO TOTAL EN CAJA
    const efectivoFisicoTotal =
      startingCash + cashSales + ingresosAdicionalesEfectivo - egresosEfectivo;

    console.log("💰 CÁLCULO DETALLADO:");
    console.log("- Monto inicial:", startingCash);
    console.log("- Ventas efectivo:", cashSales);
    console.log("- Ingresos adicionales:", ingresosAdicionalesEfectivo);
    console.log("- Egresos efectivo:", egresosEfectivo);
    console.log("- TOTAL:", efectivoFisicoTotal);

    // ✅ ACTUALIZAR TARJETA "EFECTIVO TOTAL"
    this.updateElement(
      "stats-efectivo-total",
      `$${efectivoFisicoTotal.toFixed(2)}`
    );

    // ✅ ACTUALIZAR MONTO EN CABECERA
    this.updateElement(
      "caja-monto-actual",
      `$${efectivoFisicoTotal.toFixed(2)}`
    );

    // Actualizar el resto de métricas (sin cambios)
    this.updateElement("stats-ventas-count", metrics.transactions);
    this.updateElement(
      "stats-ventas-total",
      `$${metrics.totalSales.toFixed(2)}`
    );
    this.updateElement("stats-transacciones", metrics.transactions);
    this.updateElement(
      "stats-ticket-promedio",
      `$${metrics.averageTicket.toFixed(2)}`
    );

    this.updateElement("metodo-cash-monto", `$${cashSales.toFixed(2)}`);
    this.updateElement("metodo-card-monto", `$${metrics.cardTotal.toFixed(2)}`);
    this.updateElement(
      "metodo-virtual-monto",
      `$${metrics.virtualTotal.toFixed(2)}`
    );

    this.updateElement(
      "movement-ingresos",
      `$${metrics.movementIngresos.toFixed(2)}`
    );
    this.updateElement(
      "movement-egresos",
      `$${metrics.movementEgresos.toFixed(2)}`
    );
    this.updateElement("movement-net", `$${metrics.netMovements.toFixed(2)}`);

    // ✅ Actualizar tooltip con desglose
    this.updateCashBreakdownTooltip(
      startingCash,
      cashSales,
      ingresosAdicionalesEfectivo,
      egresosEfectivo,
      efectivoFisicoTotal
    );

    this.updateMiniMetricas(
      startingCash,
      cashSales,
      ingresosAdicionalesEfectivo,
      egresosEfectivo,
      efectivoFisicoTotal
    );

    console.log("✅ Mini-métricas actualizadas");
  }

  // ✅ NUEVO: Método para actualizar tooltip con desglose
  updateCashBreakdownTooltip(
    startingCash,
    cashSales,
    ingresosAdicionales,
    egresosEfectivo,
    efectivoFisicoTotal
  ) {
    const cashBreakdownElement = document.getElementById("cash-breakdown");
    if (cashBreakdownElement) {
      cashBreakdownElement.innerHTML = `
        <small class="text-white opacity-8">
          <strong>Desglose:</strong><br>
          • Inicial: $${startingCash.toFixed(2)}<br>
          • Ventas: $${cashSales.toFixed(2)}<br>
          • Ingresos adicionales: $${ingresosAdicionales.toFixed(2)}<br>
          • Egresos: -$${egresosEfectivo.toFixed(2)}<br>
          <hr class="my-1">
          <strong>Total: $${efectivoFisicoTotal.toFixed(2)}</strong>
        </small>
      `;
    }
  }

  // ✅ MÉTODO PARA ACTUALIZAR MINI-MÉTRICAS
  updateMiniMetricas(
    startingCash,
    cashSales,
    ingresosAdicionales,
    egresosEfectivo,
    efectivoTotal
  ) {
    console.log("📊 [CashController] Actualizando mini-métricas");

    // Actualizar cada mini-métrica con formato compacto
    this.updateElement("mini-inicial", `$${this.formatCompact(startingCash)}`);
    this.updateElement("mini-ventas", `$${this.formatCompact(cashSales)}`);
    this.updateElement(
      "mini-ingresos",
      `$${this.formatCompact(ingresosAdicionales)}`
    );
    this.updateElement(
      "mini-egresos",
      `$${this.formatCompact(egresosEfectivo)}`
    );

    // Inicializar tooltips con valores exactos
    this.initTooltipsWithExactValues(
      startingCash,
      cashSales,
      ingresosAdicionales,
      egresosEfectivo
    );
  }

  // ✅ MÉTODO PARA FORMATO COMPACTO
  formatCompact(value) {
    const num = parseFloat(value) || 0;

    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    } else {
      return num.toFixed(0);
    }
  }

  // ✅ MÉTODO PARA INICIALIZAR TOOLTIPS CON VALORES EXACTOS
  initTooltipsWithExactValues(
    startingCash,
    cashSales,
    ingresosAdicionales,
    egresosEfectivo
  ) {
    // Actualizar los títulos de los tooltips con valores exactos
    this.updateTooltip(
      "mini-inicial",
      `Monto inicial de caja: $${startingCash.toFixed(2)}`
    );
    this.updateTooltip(
      "mini-ventas",
      `Ventas en efectivo: $${cashSales.toFixed(2)}`
    );
    this.updateTooltip(
      "mini-ingresos",
      `Ingresos adicionales en efectivo: $${ingresosAdicionales.toFixed(2)}`
    );
    this.updateTooltip(
      "mini-egresos",
      `Egresos en efectivo: $${egresosEfectivo.toFixed(2)}`
    );

    // Inicializar tooltips de Bootstrap
    this.initTooltips();
  }

  // ✅ MÉTODO PARA ACTUALIZAR TOOLTIP
  updateTooltip(elementId, title) {
    const element = document.getElementById(elementId);
    if (element) {
      element.setAttribute("data-bs-title", title);

      // Si ya existe un tooltip, actualizarlo
      if (element._tooltip) {
        element._tooltip.dispose();
      }
    }
  }

  // ✅ MÉTODO PARA INICIALIZAR TOOLTIPS (ya deberías tenerlo)
  initTooltips() {
    const tooltipTriggerList = document.querySelectorAll(
      '[data-bs-toggle="tooltip"]'
    );

    if (tooltipTriggerList.length > 0 && bootstrap && bootstrap.Tooltip) {
      tooltipTriggerList.forEach((tooltipTriggerEl) => {
        // Si ya existe un tooltip, destruirlo primero
        if (tooltipTriggerEl._tooltip) {
          tooltipTriggerEl._tooltip.dispose();
        }
        // Crear nuevo tooltip
        tooltipTriggerEl._tooltip = new bootstrap.Tooltip(tooltipTriggerEl, {
          trigger: "hover focus",
        });
      });
    }
  }

  async loadMovimientos() {
    try {
      const filters = {
        cash_register_id: this.cashRegisterId,
        date: document.getElementById("filtro-fecha-movimientos")?.value || "",
        type: document.getElementById("filtro-tipo-movimiento")?.value || "",
      };

      const movimientosData = await this.cashService.getMovements(filters);
      this.renderMovimientos(movimientosData);
    } catch (error) {
      console.error("❌ [CashController] Error cargando movimientos:", error);
      this.renderMovimientos([]);
    }
  }

  renderMovimientos(movimientos) {
    const tbody = document.getElementById("movimientos-table-body");
    const info = document.getElementById("movimientos-info");

    if (!tbody) return;

    if (!movimientos || movimientos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-4 text-muted">
            <i class="material-icons me-2">search_off</i>
            No se encontraron movimientos
          </td>
        </tr>
      `;
      if (info) info.textContent = "0 movimientos encontrados";
      return;
    }

    let html = "";
    movimientos.forEach((mov) => {
      // ✅ CORREGIDO: Asegurar que los datos sean correctos
      const amount = parseFloat(mov.amount) || 0;
      const esIngreso = mov.type === "ingreso";
      const categoriaText = this.getCategoriaText(mov.category);
      const metodoText = this.getMetodoPagoText(mov.payment_method);
      const date = mov.date ? new Date(mov.date) : new Date();
      const user = mov.user || mov.User || { username: "Sistema" };
      const concept = mov.concept || "";
      const observations = mov.observations || "";
      const receiptNumber = mov.receipt_number || mov.document_number || "N/A";

      html += `
        <tr class="movimiento-${esIngreso ? "ingreso" : "egreso"}">
          <td>
            <div class="d-flex flex-column">
              <span class="text-sm">${date.toLocaleDateString()}</span>
              <small class="text-muted">${date.toLocaleTimeString()}</small>
            </div>
          </td>
          <td>
            <span class="badge ${esIngreso ? "bg-success" : "bg-danger"}">
              ${esIngreso ? "INGRESO" : "EGRESO"}
            </span>
          </td>
          <td>
            <p class="text-sm font-weight-bold mb-0">${concept}</p>
            ${
              observations
                ? `<small class="text-muted">${observations}</small>`
                : ""
            }
          </td>
          <td>
            <p class="text-sm font-weight-bold mb-0 ${
              esIngreso ? "text-success" : "text-danger"
            }">
              ${esIngreso ? "+" : "-"}$${amount.toFixed(2)}
            </p>
          </td>
          <td>
            <span class="badge bg-secondary">${categoriaText}</span>
          </td>
          <td>
            <span class="badge bg-info text-dark">${metodoText}</span>
          </td>
          <td>
            <p class="text-sm text-secondary mb-0">${
              user.username || "Sistema"
            }</p>
          </td>
          <td>
            <p class="text-sm text-secondary mb-0">${receiptNumber}</p>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-info" onclick="window.cashController.verDetalleMovimiento(${
              mov.id
            })">
              <i class="material-icons" style="font-size: 16px">visibility</i>
            </button>
            <button class="btn btn-sm btn-outline-danger ms-1" onclick="window.cashController.eliminarMovimiento(${
              mov.id
            })">
              <i class="material-icons" style="font-size: 16px">delete</i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    if (info) {
      info.textContent = `${movimientos.length} movimientos encontrados`;
    }
  }

  getCategoriaText(category) {
    const categorias = {
      expense: "Gasto",
      withdrawal: "Retiro",
      deposit: "Depósito",
      adjustment: "Ajuste",
      refund: "Devolución",
      other: "Otro",
    };
    return categorias[category] || "Otro";
  }

  getMetodoPagoText(metodo) {
    const metodos = {
      cash: "Efectivo",
      card: "Tarjeta",
      virtualpay: "Virtual",
      transfer: "Transferencia",
      other: "Otro",
    };
    return metodos[metodo] || "Otro";
  }

  validateMovementData(movementData) {
    const errors = [];

    if (!movementData.type) errors.push("El tipo de movimiento es requerido");
    if (!movementData.concept?.trim()) errors.push("El concepto es requerido");
    if (!movementData.amount || movementData.amount <= 0)
      errors.push("El monto debe ser mayor a 0");
    if (movementData.amount > 1000000)
      errors.push("El monto no puede exceder $1,000,000");
    if (movementData.concept.length > 200)
      errors.push("El concepto no puede exceder 200 caracteres");
    if (!movementData.category) errors.push("La categoría es requerida");
    if (!movementData.payment_method)
      errors.push("El método de pago es requerido");

    return errors;
  }

  abrirCajaModal() {
    const modal = new bootstrap.Modal(
      document.getElementById("modal-abrir-caja")
    );
    document.getElementById("monto-inicial").value = "";
    modal.show();
  }

  async confirmarAperturaCaja() {
    const montoInput = document.getElementById("monto-inicial");
    const monto = montoInput.value;

    if (!monto || isNaN(monto) || parseFloat(monto) < 0) {
      showAlert(
        "Por favor ingrese un monto válido mayor o igual a 0",
        "warning"
      );
      montoInput.focus();
      return;
    }

    if (parseFloat(monto) > 100000) {
      showAlert("El monto inicial no puede exceder $100,000", "warning");
      return;
    }

    try {
      const btnAbrir = document.getElementById("btn-confirmar-apertura");
      const originalText = btnAbrir.innerHTML;
      btnAbrir.innerHTML =
        '<i class="material-icons me-1">hourglass_empty</i> Abriendo...';
      btnAbrir.disabled = true;

      await this.cashService.openCashRegister(parseFloat(monto));

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modal-abrir-caja")
      );
      modal.hide();

      await this.loadCashRegisterData();
      showAlert("✅ Caja abierta correctamente", "success");
    } catch (error) {
      console.error("❌ Error abriendo caja:", error);
      showAlert("Error: " + error.message, "error");

      const btnAbrir = document.getElementById("btn-confirmar-apertura");
      btnAbrir.innerHTML = originalText;
      btnAbrir.disabled = false;
    }
  }

  async cerrarCajaModal() {
    if (!this.cashRegisterId) {
      showAlert("No hay caja abierta actualmente", "warning");
      return;
    }

    const modal = new bootstrap.Modal(
      document.getElementById("modal-cerrar-caja")
    );

    try {
      const cashStatus = this.cashService.cache.cashStatus;
      const montoInicial = cashStatus
        ? parseFloat(cashStatus.startingcash) || 0
        : 0;

      // Obtener datos necesarios
      const todaySales = this.cashService.cache.todaySales || [];
      const todayMovements = this.cashService.cache.movements || [];

      // Filtrar movimientos en efectivo para cálculo preciso
      const todayMovementsCash = todayMovements.filter(
        (mov) => mov.payment_method === "cash"
      );

      // ✅ CALCULAR MÉTRICAS MANUALMENTE (CONSISTENTE CON updateEstadisticasUI)
      const ventasEfectivo = todaySales
        .filter((sale) => sale.paymentmethod === "cash")
        .reduce((total, sale) => total + (parseFloat(sale.total) || 0), 0);

      const ingresosAdicionalesEfectivo = todayMovementsCash
        .filter((mov) => mov.type === "ingreso")
        .reduce((total, mov) => total + (parseFloat(mov.amount) || 0), 0);

      const egresosEfectivo = todayMovementsCash
        .filter((mov) => mov.type === "egreso")
        .reduce((total, mov) => total + (parseFloat(mov.amount) || 0), 0);

      const netMovimientosEfectivo =
        ingresosAdicionalesEfectivo - egresosEfectivo;
      const totalEsperado =
        montoInicial + ventasEfectivo + netMovimientosEfectivo;

      this.updateElement(
        "resumen-monto-inicial",
        `$${montoInicial.toFixed(2)}`
      );
      this.updateElement(
        "resumen-ventas-efectivo",
        `$${ventasEfectivo.toFixed(2)}`
      );
      this.updateElement(
        "resumen-movimientos-neto",
        `$${netMovimientosEfectivo.toFixed(2)}`
      );
      this.updateElement(
        "resumen-total-esperado",
        `$${totalEsperado.toFixed(2)}`
      );

      const montoFinal = document.getElementById("monto-final");
      if (montoFinal) {
        montoFinal.value = totalEsperado.toFixed(2);
      }

      this.calcularDiferencia();
      modal.show();
    } catch (error) {
      console.error("❌ Error cargando datos para cerrar caja:", error);
      showAlert("Error al cargar datos para cerrar caja", "error");
    }
  }

  calcularDiferencia() {
    const montoFinal =
      parseFloat(document.getElementById("monto-final").value) || 0;

    const totalEsperadoElement = document.getElementById(
      "resumen-total-esperado"
    );
    const totalEsperadoText = totalEsperadoElement?.textContent || "$0.00";
    const totalEsperado = parseFloat(totalEsperadoText.replace("$", "")) || 0;

    const diferencia = montoFinal - totalEsperado;

    const diferenciaInput = document.getElementById("diferencia-caja");
    if (diferenciaInput) {
      diferenciaInput.value = `$${Math.abs(diferencia).toFixed(2)} (${
        diferencia >= 0 ? "Sobrante" : "Faltante"
      })`;
      diferenciaInput.className = `form-control ${
        diferencia >= 0 ? "text-success" : "text-danger"
      }`;
    }
  }

  async confirmarCierreCaja() {
    const montoFinal = document.getElementById("monto-final").value;

    if (!montoFinal || isNaN(montoFinal)) {
      showAlert("Por favor ingrese un monto final válido", "warning");
      return;
    }

    try {
      const btnCerrar = document.getElementById("btn-confirmar-cierre");
      const originalText = btnCerrar.innerHTML;
      btnCerrar.innerHTML =
        '<i class="material-icons me-1">hourglass_empty</i> Cerrando...';
      btnCerrar.disabled = true;

      await this.cashService.closeCashRegister(
        this.cashRegisterId,
        parseFloat(montoFinal)
      );

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modal-cerrar-caja")
      );
      modal.hide();

      await this.loadCashRegisterData();
      showAlert("✅ Caja cerrada correctamente", "success");
    } catch (error) {
      console.error("❌ Error cerrando caja:", error);
      showAlert("Error: " + error.message, "error");

      const btnCerrar = document.getElementById("btn-confirmar-cierre");
      btnCerrar.innerHTML = "Cerrar Caja";
      btnCerrar.disabled = false;
    }
  }

  nuevoMovimientoModal() {
    if (!this.cashRegisterId) {
      showAlert(
        "Debe haber una caja abierta para registrar movimientos",
        "warning"
      );
      return;
    }

    const modal = new bootstrap.Modal(
      document.getElementById("modal-nuevo-movimiento")
    );
    const form = document.getElementById("form-nuevo-movimiento");
    if (form) form.reset();
    modal.show();
  }

  async guardarMovimiento() {
    try {
      const movimientoData = {
        type: document.getElementById("tipo-movimiento").value,
        concept: document.getElementById("concepto-movimiento").value.trim(),
        amount: parseFloat(document.getElementById("monto-movimiento").value),
        category: document.getElementById("categoria-movimiento").value,
        payment_method: document.getElementById("metodo-pago-movimiento").value,
        receipt_number: document
          .getElementById("comprobante-movimiento")
          .value.trim(),
        observations: document
          .getElementById("observaciones-movimiento")
          .value.trim(),
        cash_register_id: this.cashRegisterId,
      };

      // Validar datos
      const errors = this.validateMovementData(movimientoData);
      if (errors.length > 0) {
        showAlert(errors.join("\n"), "warning");
        return;
      }

      // Crear movimiento
      await this.cashService.createMovement(movimientoData);
      this.cashService.clearCache();

      showAlert(
        `✅ Movimiento de ${movimientoData.type} registrado correctamente`,
        "success"
      );

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modal-nuevo-movimiento")
      );
      modal.hide();

      // ✅ ACTUALIZADO: Actualizar estadísticas y monto en caja
      await this.loadCashRegisterData();
    } catch (error) {
      console.error("❌ Error guardando movimiento:", error);
      showAlert("Error al registrar el movimiento: " + error.message, "error");
    }
  }

  async eliminarMovimiento(id) {
    if (!confirm("¿Está seguro de eliminar este movimiento?")) return;

    try {
      await this.cashService.deleteMovement(id);
      showAlert("✅ Movimiento eliminado correctamente", "success");

      // ✅ ACTUALIZADO: Actualizar estadísticas y monto en caja
      await this.loadCashRegisterData();
    } catch (error) {
      console.error("❌ Error eliminando movimiento:", error);
      showAlert("Error al eliminar el movimiento", "error");
    }
  }

  async generarReporteDiario() {
    if (!this.cashRegisterId) {
      showAlert("No hay caja abierta para generar reporte", "warning");
      return;
    }

    try {
      showAlert("📊 Generando reporte diario...", "info");

      const cashStatus = await this.cashService.getCashStatus(true);
      const todaySales = await this.cashService.getTodaySales(
        this.cashRegisterId
      );
      const todayMovements = await this.cashService.getTodayMovements(
        this.cashRegisterId
      );

      const movementTotals = await this.cashService.getMovementTotals(
        this.cashRegisterId
      );

      // ✅ CALCULAR MÉTRICAS MANUALMENTE
      const totalSales = this.calculateTotalSales(todaySales);
      const cashTotal = this.calculateCashTotal(todaySales);
      const cardTotal = this.calculateCardTotal(todaySales);
      const virtualTotal = this.calculateVirtualTotal(todaySales);
      const movementIngresos = movementTotals.ingresos || 0;
      const movementEgresos = movementTotals.egresos || 0;
      const netMovements = movementIngresos - movementEgresos;

      const reporteData = {
        fecha: new Date().toLocaleDateString("es-AR"),
        caja_id: this.cashRegisterId,
        operador: this.currentUser?.username || "Usuario",
        apertura: this.cashService.formatTime(cashStatus?.starttime),
        monto_inicial: cashStatus
          ? parseFloat(cashStatus.startingcash) || 0
          : 0,
        totalSales,
        cashTotal,
        cardTotal,
        virtualTotal,
        transactions: todaySales.length,
        averageTicket:
          todaySales.length > 0 ? totalSales / todaySales.length : 0,
        movementIngresos,
        movementEgresos,
        netMovements,
        ventas: todaySales,
        movimientos: todayMovements,
      };

      this.descargarReportePDF(reporteData);
    } catch (error) {
      console.error("❌ Error generando reporte:", error);
      showAlert("Error al generar el reporte diario", "error");
    }
  }

  descargarReportePDF(reporteData) {
    const contenido = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte Diario - Caja #${reporteData.caja_id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; background-color: #e8f4fd; }
          .ingreso { color: #28a745; }
          .egreso { color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Reporte Diario de Caja</h1>
          <p>Fecha: ${reporteData.fecha} | Caja: #${
      reporteData.caja_id
    } | Operador: ${reporteData.operador}</p>
        </div>
        
        <div class="section">
          <h3>Resumen de la Jornada</h3>
          <table>
            <tr><td>Hora Apertura:</td><td>${reporteData.apertura}</td></tr>
            <tr><td>Monto Inicial:</td><td>$${reporteData.monto_inicial.toFixed(
              2
            )}</td></tr>
            <tr><td>Total Ventas:</td><td>$${reporteData.totalSales.toFixed(
              2
            )}</td></tr>
            <tr><td>Cantidad de Ventas:</td><td>${
              reporteData.transactions
            }</td></tr>
            <tr><td>Ticket Promedio:</td><td>$${reporteData.averageTicket.toFixed(
              2
            )}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Movimientos de Caja</h3>
          <table>
            <tr><td>Ingresos por movimientos:</td><td class="ingreso">+$${reporteData.movementIngresos.toFixed(
              2
            )}</td></tr>
            <tr><td>Egresos por movimientos:</td><td class="egreso">-$${reporteData.movementEgresos.toFixed(
              2
            )}</td></tr>
            <tr class="total"><td>Neto movimientos:</td><td>$${reporteData.netMovements.toFixed(
              2
            )}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Ventas por Método de Pago</h3>
          <table>
            <tr><td>Efectivo:</td><td>$${reporteData.cashTotal.toFixed(
              2
            )}</td></tr>
            <tr><td>Tarjeta:</td><td>$${reporteData.cardTotal.toFixed(
              2
            )}</td></tr>
            <tr><td>Virtual:</td><td>$${reporteData.virtualTotal.toFixed(
              2
            )}</td></tr>
          </table>
        </div>
        
        <div class="section">
          <h3>Resumen Financiero</h3>
          <table>
            <tr>
              <td>Monto inicial:</td>
              <td>$${reporteData.monto_inicial.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Ventas en efectivo:</td>
              <td>$${reporteData.cashTotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Neto movimientos:</td>
              <td>$${reporteData.netMovements.toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Total esperado en caja:</td>
              <td>$${(
                reporteData.monto_inicial +
                reporteData.cashTotal +
                reporteData.netMovements
              ).toFixed(2)}</td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const ventana = window.open("", "_blank");
    ventana.document.write(contenido);
    ventana.document.close();

    ventana.onload = function () {
      ventana.print();
    };

    showAlert("✅ Reporte generado correctamente", "success");
  }

  mostrarTodosMovimientos() {
    const filtroFecha = document.getElementById("filtro-fecha-movimientos");
    if (filtroFecha) filtroFecha.value = "";

    const filtroTipo = document.getElementById("filtro-tipo-movimiento");
    if (filtroTipo) filtroTipo.value = "";

    this.loadMovimientos();
  }

  verDetalleMovimiento(id) {
    showAlert(`Detalle del movimiento #${id} - En desarrollo`, "info");
  }

  setupAutoRefresh() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.cashRegisterId) {
        await this.loadEstadisticas();
        await this.loadMovimientos();
        console.log("🔄 [CashController] Datos actualizados automáticamente");
      }
    }, 30000);
  }

  updateElement(selector, value) {
    const element = document.getElementById(selector);
    if (element) element.textContent = value;
  }

  showError(message) {
    console.error("❌ [CashController] Error:", message);
    showAlert(message, "error");
  }

  cleanupEventListeners() {
    this.eventListeners.forEach(({ element, eventType, handler }) => {
      element.removeEventListener(eventType, handler);
    });
    this.eventListeners = [];
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    this.cleanupEventListeners();

    this.currentUser = null;
    this.cashRegisterId = null;

    console.log(
      "🧹 [CashController] Controlador destruido y recursos limpiados"
    );
  }
}

// Exportar para que esté disponible globalmente
window.CashController = CashController;
export default CashController;
