// cash-card.js - VERSIÓN CORREGIDA (solo estado de caja)
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

  if (!cashAmount || !cashStart || !cashStatus || !btnCashAction) {
    console.error("❌ Elementos de la cash card no encontrados");
    return;
  }

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
  }

  function showError(message = "Error al obtener el estado") {
    cashAmount.textContent = "$0.00";
    cashStart.textContent = message;
    cashStatus.innerHTML = `<span class="badge bg-danger">Error</span>`;
    btnCashAction.textContent = "Reintentar";
    btnCashAction.disabled = false;
    btnCashAction.onclick = checkCaja;

    if (btnCashClose) {
      btnCashClose.classList.add("d-none");
      btnCashClose.disabled = true;
    }

    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.className = "progress-bar bg-danger";
    }
  }

  function showSuccessState(data) {
    console.log("🎯 Caja abierta - Mostrando estado");

    openCaja = data;
    const startingCash = parseFloat(data.startingcash) || 0;

    cashAmount.textContent = `$${startingCash.toFixed(2)}`;
    cashStart.textContent = `Iniciada: ${formatTime(data.starttime)}`;
    cashStatus.innerHTML = `<span class="badge bg-success">Abierta</span>`;

    // ✅ SOLO CAMBIAR APARIENCIA, NO ASIGNAR EVENTOS
    btnCashAction.textContent = "Registrar Venta";
    btnCashAction.className = "btn btn-success btn-sm flex-grow-1";
    btnCashAction.disabled = false;

    console.log("✅ Estado de caja actualizado a 'Abierta'");

    if (btnCashClose) {
      btnCashClose.classList.remove("d-none");
      btnCashClose.disabled = false;
    }

    if (progressBar) {
      progressBar.style.width = "65%";
      progressBar.className = "progress-bar bg-success";
    }
  }

  function showClosedState() {
    console.log("🎯 Caja cerrada - Mostrando estado");

    openCaja = null;
    cashAmount.textContent = "$0.00";
    cashStart.textContent = "Caja cerrada";
    cashStatus.innerHTML = `<span class="badge bg-danger">Cerrada</span>`;

    // ✅ SOLO CAMBIAR APARIENCIA, NO ASIGNAR EVENTOS
    btnCashAction.textContent = "Abrir Caja";
    btnCashAction.className = "btn btn-success btn-sm flex-grow-1";
    btnCashAction.disabled = false;

    if (btnCashClose) {
      btnCashClose.classList.add("d-none");
      btnCashClose.disabled = true;
    }

    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.className = "progress-bar bg-info";
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
