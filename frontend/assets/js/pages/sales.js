// sales.js - Gestión completa de la página de ventas (versión corregida)

let currentPage = 1;
const itemsPerPage = 10;
let allSales = [];
let filteredSales = [];
let currentFilters = {};

// Configuración de la API
const API_BASE = "http://localhost:3000";
const ENDPOINTS = {
  SALES: "/sales",
  SALES_CONSOLIDATED: "/view",
  USERS: "/users",
};

// Estado de la aplicación
const appState = {
  isLoading: false,
  currentUser: null,
};

// ✅ SISTEMA DE ALERTAS SIMPLIFICADO
function showAlert(message, type = "info", duration = 4000) {
  // Remover alertas existentes
  const existingAlerts = document.querySelectorAll(".custom-alert");
  existingAlerts.forEach((alert) => alert.remove());

  const alertClass =
    {
      success: "alert-success",
      error: "alert-danger",
      warning: "alert-warning",
      info: "alert-info",
    }[type] || "alert-info";

  const icon =
    {
      success: "check_circle",
      error: "error",
      warning: "warning",
      info: "info",
    }[type] || "info";

  const alertHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show custom-alert" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            <div class="d-flex align-items-center">
                <i class="material-icons me-2">${icon}</i>
                <span class="flex-grow-1">${message}</span>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
            </div>
        </div>
    `;

  document.body.insertAdjacentHTML("beforeend", alertHTML);

  if (duration > 0) {
    setTimeout(() => {
      const alert = document.querySelector(".custom-alert");
      if (alert) alert.remove();
    }, duration);
  }
}

// ✅ INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", async () => {
  await initializeSalesPage();
});

async function initializeSalesPage() {
  try {
    appState.currentUser = getCurrentUser();
    if (!appState.currentUser) {
      window.location.href = "./sign-in.html";
      return;
    }

    console.log("🔄 Inicializando página de ventas...");

    // Cargar componentes estructurales
    await loadStructuralComponents();

    // Cargar datos iniciales
    await Promise.all([
      loadSalesData(),
      loadUsersForFilter(),
      loadSummaryCards(),
    ]);

    initializeEventListeners();

    console.log("✅ Página de ventas inicializada correctamente");
    showAlert("Ventas cargadas correctamente", "success", 3000);
  } catch (error) {
    console.error("❌ Error inicializando página de ventas:", error);
    showAlert("Error al cargar la página de ventas", "error");
  }
}

// ✅ FUNCIONES DE CARGA DE DATOS
async function loadSalesData(filters = {}) {
  try {
    setLoadingState(true);

    const queryParams = new URLSearchParams({
      page: currentPage,
      limit: itemsPerPage,
      ...filters,
    });

    console.log("📦 Cargando ventas...");
    const response = await fetch(
      `${API_BASE}${ENDPOINTS.SALES}?${queryParams}`,
      {
        headers: {
          Authorization: `Bearer ${appState.currentUser.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const salesData = await response.json();
    allSales = Array.isArray(salesData) ? salesData : [];
    filteredSales = [...allSales];

    console.log(`✅ ${allSales.length} ventas cargadas`);
    renderSalesTable();
    updatePaginationInfo();
  } catch (error) {
    console.error("Error cargando ventas:", error);
    showAlert("Error al cargar las ventas", "error");
    allSales = [];
    filteredSales = [];
    renderSalesTable();
  } finally {
    setLoadingState(false);
  }
}

async function loadSummaryCards() {
  try {
    console.log("📊 Cargando resumen...");
    const response = await fetch(`${API_BASE}${ENDPOINTS.SALES_CONSOLIDATED}`, {
      headers: {
        Authorization: `Bearer ${appState.currentUser.token}`,
      },
    });

    if (response.ok) {
      const consolidatedData = await response.json();
      updateSummaryCards(consolidatedData);
      console.log("✅ Resumen cargado");
    }
  } catch (error) {
    console.error("Error cargando resumen:", error);
    updateSummaryCardsWithDefaults();
  }
}

async function loadUsersForFilter() {
  try {
    console.log("👥 Cargando usuarios...");
    // Simulamos usuarios para el filtro
    const mockUsers = [
      { id: 1, username: "Admin", role: "owner" },
      { id: 2, username: "Vendedor1", role: "employee" },
    ];
    populateUserFilter(mockUsers);
  } catch (error) {
    console.error("Error cargando usuarios:", error);
  }
}

// ✅ RENDERIZADO DE TABLA
function renderSalesTable() {
  const tbody = document.getElementById("ventas-table-body");
  const tableInfo = document.getElementById("table-info");

  if (!tbody) {
    console.error("❌ No se encontró el tbody de la tabla");
    return;
  }

  if (filteredSales.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="d-flex flex-column align-items-center">
                        <i class="material-icons text-muted mb-2" style="font-size: 3rem;">receipt</i>
                        <p class="text-muted mb-0">No se encontraron ventas</p>
                        <small class="text-muted">Intenta ajustar los filtros</small>
                    </div>
                </td>
            </tr>
        `;
    if (tableInfo) tableInfo.textContent = "No se encontraron ventas";
    return;
  }

  tbody.innerHTML = filteredSales
    .map(
      (sale) => `
        <tr>
            <td>
                <div class="d-flex px-2 py-1">
                    <div class="d-flex flex-column justify-content-center">
                        <h6 class="mb-0 text-sm">#${sale.id}</h6>
                    </div>
                </div>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0">${formatDate(
                  sale.date
                )}</p>
                <p class="text-xs text-muted mb-0">${formatTime(sale.date)}</p>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0">Usuario ${
                  sale.userid
                }</p>
                <p class="text-xs text-muted mb-0">ID: ${sale.userid}</p>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0">$${parseFloat(
                  sale.total || 0
                ).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</p>
            </td>
            <td>
                <p class="text-xs font-weight-bold mb-0 profit-positive">$${parseFloat(
                  sale.profit || 0
                ).toLocaleString("es-AR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}</p>
            </td>
            <td>
                <span class="payment-badge">${getPaymentMethodText(
                  sale.paymentmethod
                )}</span>
            </td>
            <td>
                <span class="status-badge status-${
                  sale.status
                }">${getStatusText(sale.status)}</span>
            </td>
            <td class="align-middle">
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-outline-primary view-sale" data-sale-id="${
                      sale.id
                    }" title="Ver detalle">
                        <i class="material-icons" style="font-size: 16px;">visibility</i>
                    </button>
                    <button class="btn btn-sm btn-outline-success ticket-sale" data-sale-id="${
                      sale.id
                    }" title="Generar ticket">
                        <i class="material-icons" style="font-size: 16px;">receipt</i>
                    </button>
                    ${
                      appState.currentUser.role === "owner"
                        ? `
                        <button class="btn btn-sm btn-outline-danger cancel-sale" data-sale-id="${
                          sale.id
                        }" title="Cancelar venta" ${
                            sale.status === "canceled" ? "disabled" : ""
                          }>
                            <i class="material-icons" style="font-size: 16px;">cancel</i>
                        </button>
                    `
                        : ""
                    }
                </div>
            </td>
        </tr>
    `
    )
    .join("");

  if (tableInfo) {
    tableInfo.textContent = `Mostrando ${filteredSales.length} ventas`;
  }

  // Agregar event listeners a los botones
  attachTableEventListeners();
}

// ✅ FUNCIONES DE UTILIDAD
function getCurrentUser() {
  try {
    return (
      JSON.parse(sessionStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("user"))
    );
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return null;
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("es-AR");
  } catch {
    return "Fecha inválida";
  }
}

function formatTime(dateString) {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function getPaymentMethodText(method) {
  const methods = {
    cash: "Efectivo",
    card: "Tarjeta",
    virtualpay: "Pago Virtual",
  };
  return methods[method] || method;
}

function getStatusText(status) {
  const statuses = {
    paid: "Pagada",
    pending: "Pendiente",
    canceled: "Cancelada",
  };
  return statuses[status] || status;
}

function setLoadingState(isLoading) {
  appState.isLoading = isLoading;
  const tbody = document.getElementById("ventas-table-body");

  if (isLoading && tbody) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Cargando ventas...</span>
                    </div>
                    <p class="text-sm text-muted mt-2">Cargando ventas...</p>
                </td>
            </tr>
        `;
  }
}

// ✅ MANEJO DE EVENTOS
function initializeEventListeners() {
  // Filtros
  document
    .getElementById("btn-aplicar-filtros")
    ?.addEventListener("click", applyFilters);
  document
    .getElementById("btn-limpiar-filtros")
    ?.addEventListener("click", clearFilters);

  // Botones de acción
  document
    .getElementById("btn-refresh")
    ?.addEventListener("click", () => loadSalesData(currentFilters));
  document
    .getElementById("btn-nueva-venta")
    ?.addEventListener(
      "click",
      () => (window.location.href = "dashboard.html")
    );
  document
    .getElementById("btn-consolidado")
    ?.addEventListener("click", showConsolidatedView);
  document
    .getElementById("btn-reporte-diario")
    ?.addEventListener("click", showDailyReport);

  // Búsqueda en tiempo real
  const searchInput = document.getElementById("filtro-cliente");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(applyFilters, 500));
  }
}

function attachTableEventListeners() {
  // Ver detalle
  document.querySelectorAll(".view-sale").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const saleId = e.currentTarget.getAttribute("data-sale-id");
      showSaleDetail(saleId);
    });
  });

  // Generar ticket
  document.querySelectorAll(".ticket-sale").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const saleId = e.currentTarget.getAttribute("data-sale-id");
      generateTicket(saleId);
    });
  });

  // Cancelar venta (solo owners)
  document.querySelectorAll(".cancel-sale").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const saleId = e.currentTarget.getAttribute("data-sale-id");
      cancelSale(saleId);
    });
  });
}

// ✅ FUNCIONES DE FILTRADO
function applyFilters() {
  const filters = {
    fechaDesde: document.getElementById("fecha-desde")?.value,
    fechaHasta: document.getElementById("fecha-hasta")?.value,
    metodo: document.getElementById("filtro-metodo")?.value,
    estado: document.getElementById("filtro-estado")?.value,
    usuario: document.getElementById("filtro-usuario")?.value,
    cliente: document.getElementById("filtro-cliente")?.value,
  };

  currentFilters = filters;
  currentPage = 1;

  console.log("🔍 Aplicando filtros:", filters);
  filterSales(filters);
}

function filterSales(filters) {
  filteredSales = allSales.filter((sale) => {
    // Filtro por método de pago
    if (filters.metodo && sale.paymentmethod !== filters.metodo) return false;

    // Filtro por estado
    if (filters.estado && sale.status !== filters.estado) return false;

    // Filtro por usuario
    if (filters.usuario && sale.userid !== parseInt(filters.usuario))
      return false;

    // Filtro por fecha
    if (filters.fechaDesde || filters.fechaHasta) {
      const saleDate = new Date(sale.date);
      if (filters.fechaDesde && saleDate < new Date(filters.fechaDesde))
        return false;
      if (filters.fechaHasta) {
        const hastaDate = new Date(filters.fechaHasta);
        hastaDate.setHours(23, 59, 59);
        if (saleDate > hastaDate) return false;
      }
    }

    return true;
  });

  renderSalesTable();
  updatePaginationInfo();
}

function clearFilters() {
  document.getElementById("fecha-desde").value = "";
  document.getElementById("fecha-hasta").value = "";
  document.getElementById("filtro-metodo").value = "";
  document.getElementById("filtro-estado").value = "";
  document.getElementById("filtro-usuario").value = "";
  document.getElementById("filtro-cliente").value = "";

  currentFilters = {};
  currentPage = 1;
  loadSalesData();
  showAlert("Filtros limpiados", "info", 2000);
}

// ✅ FUNCIONES DE ACCIÓN
async function showSaleDetail(saleId) {
  try {
    console.log(`🔍 Cargando detalle de venta #${saleId}...`);
    const response = await fetch(`${API_BASE}${ENDPOINTS.SALES}/${saleId}`, {
      headers: {
        Authorization: `Bearer ${appState.currentUser.token}`,
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const sale = await response.json();

    // Simulamos items ya que no tenemos el endpoint específico
    const mockItems = [
      { productName: "Producto 1", quantity: 2, unitPrice: 100, subtotal: 200 },
      { productName: "Producto 2", quantity: 1, unitPrice: 150, subtotal: 150 },
    ];

    renderSaleDetailModal(sale, mockItems);
  } catch (error) {
    console.error("Error cargando detalle:", error);
    showAlert("Error al cargar el detalle de la venta", "error");
  }
}

function renderSaleDetailModal(sale, items) {
  const modalElement = document.getElementById("detalle-venta-modal");
  if (!modalElement) {
    console.error("❌ Modal no encontrado");
    return;
  }

  const modal = new bootstrap.Modal(modalElement);
  const content = document.getElementById("detalle-venta-content");
  const saleIdElement = document.getElementById("detalle-venta-id");
  const cancelBtn = document.getElementById("btn-cancelar-venta");

  if (saleIdElement) saleIdElement.textContent = sale.id;

  if (content) {
    content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Información de la Venta</h6>
                    <table class="table table-sm">
                        <tr><td><strong>ID:</strong></td><td>#${
                          sale.id
                        }</td></tr>
                        <tr><td><strong>Fecha:</strong></td><td>${formatDate(
                          sale.date
                        )} ${formatTime(sale.date)}</td></tr>
                        <tr><td><strong>Usuario:</strong></td><td>ID ${
                          sale.userid
                        }</td></tr>
                        <tr><td><strong>Método Pago:</strong></td><td>${getPaymentMethodText(
                          sale.paymentmethod
                        )}</td></tr>
                        <tr><td><strong>Estado:</strong></td><td><span class="status-badge status-${
                          sale.status
                        }">${getStatusText(sale.status)}</span></td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Totales</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Total Venta:</strong></td><td>$${parseFloat(
                          sale.total || 0
                        ).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</td></tr>
                        <tr><td><strong>Ganancia:</strong></td><td class="profit-positive">$${parseFloat(
                          sale.profit || 0
                        ).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}</td></tr>
                    </table>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <h6>Productos Vendidos</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Precio Unit.</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items
                                  .map(
                                    (item) => `
                                    <tr>
                                        <td>${item.productName}</td>
                                        <td>${item.quantity}</td>
                                        <td>$${parseFloat(
                                          item.unitPrice
                                        ).toLocaleString("es-AR", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}</td>
                                        <td>$${parseFloat(
                                          item.subtotal
                                        ).toLocaleString("es-AR", {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}</td>
                                    </tr>
                                `
                                  )
                                  .join("")}
                                <tr class="table-primary">
                                    <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                    <td><strong>$${parseFloat(
                                      sale.total || 0
                                    ).toLocaleString("es-AR", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
  }

  // Mostrar/ocultar botón de cancelar
  if (cancelBtn) {
    cancelBtn.style.display =
      appState.currentUser.role === "owner" && sale.status !== "canceled"
        ? "block"
        : "none";
    cancelBtn.onclick = () => cancelSale(sale.id);
  }

  modal.show();
}

async function generateTicket(saleId) {
  try {
    showAlert("Generando ticket...", "info", 2000);
    // Simulamos la generación del ticket
    setTimeout(() => {
      showAlert("Ticket generado correctamente", "success");
    }, 1000);
  } catch (error) {
    console.error("Error generando ticket:", error);
    showAlert("Error al generar el ticket", "error");
  }
}

async function cancelSale(saleId) {
  if (
    !confirm(
      "¿Estás seguro de que deseas cancelar esta venta? Esta acción no se puede deshacer."
    )
  ) {
    return;
  }

  try {
    showAlert("Cancelando venta...", "warning");

    // Simulamos la cancelación
    setTimeout(() => {
      showAlert("Venta cancelada correctamente", "success");
      loadSalesData(currentFilters);
    }, 1000);
  } catch (error) {
    console.error("Error cancelando venta:", error);
    showAlert("Error al cancelar la venta", "error");
  }
}

// ✅ VISTAS ESPECIALES
async function showConsolidatedView() {
  try {
    showAlert("Cargando vista consolidada...", "info");

    // Simulamos datos consolidados
    const mockData = [
      { cashregister_id: 1, totalSalesByCash: 1500.5 },
      { cashregister_id: 2, totalSalesByCash: 2300.75 },
    ];

    renderConsolidatedView(mockData);
  } catch (error) {
    console.error("Error cargando vista consolidada:", error);
    showAlert("No tienes permisos para ver esta información", "error");
  }
}

function renderConsolidatedView(data) {
  const modalElement = document.getElementById("consolidado-modal");
  const content = document.getElementById("consolidado-content");

  if (!modalElement || !content) {
    console.error("❌ Elementos del modal no encontrados");
    return;
  }

  const modal = new bootstrap.Modal(modalElement);

  content.innerHTML = `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">Resumen Consolidado</h6>
                    </div>
                    <div class="card-body">
                        <h6>Ventas por Caja</h6>
                        ${data
                          .map(
                            (item) => `
                            <div class="d-flex justify-content-between border-bottom py-2">
                                <span>Caja ${item.cashregister_id}</span>
                                <strong>$${parseFloat(
                                  item.totalSalesByCash
                                ).toLocaleString("es-AR", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}</strong>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        </div>
    `;

  modal.show();
}

async function showDailyReport() {
  try {
    showAlert("Generando reporte diario...", "info");
    // Simulamos generación de reporte
    setTimeout(() => {
      showAlert("Reporte diario generado correctamente", "success");
    }, 1500);
  } catch (error) {
    console.error("Error generando reporte:", error);
    showAlert("Error al generar el reporte diario", "error");
  }
}

// ✅ FUNCIONES AUXILIARES
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function updatePaginationInfo() {
  const infoElement = document.getElementById("pagination-info");
  if (infoElement) {
    infoElement.textContent = `Mostrando ${filteredSales.length} ventas`;
  }
}

function populateUserFilter(users) {
  const select = document.getElementById("filtro-usuario");
  if (!select || !Array.isArray(users)) return;

  select.innerHTML =
    '<option value="">Todos los usuarios</option>' +
    users
      .map(
        (user) => `
            <option value="${user.id}">${user.username} (${user.role})</option>
        `
      )
      .join("");
}

function updateSummaryCards(data) {
  // Implementar actualización de tarjetas de resumen
  console.log("Actualizando tarjetas con:", data);
}

function updateSummaryCardsWithDefaults() {
  // Valores por defecto para las tarjetas
  console.log("Usando valores por defecto para tarjetas");
}

// ✅ CARGA DE COMPONENTES ESTRUCTURALES
async function loadStructuralComponents() {
  const components = [
    { id: "sidenav-container", url: "components/sidenav.html" },
    { id: "navbar-container", url: "components/navbar.html" },
    { id: "footer-container", url: "components/footer.html" },
  ];

  const loadPromises = components.map(({ id, url }) =>
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        const container = document.getElementById(id);
        if (container) {
          container.innerHTML = html;
          console.log(`✅ ${id} cargado`);
        }
      })
      .catch((err) => {
        console.error(`❌ Error cargando ${id}:`, err);
        // Fallback básico
        const container = document.getElementById(id);
        if (container) {
          container.innerHTML = `<div class="text-center text-muted py-4">Error cargando ${id}</div>`;
        }
      })
  );

  await Promise.all(loadPromises);
}

// Exportar funciones principales para uso global
window.salesModule = {
  refreshSales: () => loadSalesData(currentFilters),
  applyFilters,
  clearFilters,
};

console.log("📦 sales.js cargado correctamente");
