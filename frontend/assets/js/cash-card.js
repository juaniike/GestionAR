// cash-card.js - VERSIÓN CORREGIDA
let isInitialized = false;
let openCaja = null;

export async function initCashCard(user) {
  if (isInitialized) return;
  isInitialized = true;

  await new Promise((resolve) => setTimeout(resolve, 100));

  const cashAmount = document.getElementById("cash-amount");
  const cashStart = document.getElementById("cash-start");
  const cashStatus = document.getElementById("cash-status");
  const btnCashAction = document.getElementById("btn-cash-action");
  const btnCashClose = document.getElementById("btn-cash-close");
  const progressBar = document.getElementById("cash-progress-bar");
  const cashCard = document.querySelector(".card-summary.info");

  if (!cashAmount || !cashStart || !cashStatus || !btnCashAction || !cashCard) {
    console.error("❌ Elementos de la cash card no encontrados");
    return;
  }

  console.log("🎯 Cash Card inicializada");

  // ✅ CONTROLADOR ÚNICO DE EVENTOS
  function manejarClickBoton() {
    const textoBoton = btnCashAction.textContent.trim();
    console.log("🎯 Click en botón:", textoBoton);

    if (textoBoton.includes("Abrir Caja")) {
      abrirCaja();
    } else if (textoBoton.includes("Registrar Venta")) {
      abrirFormularioVenta();
    } else if (textoBoton.includes("Reintentar")) {
      checkCaja();
    }
  }

  // ✅ ASIGNAR EVENTO AL BOTÓN PRINCIPAL
  btnCashAction.addEventListener("click", manejarClickBoton);
  console.log("✅ Evento asignado al botón principal");

  function formatTime(dateStr) {
    try {
      if (!dateStr) return "Hora no disponible";
      const date = new Date(dateStr);
      return isNaN(date.getTime())
        ? "Fecha inválida"
        : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
      return "Error en fecha";
    }
  }

  function showLoading(message = "Cargando estado de la caja...") {
    cashAmount.textContent = "—";
    cashStart.textContent = message;
    cashStatus.textContent = " ";
    btnCashAction.disabled = true;
    if (btnCashClose) btnCashClose.disabled = true;

    // Actualizar clases de estado
    cashCard.classList.remove(
      "cash-status-open",
      "cash-status-closed",
      "cash-status-error"
    );
  }

  function showError(message = "Error al obtener el estado") {
    cashAmount.textContent = "$0.00";
    cashStart.textContent = message;
    cashStatus.innerHTML = `<span class="badge bg-danger">Error</span>`;
    btnCashAction.textContent = "Reintentar";
    btnCashAction.disabled = false;

    // Actualizar clases de estado
    cashCard.classList.remove("cash-status-open", "cash-status-closed");
    cashCard.classList.add("cash-status-error");

    if (btnCashClose) {
      btnCashClose.classList.add("d-none");
      btnCashClose.disabled = true;
    }

    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.className = "progress-bar bg-danger cash-progress";
    }
  }

  function showSuccessState(data) {
    console.log("✅ Caja ABIERTA - Configurando interfaz");

    openCaja = data;
    const startingCash = parseFloat(data.startingcash) || 0;

    cashAmount.textContent = `$${startingCash.toFixed(2)}`;
    cashStart.textContent = `Iniciada: ${formatTime(data.starttime)}`;
    cashStatus.innerHTML = `<span class="badge bg-success">Abierta</span>`;

    // Actualizar clases de estado
    cashCard.classList.remove("cash-status-closed", "cash-status-error");
    cashCard.classList.add("cash-status-open");

    // BOTÓN PARA REGISTRAR VENTA
    btnCashAction.textContent = "Registrar Venta";
    btnCashAction.className =
      "btn btn-success btn-sm flex-grow-1 cash-action-btn";
    btnCashAction.disabled = false;

    if (btnCashClose) {
      btnCashClose.classList.remove("d-none");
      btnCashClose.disabled = false;
      btnCashClose.onclick = cerrarCaja;
    }

    if (progressBar) {
      progressBar.style.width = "65%";
      progressBar.className = "progress-bar bg-success cash-progress";
    }
  }

  function showClosedState() {
    console.log("🔒 Caja CERRADA - Configurando interfaz");

    openCaja = null;
    cashAmount.textContent = "$0.00";
    cashStart.textContent = "Caja cerrada";
    cashStatus.innerHTML = `<span class="badge bg-danger">Cerrada</span>`;

    // Actualizar clases de estado
    cashCard.classList.remove("cash-status-open", "cash-status-error");
    cashCard.classList.add("cash-status-closed");

    // BOTÓN PARA ABRIR CAJA
    btnCashAction.textContent = "Abrir Caja";
    btnCashAction.className =
      "btn btn-success btn-sm flex-grow-1 cash-action-btn";
    btnCashAction.disabled = false;

    if (btnCashClose) {
      btnCashClose.classList.add("d-none");
      btnCashClose.disabled = true;
    }

    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.className = "progress-bar bg-info cash-progress";
    }
  }

  // ✅ FUNCIÓN PARA ABRIR CAJA
  async function abrirCaja() {
    console.log("🔄 Abriendo caja...");

    const monto = prompt("Ingrese monto inicial de la caja:");
    if (!monto || isNaN(monto) || parseFloat(monto) < 0) {
      alert("Por favor ingrese un monto válido mayor o igual a 0");
      return;
    }

    btnCashAction.disabled = true;

    try {
      const res = await fetch("http://localhost:3000/cash-register/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ startingcash: parseFloat(monto) }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || `Error ${res.status} al abrir caja`
        );
      }

      await res.json();
      alert("✅ Caja abierta correctamente");
      await checkCaja();
    } catch (err) {
      alert("❌ " + (err.message || "Error al abrir la caja"));
      btnCashAction.disabled = false;
    }
  }

  // ✅ FUNCIÓN PARA CERRAR CAJA
  async function cerrarCaja() {
    console.log("🔄 Cerrando caja...");

    if (!openCaja) {
      alert("No hay caja abierta actualmente");
      return;
    }

    const monto = prompt("Ingrese monto final de la caja:");
    if (!monto || isNaN(monto)) {
      alert("Por favor ingrese un monto válido");
      return;
    }

    if (btnCashClose) btnCashClose.disabled = true;

    try {
      const res = await fetch(
        `http://localhost:3000/cash-register/${openCaja.id}/close`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ endingcash: parseFloat(monto) }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || `Error ${res.status} al cerrar caja`
        );
      }

      await res.json();
      alert("✅ Caja cerrada correctamente");
      await checkCaja();
    } catch (err) {
      alert("❌ " + (err.message || "Error al cerrar la caja"));
    } finally {
      if (btnCashClose) btnCashClose.disabled = false;
    }
  }

  // En cash-card.js - mantener esta función igual
  function abrirFormularioVenta() {
    console.log("📋 Abriendo formulario de venta...");

    if (!cashStatus.textContent.includes("Abierta")) {
      alert("La caja está cerrada. Ábrala antes de registrar una venta.");
      return;
    }

    // ✅ LLAMAR FUNCIÓN GLOBAL
    if (typeof window.mostrarFormularioVentas === "function") {
      window.mostrarFormularioVentas();
    } else {
      console.error("❌ Función de formulario de ventas no disponible");
      alert(
        "Error: El formulario de ventas no está cargado. Recarga la página."
      );
    }
  }

  async function checkCaja() {
    showLoading();

    try {
      if (!user || !user.token) {
        throw new Error("No hay token de autenticación disponible");
      }

      const res = await fetch("http://localhost:3000/cash-register/status", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        let errorMessage = `Error ${res.status}`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      if (data && data.id) {
        showSuccessState(data);
      } else {
        showClosedState();
      }
    } catch (err) {
      if (err.message.includes("401") || err.message.includes("token")) {
        handleTokenExpired();
      } else {
        showError("Error: " + err.message);
      }
    }
  }

  function handleTokenExpired() {
    alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    window.location.href = "/login.html";
  }

  if (!user || !user.token) {
    showError("No autenticado. Inicia sesión.");
    return;
  }

  await checkCaja();
}

// En cash-card.js - agregar esta función
export async function recargarEstadoCaja() {
  if (typeof checkCaja === "function") {
    await checkCaja();
  }
}

// Hacer disponible globalmente
window.recargarEstadoCaja = recargarEstadoCaja;
