// cash-register.js - VERSIÓN COMPLETA PARA PÁGINA DEDICADA
let cajaActual = null;
let movimientos = [];
let estadisticas = {};
let currentUser = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Inicializando módulo de caja registradora...");
  initCashRegister();
});

async function initCashRegister() {
  await loadComponents();
  initCashRegisterEvents();
  await loadCashRegisterData();
}

async function loadComponents() {
  try {
    await Promise.all([
      loadComponent("sidenav-container", "./components/sidenav.html"),
      loadComponent("navbar-container", "./components/navbar.html"),
      loadComponent("footer-container", "./components/footer.html"),
    ]);
    console.log("✅ Componentes cargados");
  } catch (error) {
    console.error("❌ Error cargando componentes:", error);
  }
}

async function loadComponent(id, url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    document.getElementById(id).innerHTML = html;
  } catch (error) {
    console.error(`❌ Error cargando ${id}:`, error);
  }
}

function initCashRegisterEvents() {
  // Botones principales
  document
    .getElementById("btn-abrir-caja")
    ?.addEventListener("click", abrirCajaModal);
  document
    .getElementById("btn-cerrar-caja")
    ?.addEventListener("click", cerrarCajaModal);
  document
    .getElementById("btn-movimiento")
    ?.addEventListener("click", nuevoMovimientoModal);
  document
    .getElementById("btn-reporte-caja")
    ?.addEventListener("click", generarReporteDiario);

  // Modal abrir caja
  document
    .getElementById("btn-confirmar-apertura")
    ?.addEventListener("click", confirmarAperturaCaja);

  // Modal cerrar caja
  document
    .getElementById("btn-confirmar-cierre")
    ?.addEventListener("click", confirmarCierreCaja);
  document
    .getElementById("monto-final")
    ?.addEventListener("input", calcularDiferencia);

  // Modal movimiento
  document
    .getElementById("btn-guardar-movimiento")
    ?.addEventListener("click", guardarMovimiento);

  // Filtros
  document
    .getElementById("btn-refresh-movimientos")
    ?.addEventListener("click", loadMovimientos);
  document
    .getElementById("filtro-fecha-movimientos")
    ?.addEventListener("change", loadMovimientos);
  document
    .getElementById("filtro-tipo-movimiento")
    ?.addEventListener("change", loadMovimientos);

  document
    .getElementById("btn-ver-todos-movimientos")
    ?.addEventListener("click", () => {
      document.getElementById("filtro-fecha-movimientos").value = "";
      loadMovimientos();
    });

  console.log("✅ Eventos de caja registradora inicializados");
}

async function loadCashRegisterData() {
  try {
    const user = getUserWithToken();
    if (!user?.token) {
      showError("Usuario no autenticado");
      return;
    }

    currentUser = user;

    // Cargar estado de caja
    await checkEstadoCaja();

    // Cargar movimientos
    await loadMovimientos();

    // Cargar estadísticas
    await loadEstadisticas();
  } catch (error) {
    console.error("❌ Error cargando datos de caja:", error);
    showError("Error de conexión con el servidor");
  }
}

// ✅ FUNCIÓN PARA OBTENER USUARIO
function getUserWithToken() {
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

// ✅ VERIFICAR ESTADO DE CAJA (VERSIÓN COMPLETA)
async function checkEstadoCaja() {
  showCajaLoading();

  try {
    const response = await fetch("http://localhost:3000/cash-register/status", {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      handleTokenExpired();
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    if (data && data.id) {
      cajaActual = data;
      showCajaAbierta(data);
    } else {
      showCajaCerrada();
    }
  } catch (error) {
    console.error("❌ Error verificando caja:", error);
    showCajaError("Error: " + error.message);
  }
}

function showCajaLoading() {
  const statusCard = document.getElementById("caja-status-card");
  const statusTitle = document.getElementById("caja-status-title");
  const statusDesc = document.getElementById("caja-status-desc");

  if (statusCard) statusCard.className = "card caja-status-closed";
  if (statusTitle) statusTitle.textContent = "Cargando...";
  if (statusDesc) statusDesc.textContent = "Verificando estado de caja...";
}

function showCajaAbierta(data) {
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
    statusDesc.textContent = `Caja #${data.id} - Operaciones activas`;
  if (montoActual) {
    montoActual.textContent = `$${(data.startingcash || 0).toFixed(2)}`;
    montoActual.className = "text-success";
  }
  if (operador) operador.textContent = currentUser?.username || "Usuario";
  if (apertura) apertura.textContent = formatTime(data.starttime);
  if (tiempo) tiempo.textContent = calcularTiempoActiva(data.starttime);

  if (btnAbrir) btnAbrir.classList.add("d-none");
  if (btnCerrar) btnCerrar.classList.remove("d-none");

  console.log("✅ Estado de caja actualizado: ABIERTA");
}

function showCajaCerrada() {
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

  cajaActual = null;
  console.log("✅ Estado de caja actualizado: CERRADA");
}

function showCajaError(message) {
  const statusTitle = document.getElementById("caja-status-title");
  const statusDesc = document.getElementById("caja-status-desc");

  if (statusTitle) {
    statusTitle.textContent = "Error";
    statusTitle.className = "text-warning mb-1";
  }
  if (statusDesc) statusDesc.textContent = message;
}

// ✅ FUNCIONES DE UTILIDAD
function formatTime(dateStr) {
  try {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    return isNaN(date.getTime())
      ? "--"
      : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return "--";
  }
}

function calcularTiempoActiva(startTime) {
  try {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHrs}h ${diffMins}m`;
  } catch (error) {
    return "0h 0m";
  }
}

// ✅ MODAL ABRIR CAJA
function abrirCajaModal() {
  const modal = new bootstrap.Modal(
    document.getElementById("modal-abrir-caja")
  );
  document.getElementById("monto-inicial").value = "";
  document.getElementById("observaciones-apertura").value = "";
  modal.show();
}

async function confirmarAperturaCaja() {
  const monto = document.getElementById("monto-inicial").value;
  const observaciones = document.getElementById("observaciones-apertura").value;

  if (!monto || isNaN(monto) || parseFloat(monto) < 0) {
    alert("Por favor ingrese un monto válido mayor o igual a 0");
    return;
  }

  try {
    const response = await fetch("http://localhost:3000/cash-register/open", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentUser.token}`,
      },
      body: JSON.stringify({
        startingcash: parseFloat(monto),
        observations: observaciones,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modal-abrir-caja")
    );
    modal.hide();

    alert("✅ Caja abierta correctamente");
    await loadCashRegisterData();
  } catch (error) {
    console.error("❌ Error abriendo caja:", error);
    alert("Error: " + error.message);
  }
}

// ✅ MODAL CERRAR CAJA
function cerrarCajaModal() {
  if (!cajaActual) {
    alert("No hay caja abierta actualmente");
    return;
  }

  const modal = new bootstrap.Modal(
    document.getElementById("modal-cerrar-caja")
  );

  // Calcular resumen
  const montoInicial = cajaActual.startingcash || 0;
  const ventasEfectivo = estadisticas.efectivoTotal || 0;
  const totalEsperado = montoInicial + ventasEfectivo;

  document.getElementById(
    "resumen-monto-inicial"
  ).textContent = `$${montoInicial.toFixed(2)}`;
  document.getElementById(
    "resumen-ventas-efectivo"
  ).textContent = `$${ventasEfectivo.toFixed(2)}`;
  document.getElementById(
    "resumen-total-esperado"
  ).textContent = `$${totalEsperado.toFixed(2)}`;
  document.getElementById("monto-final").value = totalEsperado.toFixed(2);

  calcularDiferencia();

  modal.show();
}

function calcularDiferencia() {
  const montoFinal =
    parseFloat(document.getElementById("monto-final").value) || 0;
  const montoInicial = cajaActual?.startingcash || 0;
  const ventasEfectivo = estadisticas.efectivoTotal || 0;
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

async function confirmarCierreCaja() {
  const montoFinal = document.getElementById("monto-final").value;
  const observaciones = document.getElementById("observaciones-cierre").value;

  if (!montoFinal || isNaN(montoFinal)) {
    alert("Por favor ingrese un monto final válido");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/cash-register/${cajaActual.id}/close`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser.token}`,
        },
        body: JSON.stringify({
          endingcash: parseFloat(montoFinal),
          observations: observaciones,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error ${response.status}`);
    }

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modal-cerrar-caja")
    );
    modal.hide();

    alert("✅ Caja cerrada correctamente");
    await loadCashRegisterData();
  } catch (error) {
    console.error("❌ Error cerrando caja:", error);
    alert("Error: " + error.message);
  }
}

// ✅ CARGAR ESTADÍSTICAS
async function loadEstadisticas() {
  if (!cajaActual) return;

  try {
    const today = new Date().toISOString().split("T")[0];
    const response = await fetch(`http://localhost:3000/sales?date=${today}`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`,
      },
    });

    if (response.ok) {
      const ventas = await response.json();

      let totalVentas = 0;
      let transacciones = 0;
      let efectivoTotal = 0;
      let tarjetaTotal = 0;
      let virtualTotal = 0;

      ventas.forEach((venta) => {
        if (venta.cashregisterid === cajaActual.id) {
          totalVentas += parseFloat(venta.totalamount) || 0;
          transacciones++;

          if (
            venta.paymentmethod === "cash" ||
            venta.paymentmethod === "efectivo"
          ) {
            efectivoTotal += parseFloat(venta.totalamount) || 0;
          } else if (
            venta.paymentmethod === "card" ||
            venta.paymentmethod === "tarjeta"
          ) {
            tarjetaTotal += parseFloat(venta.totalamount) || 0;
          } else {
            virtualTotal += parseFloat(venta.totalamount) || 0;
          }
        }
      });

      estadisticas = {
        totalVentas,
        transacciones,
        efectivoTotal,
        tarjetaTotal,
        virtualTotal,
        ticketPromedio: transacciones > 0 ? totalVentas / transacciones : 0,
      };

      updateEstadisticasUI();
    }
  } catch (error) {
    console.error("❌ Error cargando estadísticas:", error);
  }
}

function updateEstadisticasUI() {
  // Actualizar cards de estadísticas
  document.getElementById("stats-ventas-count").textContent =
    estadisticas.transacciones;
  document.getElementById(
    "stats-ventas-total"
  ).textContent = `$${estadisticas.totalVentas.toFixed(2)}`;
  document.getElementById("stats-transacciones").textContent =
    estadisticas.transacciones;
  document.getElementById(
    "stats-ticket-promedio"
  ).textContent = `$${estadisticas.ticketPromedio.toFixed(2)}`;

  // Calcular efectivo total
  const efectivoTotal =
    (cajaActual?.startingcash || 0) + estadisticas.efectivoTotal;
  document.getElementById(
    "stats-efectivo-total"
  ).textContent = `$${efectivoTotal.toFixed(2)}`;

  // Actualizar métodos de pago
  document.getElementById(
    "metodo-cash-monto"
  ).textContent = `$${estadisticas.efectivoTotal.toFixed(2)}`;
  document.getElementById(
    "metodo-card-monto"
  ).textContent = `$${estadisticas.tarjetaTotal.toFixed(2)}`;
  document.getElementById(
    "metodo-virtual-monto"
  ).textContent = `$${estadisticas.virtualTotal.toFixed(2)}`;
}

// ✅ CARGAR MOVIMIENTOS
async function loadMovimientos() {
  try {
    // Aquí implementarías la carga de movimientos desde tu API
    // Por ahora simulamos datos
    const movimientosData = await fetchMovimientosFromAPI();
    movimientos = movimientosData;
    renderMovimientos();
  } catch (error) {
    console.error("❌ Error cargando movimientos:", error);
  }
}

// Función simulada - reemplazar con tu API real
async function fetchMovimientosFromAPI() {
  // Simular llamada a API
  return [
    {
      id: 1,
      fecha: new Date().toISOString(),
      tipo: "ingreso",
      concepto: "Venta #001",
      monto: 150.0,
      usuario: "admin",
      comprobante: "TICKET-001",
    },
    {
      id: 2,
      fecha: new Date().toISOString(),
      tipo: "egreso",
      concepto: "Retiro de efectivo",
      monto: 50.0,
      usuario: "admin",
      comprobante: "RET-001",
    },
  ];
}

function renderMovimientos() {
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
          <p class="text-sm text-secondary mb-0">${mov.comprobante || "N/A"}</p>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-info" onclick="verDetalleMovimiento(${
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

function handleTokenExpired() {
  alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
  localStorage.removeItem("user");
  sessionStorage.removeItem("user");
  window.location.href = "/login.html";
}

// ✅ HACER FUNCIONES GLOBALES
window.verDetalleMovimiento = (id) => {
  const movimiento = movimientos.find((m) => m.id === id);
  if (movimiento) {
    alert(
      `Detalle del movimiento:\nConcepto: ${movimiento.concepto}\nMonto: $${movimiento.monto}\nTipo: ${movimiento.tipo}`
    );
  }
};

// Las funciones de modal movimiento y reporte las implementarías similarmente
