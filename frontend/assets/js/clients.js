// assets/js/clientes.js - GESTIÓN COMPLETA DE CLIENTES Y PROVEEDORES
let clientesData = [];
let proveedoresData = [];
let contactosData = [];
let currentEditingId = null;
let currentUser = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Inicializando módulo de clientes...");
  initClientes();
});

async function initClientes() {
  await loadComponents();
  initClientesEvents();
  await loadClientesData();
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

function initClientesEvents() {
  // Botones principales
  document
    .getElementById("btn-nuevo-cliente")
    ?.addEventListener("click", () => abrirModalContacto("cliente"));
  document
    .getElementById("btn-nuevo-proveedor")
    ?.addEventListener("click", () => abrirModalContacto("proveedor"));
  document
    .getElementById("btn-exportar-clientes")
    ?.addEventListener("click", exportarClientes);

  // Modal contacto
  document
    .getElementById("btn-guardar-contacto")
    ?.addEventListener("click", guardarContacto);
  document
    .getElementById("tipo-contacto")
    ?.addEventListener("change", toggleTipoContacto);
  document
    .getElementById("habilitar-cc")
    ?.addEventListener("change", toggleCuentaCorriente);

  // Filtros
  document
    .getElementById("btn-aplicar-filtros")
    ?.addEventListener("click", aplicarFiltros);
  document
    .getElementById("btn-limpiar-filtros")
    ?.addEventListener("click", limpiarFiltros);
  document
    .getElementById("btn-refresh-clientes")
    ?.addEventListener("click", loadClientesData);
  document
    .getElementById("buscar-cliente")
    ?.addEventListener("input", aplicarFiltros);

  // Eventos para mostrar/ocultar secciones
  document
    .getElementById("tipo-contacto")
    ?.addEventListener("change", function () {
      toggleSeccionProveedor(this.value === "proveedor");
    });

  console.log("✅ Eventos de clientes inicializados");
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

async function loadClientesData() {
  try {
    const user = getUserWithToken();
    if (!user?.token) {
      showClientesError("Usuario no autenticado");
      return;
    }

    currentUser = user;
    console.log("🔄 Cargando datos de clientes y proveedores...");

    // Cargar clientes
    const clientesResponse = await fetch("http://localhost:3000/clients", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!clientesResponse.ok)
      throw new Error(`HTTP ${clientesResponse.status}`);

    const clientes = await clientesResponse.json();
    console.log(`👥 ${clientes.length} clientes cargados`);

    // Cargar proveedores
    const proveedoresResponse = await fetch("http://localhost:3000/suppliers", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (proveedoresResponse.ok) {
      const proveedores = await proveedoresResponse.json();
      console.log(`🏭 ${proveedores.length} proveedores cargados`);
      proveedoresData = proveedores;
    }

    // Combinar datos
    contactosData = [
      ...clientes.map((c) => ({ ...c, tipo: "cliente" })),
      ...proveedoresData.map((p) => ({ ...p, tipo: "proveedor" })),
    ];

    clientesData = clientes;

    updateResumenGeneral();
    renderContactosTable();
    updateFiltros();
  } catch (error) {
    console.error("❌ Error cargando clientes:", error);
    showClientesError("Error de conexión con el servidor");
  }
}

function updateResumenGeneral() {
  // Total clientes
  const totalClientes = clientesData.length;
  const clientesActivos = clientesData.filter(
    (c) => c.estado === "activo"
  ).length;
  document.getElementById("total-clientes").textContent = totalClientes;
  document.getElementById("clientes-activos").textContent = clientesActivos;

  // Total proveedores
  const totalProveedores = proveedoresData.length;
  const proveedoresActivos = proveedoresData.filter(
    (p) => p.estado === "activo"
  ).length;
  document.getElementById("total-proveedores").textContent = totalProveedores;
  document.getElementById("proveedores-activos").textContent =
    proveedoresActivos;

  // Cuentas corrientes
  const cuentasCorrientes = clientesData.filter(
    (c) => c.cuenta_corriente === true
  ).length;
  const saldoTotalCC = clientesData.reduce(
    (sum, c) => sum + (parseFloat(c.saldo_actual) || 0),
    0
  );
  document.getElementById("total-cc").textContent = cuentasCorrientes;
  document.getElementById(
    "saldo-cc-total"
  ).textContent = `$${saldoTotalCC.toFixed(2)}`;

  // Clientes morosos
  const clientesMorosos = clientesData.filter(
    (c) =>
      c.cuenta_corriente === true &&
      (parseFloat(c.saldo_actual) || 0) > (parseFloat(c.limite_credito) || 0)
  ).length;
  const deudaMorosa = clientesData
    .filter(
      (c) =>
        c.cuenta_corriente === true &&
        (parseFloat(c.saldo_actual) || 0) > (parseFloat(c.limite_credito) || 0)
    )
    .reduce((sum, c) => sum + (parseFloat(c.saldo_actual) || 0), 0);

  document.getElementById("clientes-morosos").textContent = clientesMorosos;
  document.getElementById("deuda-morosa").textContent = `$${deudaMorosa.toFixed(
    2
  )}`;

  console.log("📊 Resumen actualizado:", {
    totalClientes,
    totalProveedores,
    cuentasCorrientes,
    clientesMorosos,
  });
}

function renderContactosTable(filteredData = null) {
  const tbody = document.getElementById("clientes-table-body");
  const tableInfo = document.getElementById("table-info");

  if (!tbody) return;

  const contactosToShow = filteredData || contactosData;

  if (contactosToShow.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="material-icons me-2">search_off</i>
          No se encontraron contactos
        </td>
      </tr>
    `;
    if (tableInfo) tableInfo.textContent = "0 contactos encontrados";
    return;
  }

  let html = "";
  contactosToShow.forEach((contacto) => {
    const estadoInfo = getEstadoInfo(contacto);
    const tipoInfo = getTipoInfo(contacto.tipo);
    const ccInfo = getCuentaCorrienteInfo(contacto);

    html += `
      <tr class="${estadoInfo.class}">
        <td>
          <div class="d-flex px-2 py-1">
            <div class="d-flex flex-column justify-content-center">
              <h6 class="mb-0 text-sm">${
                contacto.nombre || contacto.razon_social || "Sin nombre"
              }</h6>
              <p class="text-xs text-secondary mb-0">${
                contacto.documento || "Sin documento"
              }</p>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-tipo ${tipoInfo.class}">${tipoInfo.text}</span>
        </td>
        <td>
          <div class="d-flex flex-column">
            <p class="text-xs text-secondary mb-0">${
              contacto.email || "No email"
            }</p>
            <p class="text-xs text-secondary mb-0">${
              contacto.telefono || "No teléfono"
            }</p>
          </div>
        </td>
        <td>
          ${ccInfo.html}
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">$${(
            contacto.limite_credito || 0
          ).toFixed(2)}</p>
        </td>
        <td>
          <span class="badge badge-sm ${estadoInfo.badgeClass}">
            ${estadoInfo.text}
          </span>
        </td>
        <td class="align-middle">
          <button type="button" class="btn btn-sm btn-outline-info me-1 edit-contacto" data-id="${
            contacto.id
          }" data-tipo="${contacto.tipo}">
            <i class="material-icons" style="font-size: 16px">edit</i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary me-1 view-contacto" data-id="${
            contacto.id
          }" data-tipo="${contacto.tipo}">
            <i class="material-icons" style="font-size: 16px">visibility</i>
          </button>
          ${
            contacto.tipo === "cliente" && contacto.cuenta_corriente
              ? `
            <button type="button" class="btn btn-sm btn-outline-warning view-cc" data-id="${contacto.id}">
              <i class="material-icons" style="font-size: 16px">account_balance</i>
            </button>
          `
              : ""
          }
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  if (tableInfo) {
    tableInfo.textContent = `${contactosToShow.length} de ${contactosData.length} contactos`;
  }

  // Agregar eventos a los botones
  initTableEvents();
}

function getEstadoInfo(contacto) {
  const estado = contacto.estado || "activo";
  const saldoActual = parseFloat(contacto.saldo_actual) || 0;
  const limiteCredito = parseFloat(contacto.limite_credito) || 0;

  if (
    contacto.tipo === "cliente" &&
    contacto.cuenta_corriente &&
    saldoActual > limiteCredito
  ) {
    return {
      class: "cliente-moroso",
      badgeClass: "bg-gradient-warning",
      text: "Moroso",
    };
  }

  switch (estado) {
    case "activo":
      return {
        class: "cliente-activo",
        badgeClass: "bg-gradient-success",
        text: "Activo",
      };
    case "inactivo":
      return {
        class: "cliente-inactivo",
        badgeClass: "bg-gradient-danger",
        text: "Inactivo",
      };
    default:
      return {
        class: "",
        badgeClass: "bg-gradient-secondary",
        text: estado,
      };
  }
}

function getTipoInfo(tipo) {
  switch (tipo) {
    case "cliente":
      return {
        class: "tipo-cliente",
        text: "Cliente",
      };
    case "proveedor":
      return {
        class: "tipo-proveedor",
        text: "Proveedor",
      };
    default:
      return {
        class: "",
        text: tipo,
      };
  }
}

function getCuentaCorrienteInfo(contacto) {
  if (contacto.tipo !== "cliente" || !contacto.cuenta_corriente) {
    return {
      html: '<span class="text-xs text-muted">No</span>',
    };
  }

  const saldoActual = parseFloat(contacto.saldo_actual) || 0;
  const limiteCredito = parseFloat(contacto.limite_credito) || 0;
  const porcentajeUso =
    limiteCredito > 0 ? (saldoActual / limiteCredito) * 100 : 0;

  let saldoClass = "text-success";
  if (porcentajeUso > 80) saldoClass = "text-warning";
  if (porcentajeUso >= 100) saldoClass = "text-danger";

  return {
    html: `
      <div class="d-flex flex-column">
        <span class="text-xs font-weight-bold ${saldoClass}">$${saldoActual.toFixed(
      2
    )}</span>
        <small class="text-xs text-muted">${porcentajeUso.toFixed(
          1
        )}% usado</small>
      </div>
    `,
  };
}

function initTableEvents() {
  // Botones editar
  document.querySelectorAll(".edit-contacto").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const contactoId = e.currentTarget.getAttribute("data-id");
      const tipo = e.currentTarget.getAttribute("data-tipo");
      editarContacto(contactoId, tipo);
    });
  });

  // Botones ver detalle
  document.querySelectorAll(".view-contacto").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const contactoId = e.currentTarget.getAttribute("data-id");
      const tipo = e.currentTarget.getAttribute("data-tipo");
      verDetalleContacto(contactoId, tipo);
    });
  });

  // Botones cuenta corriente
  document.querySelectorAll(".view-cc").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const clienteId = e.currentTarget.getAttribute("data-id");
      verCuentaCorriente(clienteId);
    });
  });
}

// ✅ MODAL CONTACTO
function abrirModalContacto(tipo = "cliente", contactoId = null) {
  const modal = new bootstrap.Modal(
    document.getElementById("modal-nuevo-contacto")
  );
  const title = document.getElementById("modal-contacto-title");
  const form = document.getElementById("form-nuevo-contacto");

  currentEditingId = contactoId;

  // Configurar según tipo
  document.getElementById("tipo-contacto").value = tipo;
  document.getElementById("contacto-tipo").value = tipo;
  toggleSeccionProveedor(tipo === "proveedor");

  if (contactoId) {
    // Modo edición
    title.textContent = `Editar ${
      tipo === "cliente" ? "Cliente" : "Proveedor"
    }`;
    const contacto = contactosData.find(
      (c) => c.id == contactoId && c.tipo === tipo
    );
    if (contacto) {
      cargarDatosContacto(contacto);
    }
  } else {
    // Modo creación
    title.textContent = `Nuevo ${tipo === "cliente" ? "Cliente" : "Proveedor"}`;
    form.reset();
    document.getElementById("contacto-id").value = "";
    document.getElementById("estado-contacto").value = "activo";
    document.getElementById("habilitar-cc").checked = false;
    toggleCuentaCorriente();
  }

  modal.show();
}

function cargarDatosContacto(contacto) {
  document.getElementById("contacto-id").value = contacto.id;
  document.getElementById("nombre-contacto").value =
    contacto.nombre || contacto.razon_social || "";
  document.getElementById("documento-contacto").value =
    contacto.documento || "";
  document.getElementById("email-contacto").value = contacto.email || "";
  document.getElementById("telefono-contacto").value = contacto.telefono || "";
  document.getElementById("direccion-contacto").value =
    contacto.direccion || "";
  document.getElementById("estado-contacto").value =
    contacto.estado || "activo";
  document.getElementById("observaciones-contacto").value =
    contacto.observaciones || "";

  // Cuenta corriente (solo clientes)
  if (contacto.tipo === "cliente") {
    const tieneCC = contacto.cuenta_corriente === true;
    document.getElementById("habilitar-cc").checked = tieneCC;
    toggleCuentaCorriente();

    if (tieneCC) {
      document.getElementById("limite-credito").value =
        contacto.limite_credito || "0";
      document.getElementById("dias-credito").value =
        contacto.dias_credito || "30";
    }
  }

  // Información de proveedor
  if (contacto.tipo === "proveedor") {
    document.getElementById("contacto-comercial").value =
      contacto.contacto_comercial || "";
    document.getElementById("condiciones-pago").value =
      contacto.condiciones_pago || "";
  }
}

function toggleSeccionProveedor(esProveedor) {
  const seccionProveedor = document.getElementById("seccion-proveedor");
  const seccionCC = document.getElementById("seccion-cuenta-corriente");

  if (seccionProveedor) {
    seccionProveedor.style.display = esProveedor ? "block" : "none";
  }

  if (seccionCC) {
    seccionCC.style.display = esProveedor ? "none" : "block";
  }

  // Resetear cuenta corriente si es proveedor
  if (esProveedor) {
    document.getElementById("habilitar-cc").checked = false;
    toggleCuentaCorriente();
  }
}

function toggleTipoContacto() {
  const tipo = document.getElementById("tipo-contacto").value;
  document.getElementById("contacto-tipo").value = tipo;
  toggleSeccionProveedor(tipo === "proveedor");
}

function toggleCuentaCorriente() {
  const habilitarCC = document.getElementById("habilitar-cc").checked;
  const detallesCC = document.getElementById("detalles-cc");

  if (detallesCC) {
    detallesCC.style.display = habilitarCC ? "block" : "none";
  }
}

async function guardarContacto() {
  try {
    const user = getUserWithToken();
    if (!user?.token) throw new Error("Usuario no autenticado");

    const formData = {
      nombre: document.getElementById("nombre-contacto").value,
      documento: document.getElementById("documento-contacto").value,
      email: document.getElementById("email-contacto").value,
      telefono: document.getElementById("telefono-contacto").value,
      direccion: document.getElementById("direccion-contacto").value,
      estado: document.getElementById("estado-contacto").value,
      observaciones: document.getElementById("observaciones-contacto").value,
      tipo: document.getElementById("tipo-contacto").value,
    };

    // Validaciones básicas
    if (!formData.nombre) throw new Error("El nombre es requerido");
    if (!formData.documento) throw new Error("El documento es requerido");

    // Cuenta corriente (solo para clientes)
    if (formData.tipo === "cliente") {
      const habilitarCC = document.getElementById("habilitar-cc").checked;
      formData.cuenta_corriente = habilitarCC;

      if (habilitarCC) {
        formData.limite_credito =
          parseFloat(document.getElementById("limite-credito").value) || 0;
        formData.dias_credito =
          parseInt(document.getElementById("dias-credito").value) || 30;

        if (formData.limite_credito < 0)
          throw new Error("El límite de crédito debe ser mayor o igual a 0");
      }
    }

    // Información de proveedor
    if (formData.tipo === "proveedor") {
      formData.contacto_comercial =
        document.getElementById("contacto-comercial").value;
      formData.condiciones_pago =
        document.getElementById("condiciones-pago").value;
    }

    let response;
    const contactoId = document.getElementById("contacto-id").value;

    if (currentEditingId) {
      // Actualizar
      const endpoint =
        formData.tipo === "cliente"
          ? `http://localhost:3000/clients/${contactoId}`
          : `http://localhost:3000/suppliers/${contactoId}`;

      response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
    } else {
      // Crear
      const endpoint =
        formData.tipo === "cliente"
          ? "http://localhost:3000/clients"
          : "http://localhost:3000/suppliers";

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error guardando contacto");
    }

    const savedContacto = await response.json();

    // Cerrar modal y recargar datos
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("modal-nuevo-contacto")
    );
    modal.hide();

    await loadClientesData();

    console.log(
      `✅ Contacto ${currentEditingId ? "actualizado" : "creado"} correctamente`
    );
  } catch (error) {
    console.error("❌ Error guardando contacto:", error);
    alert("Error: " + error.message);
  }
}

// ✅ FILTROS
function aplicarFiltros() {
  const tipoFiltro = document.getElementById("filtro-tipo").value;
  const estadoFiltro = document.getElementById("filtro-estado").value;
  const ccFiltro = document.getElementById("filtro-cc").value;
  const busqueda = document
    .getElementById("buscar-cliente")
    .value.toLowerCase();

  let filtered = contactosData.filter((contacto) => {
    // Filtro de tipo
    const matchesTipo = !tipoFiltro || contacto.tipo === tipoFiltro;

    // Filtro de estado
    let matchesEstado = true;
    if (estadoFiltro === "moroso") {
      matchesEstado =
        contacto.tipo === "cliente" &&
        contacto.cuenta_corriente &&
        (parseFloat(contacto.saldo_actual) || 0) >
          (parseFloat(contacto.limite_credito) || 0);
    } else if (estadoFiltro) {
      matchesEstado = contacto.estado === estadoFiltro;
    }

    // Filtro de cuenta corriente
    let matchesCC = true;
    if (ccFiltro === "con_cc") {
      matchesCC =
        contacto.tipo === "cliente" && contacto.cuenta_corriente === true;
    } else if (ccFiltro === "sin_cc") {
      matchesCC =
        contacto.tipo !== "cliente" || contacto.cuenta_corriente !== true;
    }

    // Filtro de búsqueda
    const matchesBusqueda =
      !busqueda ||
      contacto.nombre?.toLowerCase().includes(busqueda) ||
      contacto.razon_social?.toLowerCase().includes(busqueda) ||
      contacto.documento?.toLowerCase().includes(busqueda) ||
      contacto.email?.toLowerCase().includes(busqueda) ||
      contacto.telefono?.toLowerCase().includes(busqueda);

    return matchesTipo && matchesEstado && matchesCC && matchesBusqueda;
  });

  renderContactosTable(filtered);
}

function limpiarFiltros() {
  document.getElementById("filtro-tipo").value = "";
  document.getElementById("filtro-estado").value = "";
  document.getElementById("filtro-cc").value = "";
  document.getElementById("buscar-cliente").value = "";
  renderContactosTable();
}

function updateFiltros() {
  // Puedes agregar lógica para actualizar filtros dinámicos si es necesario
}

// ✅ FUNCIONES DE DETALLE
function verDetalleContacto(contactoId, tipo) {
  const contacto = contactosData.find(
    (c) => c.id == contactoId && c.tipo === tipo
  );
  if (!contacto) return;

  const modal = new bootstrap.Modal(
    document.getElementById("modal-detalle-contacto")
  );
  const content = document.getElementById("detalle-contacto-content");

  let html = `
    <div class="row">
      <div class="col-md-6">
        <h6>Información Básica</h6>
        <table class="table table-sm">
          <tr><td><strong>Nombre:</strong></td><td>${
            contacto.nombre || contacto.razon_social
          }</td></tr>
          <tr><td><strong>Documento:</strong></td><td>${
            contacto.documento || "N/A"
          }</td></tr>
          <tr><td><strong>Estado:</strong></td><td>${
            getEstadoInfo(contacto).text
          }</td></tr>
          <tr><td><strong>Email:</strong></td><td>${
            contacto.email || "N/A"
          }</td></tr>
          <tr><td><strong>Teléfono:</strong></td><td>${
            contacto.telefono || "N/A"
          }</td></tr>
        </table>
      </div>
      <div class="col-md-6">
        <h6>Información Adicional</h6>
        <table class="table table-sm">
          <tr><td><strong>Dirección:</strong></td><td>${
            contacto.direccion || "N/A"
          }</td></tr>
  `;

  if (contacto.tipo === "cliente" && contacto.cuenta_corriente) {
    html += `
          <tr><td><strong>Cuenta Corriente:</strong></td><td>Sí</td></tr>
          <tr><td><strong>Límite Crédito:</strong></td><td>$${(
            contacto.limite_credito || 0
          ).toFixed(2)}</td></tr>
          <tr><td><strong>Saldo Actual:</strong></td><td>$${(
            contacto.saldo_actual || 0
          ).toFixed(2)}</td></tr>
          <tr><td><strong>Días Crédito:</strong></td><td>${
            contacto.dias_credito || 30
          } días</td></tr>
    `;
  }

  if (contacto.tipo === "proveedor") {
    html += `
          <tr><td><strong>Contacto Comercial:</strong></td><td>${
            contacto.contacto_comercial || "N/A"
          }</td></tr>
          <tr><td><strong>Condiciones Pago:</strong></td><td>${
            contacto.condiciones_pago || "N/A"
          }</td></tr>
    `;
  }

  html += `
        </table>
      </div>
    </div>
    ${
      contacto.observaciones
        ? `
      <div class="row mt-3">
        <div class="col-12">
          <h6>Observaciones</h6>
          <p class="text-muted">${contacto.observaciones}</p>
        </div>
      </div>
    `
        : ""
    }
  `;

  content.innerHTML = html;
  modal.show();
}

function verCuentaCorriente(clienteId) {
  const cliente = clientesData.find((c) => c.id == clienteId);
  if (!cliente || !cliente.cuenta_corriente) return;

  const modal = new bootstrap.Modal(
    document.getElementById("modal-cuenta-corriente")
  );

  // Actualizar información básica
  document.getElementById("cc-nombre-cliente").textContent =
    cliente.nombre || cliente.razon_social;
  document.getElementById("cc-saldo-actual").textContent = `$${(
    cliente.saldo_actual || 0
  ).toFixed(2)}`;
  document.getElementById("cc-limite-credito").textContent = `$${(
    cliente.limite_credito || 0
  ).toFixed(2)}`;

  const disponible =
    (cliente.limite_credito || 0) - (cliente.saldo_actual || 0);
  document.getElementById("cc-disponible").textContent = `$${disponible.toFixed(
    2
  )}`;
  document.getElementById("cc-disponible").className = `mb-0 ${
    disponible >= 0 ? "text-success" : "text-danger"
  }`;

  // Aquí cargarías los movimientos de cuenta corriente desde la API
  cargarMovimientosCuentaCorriente(clienteId);

  modal.show();
}

async function cargarMovimientosCuentaCorriente(clienteId) {
  try {
    // Simular carga de movimientos - reemplazar con tu API real
    const movimientos = await fetchMovimientosCCFromAPI(clienteId);
    const tbody = document.getElementById("movimientos-cc-body");

    if (movimientos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-3">
            No hay movimientos registrados
          </td>
        </tr>
      `;
      return;
    }

    let html = "";
    let saldoAcumulado = 0;

    movimientos.forEach((mov) => {
      saldoAcumulado += mov.tipo === "debe" ? mov.monto : -mov.monto;

      html += `
        <tr>
          <td>${new Date(mov.fecha).toLocaleDateString()}</td>
          <td>${mov.concepto}</td>
          <td class="${mov.tipo === "debe" ? "text-danger" : ""}">
            ${mov.tipo === "debe" ? `$${mov.monto.toFixed(2)}` : ""}
          </td>
          <td class="${mov.tipo === "haber" ? "text-success" : ""}">
            ${mov.tipo === "haber" ? `$${mov.monto.toFixed(2)}` : ""}
          </td>
          <td class="font-weight-bold ${
            saldoAcumulado >= 0 ? "text-primary" : "text-danger"
          }">
            $${saldoAcumulado.toFixed(2)}
          </td>
          <td>
            <button class="btn btn-sm btn-outline-info">
              <i class="material-icons" style="font-size: 14px">receipt</i>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (error) {
    console.error("❌ Error cargando movimientos CC:", error);
  }
}

// Función simulada - reemplazar con tu API real
async function fetchMovimientosCCFromAPI(clienteId) {
  return [
    {
      id: 1,
      fecha: new Date().toISOString(),
      tipo: "debe",
      concepto: "Compra a crédito",
      monto: 150.0,
    },
    {
      id: 2,
      fecha: new Date().toISOString(),
      tipo: "haber",
      concepto: "Pago recibido",
      monto: 50.0,
    },
  ];
}

function editarContacto(contactoId, tipo) {
  abrirModalContacto(tipo, contactoId);
}

// ✅ EXPORTACIÓN
function exportarClientes() {
  // Implementar lógica de exportación a Excel/PDF
  alert("🔜 Función de exportación en desarrollo...");
}

function showClientesError(message = "Error cargando contactos") {
  const tbody = document.getElementById("clientes-table-body");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          <i class="material-icons me-2">error</i>
          ${message}
        </td>
      </tr>
    `;
  }
}

// ✅ HACER FUNCIONES DISPONIBLES GLOBALMENTE
window.abrirModalContacto = abrirModalContacto;
window.editarContacto = editarContacto;
window.verDetalleContacto = verDetalleContacto;
window.verCuentaCorriente = verCuentaCorriente;
