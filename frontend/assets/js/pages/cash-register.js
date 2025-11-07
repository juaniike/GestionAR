// assets/js/cash-register.js - VERSIÓN REFACTORIZADA CON SERVICIO
class CashRegisterPage {
  constructor() {
    this.currentUser = null;
    this.cashRegisterId = null;
    this.updateInterval = null;
    this.durationInterval = null;
  }

  async init() {
    console.log(
      "🔄 [CashRegister] Inicializando página de caja registradora..."
    );

    this.currentUser = this.getUserWithToken();
    if (!this.currentUser?.token) {
      this.showError("Usuario no autenticado");
      return;
    }

    // Cargar componentes estructurales
    await this.loadComponents();

    // Configurar eventos
    this.initCashRegisterEvents();

    // Cargar datos iniciales
    await this.loadCashRegisterData();

    // Configurar actualización automática
    this.setupAutoRefresh();

    console.log("✅ [CashRegister] Página de caja registradora inicializada");
  }

  async loadComponents() {
    try {
      await Promise.all([
        this.loadComponent("sidenav-container", "./components/sidenav.html"),
        this.loadComponent("navbar-container", "./components/navbar.html"),
        this.loadComponent("footer-container", "./components/footer.html"),
      ]);
      console.log("✅ [CashRegister] Componentes cargados");
    } catch (error) {
      console.error("❌ [CashRegister] Error cargando componentes:", error);
    }
  }

  async loadComponent(id, url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      document.getElementById(id).innerHTML = html;
    } catch (error) {
      console.error(`❌ [CashRegister] Error cargando ${id}:`, error);
    }
  }

  initCashRegisterEvents() {
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

    const montoFinal = document.getElementById("monto-final");
    if (montoFinal) {
      montoFinal.addEventListener("input", () => this.calcularDiferencia());
    }

    // Filtros
    this.setupButton("btn-refresh-movimientos", () => this.loadMovimientos());
    this.setupButton("btn-ver-todos-movimientos", () =>
      this.mostrarTodosMovimientos()
    );

    const filtroFecha = document.getElementById("filtro-fecha-movimientos");
    const filtroTipo = document.getElementById("filtro-tipo-movimiento");

    if (filtroFecha)
      filtroFecha.addEventListener("change", () => this.loadMovimientos());
    if (filtroTipo)
      filtroTipo.addEventListener("change", () => this.loadMovimientos());

    console.log("✅ [CashRegister] Eventos configurados");
  }

  setupButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", handler);
    }
  }

  async loadCashRegisterData() {
    try {
      await Promise.all([
        this.loadEstadoCaja(),
        this.loadEstadisticas(),
        this.loadMovimientos(),
      ]);
    } catch (error) {
      console.error("❌ [CashRegister] Error cargando datos:", error);
      this.showError("Error de conexión con el servidor");
    }
  }

  // ✅ CARGA DE ESTADO DE CAJA (USANDO SERVICIO)
  async loadEstadoCaja() {
    this.showCajaLoading();

    try {
      // ✅ USAR SERVICIO CENTRALIZADO
      const cashStatus = await window.cashService.getCashStatus();

      if (cashStatus) {
        this.cashRegisterId = cashStatus.id;
        await this.showCajaAbierta(cashStatus);
      } else {
        this.showCajaCerrada();
      }
    } catch (error) {
      console.error("❌ [CashRegister] Error cargando estado de caja:", error);
      this.showCajaError("Error: " + error.message);
    }
  }

  async showCajaAbierta(cashData) {
    const statusCard = document.getElementById("caja-status-card");
    const statusTitle = document.getElementById("caja-status-title");
    const statusDesc = document.getElementById("caja-status-desc");
    const montoActual = document.getElementById("caja-monto-actual");
    const operador = document.getElementById("caja-operador");
    const apertura = document.getElementById("caja-apertura");
    const tiempo = document.getElementById("caja-tiempo");
    const btnAbrir = document.getElementById("btn-abrir-caja");
    const btnCerrar = document.getElementById("btn-cerrar-caja");

    if (statusCard) statusCard.className = "card caja-status-open";
    if (statusTitle) {
      statusTitle.textContent = "Caja Abierta";
      statusTitle.className = "text-success mb-1";
    }
    if (statusDesc)
      statusDesc.textContent = `Caja #${cashData.id} - Operaciones activas`;

    // ✅ USAR SERVICIO PARA CÁLCULOS
    const startingCash = parseFloat(cashData.startingcash) || 0;
    const openDuration = window.cashService.calculateOpenDuration(
      cashData.starttime
    );
    const formattedTime = window.cashService.formatTime(cashData.starttime);

    if (montoActual) {
      montoActual.textContent = `$${startingCash.toFixed(2)}`;
      montoActual.className = "text-success";
    }
    if (operador)
      operador.textContent =
        cashData.operator || this.currentUser?.username || "Usuario";
    if (apertura) apertura.textContent = formattedTime;
    if (tiempo) tiempo.textContent = openDuration;

    if (btnAbrir) btnAbrir.classList.add("d-none");
    if (btnCerrar) btnCerrar.classList.remove("d-none");

    // Iniciar actualización de tiempo en vivo
    this.startDurationTimer(cashData.starttime);

    console.log("✅ [CashRegister] Estado de caja actualizado: ABIERTA");
  }

  showCajaCerrada() {
    const statusCard = document.getElementById("caja-status-card");
    const statusTitle = document.getElementById("caja-status-title");
    const statusDesc = document.getElementById("caja-status-desc");
    const montoActual = document.getElementById("caja-monto-actual");
    const btnAbrir = document.getElementById("btn-abrir-caja");
    const btnCerrar = document.getElementById("btn-cerrar-caja");

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

    if (btnAbrir) btnAbrir.classList.remove("d-none");
    if (btnCerrar) btnCerrar.classList.add("d-none");

    this.cashRegisterId = null;

    // Limpiar intervalo de duración
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }

    console.log("✅ [CashRegister] Estado de caja actualizado: CERRADA");
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
    // Limpiar intervalo anterior
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }

    // Actualizar cada minuto
    this.durationInterval = setInterval(() => {
      if (startTime) {
        const tiempoElement = document.getElementById("caja-tiempo");
        if (tiempoElement) {
          tiempoElement.textContent =
            window.cashService.calculateOpenDuration(startTime);
        }
      }
    }, 60 * 1000);
  }

  // ✅ CARGA DE ESTADÍSTICAS (USANDO SERVICIO)
  async loadEstadisticas() {
    if (!this.cashRegisterId) return;

    try {
      // ✅ USAR SERVICIO CENTRALIZADO
      const todaySales = await window.cashService.getTodaySales(
        this.cashRegisterId
      );
      const metrics = window.cashService.calculateMetrics(
        todaySales,
        this.cashRegisterId
      );

      this.updateEstadisticasUI(metrics);
      console.log("📊 [CashRegister] Estadísticas cargadas:", metrics);
    } catch (error) {
      console.error("❌ [CashRegister] Error cargando estadísticas:", error);
    }
  }

  updateEstadisticasUI(metrics) {
    // Actualizar cards de estadísticas
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

    // Calcular efectivo total (monto inicial + ventas en efectivo)
    const cashStatus = window.cashService.cache.cashStatus;
    const startingCash = cashStatus
      ? parseFloat(cashStatus.startingcash) || 0
      : 0;
    const efectivoTotal = startingCash + metrics.cashTotal;

    this.updateElement("stats-efectivo-total", `$${efectivoTotal.toFixed(2)}`);

    // Actualizar métodos de pago
    this.updateElement("metodo-cash-monto", `$${metrics.cashTotal.toFixed(2)}`);
    this.updateElement("metodo-card-monto", `$${metrics.cardTotal.toFixed(2)}`);
    this.updateElement(
      "metodo-virtual-monto",
      `$${metrics.virtualTotal.toFixed(2)}`
    );
  }

  // ✅ CARGA DE MOVIMIENTOS (SIMULADO - MANTENER COMPATIBILIDAD)
  async loadMovimientos() {
    try {
      // Por ahora mantenemos la simulación, luego integrar con servicio real
      const movimientosData = await this.fetchMovimientosFromAPI();
      this.renderMovimientos(movimientosData);
    } catch (error) {
      console.error("❌ [CashRegister] Error cargando movimientos:", error);
    }
  }

  async fetchMovimientosFromAPI() {
    // Simular llamada a API - luego integrar con servicio real
    return [
      {
        id: 1,
        fecha: new Date().toISOString(),
        tipo: "ingreso",
        concepto: "Venta #001",
        monto: 150.0,
        usuario: this.currentUser?.username || "admin",
        comprobante: "TICKET-001",
      },
      {
        id: 2,
        fecha: new Date().toISOString(),
        tipo: "egreso",
        concepto: "Retiro de efectivo",
        monto: 50.0,
        usuario: this.currentUser?.username || "admin",
        comprobante: "RET-001",
      },
    ];
  }

  renderMovimientos(movimientos) {
    const tbody = document.getElementById("movimientos-table-body");
    const info = document.getElementById("movimientos-info");

    if (!tbody) return;

    if (movimientos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
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
      const esIngreso = mov.tipo === "ingreso";
      html += `
        <tr class="movimiento-${esIngreso ? "ingreso" : "egreso"}">
          <td>
            <div class="d-flex flex-column">
              <span class="text-sm">${new Date(
                mov.fecha
              ).toLocaleDateString()}</span>
              <small class="text-muted">${new Date(
                mov.fecha
              ).toLocaleTimeString()}</small>
            </div>
          </td>
          <td>
            <span class="badge ${esIngreso ? "bg-success" : "bg-danger"}">
              ${esIngreso ? "INGRESO" : "EGRESO"}
            </span>
          </td>
          <td>
            <p class="text-sm font-weight-bold mb-0">${mov.concepto}</p>
          </td>
          <td>
            <p class="text-sm font-weight-bold mb-0 ${
              esIngreso ? "text-success" : "text-danger"
            }">
              ${esIngreso ? "+" : "-"}$${mov.monto.toFixed(2)}
            </p>
          </td>
          <td>
            <p class="text-sm text-secondary mb-0">${mov.usuario}</p>
          </td>
          <td>
            <p class="text-sm text-secondary mb-0">${
              mov.comprobante || "N/A"
            }</p>
          </td>
          <td>
            <button class="btn btn-sm btn-outline-info" onclick="window.cashRegisterPage.verDetalleMovimiento(${
              mov.id
            })">
              <i class="material-icons" style="font-size: 16px">visibility</i>
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

  // ✅ MODALES Y ACCIONES (USANDO SERVICIO)
  abrirCajaModal() {
    const modal = new bootstrap.Modal(
      document.getElementById("modal-abrir-caja")
    );
    document.getElementById("monto-inicial").value = "";
    document.getElementById("observaciones-apertura").value = "";
    modal.show();
  }

  async confirmarAperturaCaja() {
    const monto = document.getElementById("monto-inicial").value;
    const observaciones = document.getElementById(
      "observaciones-apertura"
    ).value;

    if (!monto || isNaN(monto) || parseFloat(monto) < 0) {
      alert("Por favor ingrese un monto válido mayor o igual a 0");
      return;
    }

    try {
      // ✅ USAR SERVICIO CENTRALIZADO
      await window.cashService.openCashRegister(
        parseFloat(monto),
        observaciones
      );

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modal-abrir-caja")
      );
      modal.hide();

      alert("✅ Caja abierta correctamente");

      // Recargar datos
      await this.loadCashRegisterData();
    } catch (error) {
      console.error("❌ [CashRegister] Error abriendo caja:", error);
      alert("Error: " + error.message);
    }
  }

  cerrarCajaModal() {
    if (!this.cashRegisterId) {
      alert("No hay caja abierta actualmente");
      return;
    }

    const modal = new bootstrap.Modal(
      document.getElementById("modal-cerrar-caja")
    );

    // Calcular resumen usando datos del servicio
    const cashStatus = window.cashService.cache.cashStatus;
    const montoInicial = cashStatus
      ? parseFloat(cashStatus.startingcash) || 0
      : 0;

    // Obtener métricas actuales
    const todaySales = window.cashService.cache.todaySales;
    const metrics = window.cashService.calculateMetrics(
      todaySales,
      this.cashRegisterId
    );

    const ventasEfectivo = metrics.cashTotal;
    const totalEsperado = montoInicial + ventasEfectivo;

    this.updateElement("resumen-monto-inicial", `$${montoInicial.toFixed(2)}`);
    this.updateElement(
      "resumen-ventas-efectivo",
      `$${ventasEfectivo.toFixed(2)}`
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
  }

  calcularDiferencia() {
    const montoFinal =
      parseFloat(document.getElementById("monto-final").value) || 0;

    // Recalcular total esperado
    const cashStatus = window.cashService.cache.cashStatus;
    const montoInicial = cashStatus
      ? parseFloat(cashStatus.startingcash) || 0
      : 0;
    const todaySales = window.cashService.cache.todaySales;
    const metrics = window.cashService.calculateMetrics(
      todaySales,
      this.cashRegisterId
    );
    const ventasEfectivo = metrics.cashTotal;

    const totalEsperado = montoInicial + ventasEfectivo;
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
    const observaciones = document.getElementById("observaciones-cierre").value;

    if (!montoFinal || isNaN(montoFinal)) {
      alert("Por favor ingrese un monto final válido");
      return;
    }

    try {
      // ✅ USAR SERVICIO CENTRALIZADO
      await window.cashService.closeCashRegister(
        this.cashRegisterId,
        parseFloat(montoFinal),
        observaciones
      );

      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modal-cerrar-caja")
      );
      modal.hide();

      alert("✅ Caja cerrada correctamente");

      // Recargar datos
      await this.loadCashRegisterData();
    } catch (error) {
      console.error("❌ [CashRegister] Error cerrando caja:", error);
      alert("Error: " + error.message);
    }
  }

  // ✅ FUNCIONES ADICIONALES (MANTENER COMPATIBILIDAD)
  nuevoMovimientoModal() {
    // Implementar cuando tengas el endpoint de movimientos
    alert("🔜 Función de movimientos en desarrollo...");
  }

  generarReporteDiario() {
    // Implementar generación de reportes
    alert("🔜 Función de reportes en desarrollo...");
  }

  mostrarTodosMovimientos() {
    const filtroFecha = document.getElementById("filtro-fecha-movimientos");
    if (filtroFecha) filtroFecha.value = "";
    this.loadMovimientos();
  }

  verDetalleMovimiento(id) {
    // Implementar vista de detalle de movimiento
    alert(`Detalle del movimiento #${id} - En desarrollo`);
  }

  // ✅ CONFIGURACIÓN DE ACTUALIZACIÓN AUTOMÁTICA
  setupAutoRefresh() {
    // Actualizar cada 3 minutos
    this.updateInterval = setInterval(() => {
      this.loadCashRegisterData();
    }, 3 * 60 * 1000);
  }

  // ✅ MÉTODOS DE UTILIDAD
  updateElement(selector, value) {
    const element = document.getElementById(selector);
    if (element) element.textContent = value;
  }

  showError(message) {
    console.error("❌ [CashRegister] Error:", message);
    // Podrías mostrar un toast o alerta aquí
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

  handleTokenExpired() {
    alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    window.location.href = "/login.html";
  }

  // ✅ LIMPIEZA DE RECURSOS
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
    console.log("🧹 [CashRegister] Recursos limpiados");
  }
}

// ✅ INICIALIZACIÓN Y FUNCIONES GLOBALES
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 [CashRegister] Inicializando módulo de caja registradora...");

  window.cashRegisterPage = new CashRegisterPage();
  window.cashRegisterPage.init();
});

// ✅ MANTENER FUNCIONES GLOBALES PARA COMPATIBILIDAD
window.verDetalleMovimiento = (id) => {
  if (window.cashRegisterPage) {
    window.cashRegisterPage.verDetalleMovimiento(id);
  }
};
