// assets/js/controllers/clients.controller.js
import { showAlert } from "../plugins/alerts.js";

class ClientsController {
  constructor(clientsService, authService, dashboardService) {
    this.clientsService = clientsService;
    this.authService = authService;
    this.dashboardService = dashboardService;

    this.clientsData = [];
    this.suppliersData = [];
    this.contactsData = [];
    this.currentEditingId = null;
    this.currentUser = null;
    this.eventListeners = [];
    this.currentFilters = {
      type: "",
      status: "",
      cc: "",
      search: "",
    };

    console.log("👥 [ClientsController] Controlador de clientes inicializado");
  }

  async init() {
    console.log("🚀 [ClientsController] Inicializando módulo de clientes...");

    this.currentUser = this.authService.getUser();
    if (!this.currentUser) {
      this.showError("Usuario no autenticado");
      return;
    }

    try {
      // Cargar componentes estructurales
      await this.loadComponents();

      // Configurar eventos
      this.initClientsEvents();

      // Cargar datos
      await this.loadClientsData();

      console.log(
        "✅ [ClientsController] Módulo de clientes inicializado correctamente"
      );
    } catch (error) {
      console.error("❌ [ClientsController] Error inicializando:", error);
      this.showError("Error al cargar el módulo de clientes");
    }
  }

  async loadComponents() {
    try {
      await Promise.all([
        this.loadComponent("sidenav-container", "./components/sidenav.html"),
        this.loadComponent("navbar-container", "./components/navbar.html"),
        this.loadComponent("footer-container", "./components/footer.html"),
      ]);
      console.log("✅ [ClientsController] Componentes cargados");
    } catch (error) {
      console.error(
        "❌ [ClientsController] Error cargando componentes:",
        error
      );
    }
  }

  async loadComponent(id, url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const container = document.getElementById(id);
      if (container) {
        container.innerHTML = html;
      }
    } catch (error) {
      console.error(`❌ [ClientsController] Error cargando ${id}:`, error);
    }
  }

  initClientsEvents() {
    this.cleanupEventListeners();

    // Botones principales
    this.setupButton("btn-nuevo-cliente", () =>
      this.openContactModal("cliente")
    );
    this.setupButton("btn-nuevo-proveedor", () =>
      this.openContactModal("proveedor")
    );
    this.setupButton("btn-exportar-clientes", () => this.exportClients());

    // Modal contacto
    this.setupButton("btn-guardar-contacto", () => this.saveContact());
    this.setupInput("tipo-contacto", "change", (e) =>
      this.handleContactTypeChange(e.target.value)
    );
    this.setupInput("habilitar-cc", "change", () =>
      this.toggleCuentaCorriente()
    );

    // ✅ FILTROS MEJORADOS
    this.setupButton("btn-aplicar-filtros", () => this.applyFilters());
    this.setupButton("btn-limpiar-filtros", () => this.clearFilters());
    this.setupButton("btn-refresh-clientes", () => this.loadClientsData());

    // ✅ Búsqueda en tiempo real con debounce mejorado
    this.setupInput(
      "buscar-cliente",
      "input",
      this.debounce(() => {
        console.log("🔍 [ClientsController] Búsqueda en tiempo real activada");
        this.applyFilters();
      }, 500)
    );

    // ✅ También aplicar filtros cuando cambien los selects
    this.setupInput("filtro-tipo", "change", () => this.applyFilters());
    this.setupInput("filtro-estado", "change", () => this.applyFilters());
    this.setupInput("filtro-cc", "change", () => this.applyFilters());

    console.log("✅ [ClientsController] Eventos configurados");
  }

  setupButton(buttonId, handler) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.addEventListener("click", handler);
      this.eventListeners.push({ element: button, event: "click", handler });
    }
  }

  setupInput(inputId, eventType, handler) {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener(eventType, handler);
      this.eventListeners.push({ element: input, event: eventType, handler });
    }
  }

  async loadClientsData() {
    try {
      console.log(
        "🔄 [ClientsController] Cargando datos de clientes y proveedores..."
      );

      // ✅ USAR clientsService inyectado
      this.clientsData = await this.clientsService.getAllClients();

      // Por ahora simulamos proveedores, luego integrar con servicio específico
      this.suppliersData = [];

      // Combinar datos
      this.contactsData = [
        ...this.clientsData.map((c) => ({ ...c, tipo: "cliente" })),
        ...this.suppliersData.map((p) => ({ ...p, tipo: "proveedor" })),
      ];

      this.updateResumenGeneral();
      this.renderContactsTable();
      this.updateFilters();

      console.log(
        `✅ [ClientsController] ${this.contactsData.length} contactos cargados`
      );
    } catch (error) {
      console.error("❌ [ClientsController] Error cargando clientes:", error);
      this.showError("Error de conexión con el servidor");
      this.contactsData = [];
      this.renderContactsTable();
    }
  }

  updateResumenGeneral() {
    // Total clientes (type === "client")
    const totalClientes = this.clientsData.filter(
      (c) => c.type === "client"
    ).length;
    const clientesActivos = this.clientsData.filter(
      (c) =>
        c.type === "client" && (c.status === "active" || c.status === "activo")
    ).length;

    this.updateElement("total-clientes", totalClientes);
    this.updateElement("clientes-activos", clientesActivos);

    // Total proveedores (type === "supplier")
    const totalProveedores = this.clientsData.filter(
      (c) => c.type === "supplier"
    ).length;
    const proveedoresActivos = this.clientsData.filter(
      (p) =>
        p.type === "supplier" &&
        (p.status === "active" || p.status === "activo")
    ).length;

    this.updateElement("total-proveedores", totalProveedores);
    this.updateElement("proveedores-activos", proveedoresActivos);

    // Cuentas corrientes (solo para clientes con current_account === true)
    const cuentasCorrientes = this.clientsData.filter(
      (c) => c.type === "client" && c.current_account === true
    ).length;

    const saldoTotalCC = this.clientsData
      .filter((c) => c.type === "client" && c.current_account === true)
      .reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);

    this.updateElement("total-cc", cuentasCorrientes);
    this.updateElement("saldo-cc-total", `$${saldoTotalCC.toFixed(2)}`);

    // Clientes morosos (con saldo mayor al límite de crédito)
    const clientesMorosos = this.clientsData.filter(
      (c) =>
        c.type === "client" &&
        c.current_account === true &&
        (parseFloat(c.balance) || 0) > (parseFloat(c.credit_limit) || 0)
    ).length;

    const deudaMorosa = this.clientsData
      .filter(
        (c) =>
          c.type === "client" &&
          c.current_account === true &&
          (parseFloat(c.balance) || 0) > (parseFloat(c.credit_limit) || 0)
      )
      .reduce((sum, c) => sum + (parseFloat(c.balance) || 0), 0);

    this.updateElement("clientes-morosos", clientesMorosos);
    this.updateElement("deuda-morosa", `$${deudaMorosa.toFixed(2)}`);

    console.log("📊 [ClientsController] Resumen actualizado");
  }

  renderContactsTable(filteredData = null) {
    const tbody = document.getElementById("clientes-table-body");
    const tableInfo = document.getElementById("table-info");

    if (!tbody) return;

    const contactsToShow = filteredData || this.contactsData;

    if (contactsToShow.length === 0) {
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
    contactsToShow.forEach((contacto) => {
      const estadoInfo = this.getEstadoInfo(contacto);
      const tipoInfo = this.getTipoInfo(contacto.type); // ✅ Usar contact.type en inglés
      const ccInfo = this.getCuentaCorrienteInfo(contacto);

      html += `
      <tr class="${estadoInfo.class}">
        <td>
          <div class="d-flex px-2 py-1">
            <div class="d-flex flex-column justify-content-center">
              <h6 class="mb-0 text-sm">${contacto.name || "Sin nombre"}</h6>
              <p class="text-xs text-secondary mb-0">${
                contacto.cuil || "Sin CUIL"
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
              contacto.phone || "No teléfono"
            }</p>
          </div>
        </td>
        <td>
          ${ccInfo.html}
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">$${(
            contacto.credit_limit || 0
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
          }" data-tipo="${contacto.type}">
            <i class="material-icons" style="font-size: 16px">edit</i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-primary me-1 view-contacto" data-id="${
            contacto.id
          }" data-tipo="${contacto.type}">
            <i class="material-icons" style="font-size: 16px">visibility</i>
          </button>
          ${
            contacto.type === "client" && contacto.current_account === true
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
      tableInfo.textContent = `${contactsToShow.length} de ${this.contactsData.length} contactos`;
    }

    this.initTableEvents();
    console.log("✅ [ClientsController] Tabla de contactos renderizada");
  }

  getEstadoInfo(contacto) {
    const estado = contacto.status || "active";
    const saldoActual = parseFloat(contacto.balance) || 0; // ✅ Usar balance en lugar de saldo_actual
    const limiteCredito = parseFloat(contacto.credit_limit) || 0;

    // Verificar si es cliente moroso
    if (
      contacto.type === "client" &&
      contacto.current_account === true &&
      saldoActual > limiteCredito
    ) {
      return {
        class: "cliente-moroso",
        badgeClass: "bg-gradient-warning",
        text: "Moroso",
      };
    }

    switch (estado) {
      case "active":
      case "activo":
        return {
          class: "cliente-activo",
          badgeClass: "bg-gradient-success",
          text: "Activo",
        };
      case "inactive":
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

  getTipoInfo(tipo) {
    // ✅ Recibe "client" o "supplier" del backend
    switch (tipo) {
      case "client":
        return {
          class: "tipo-cliente",
          text: "Cliente",
        };
      case "supplier":
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

  getCuentaCorrienteInfo(contacto) {
    // ✅ Solo para clientes con current_account = true
    if (contacto.type !== "client" || !contacto.current_account) {
      return {
        html: '<span class="text-xs text-muted">No</span>',
      };
    }

    const saldoActual = parseFloat(contacto.balance) || 0; // ✅ Usar balance
    const limiteCredito = parseFloat(contacto.credit_limit) || 0;
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

  initTableEvents() {
    // Botones editar
    document.querySelectorAll(".edit-contacto").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const contactoId = e.currentTarget.getAttribute("data-id");
        const tipo = e.currentTarget.getAttribute("data-tipo"); // ✅ Esto viene como "client" o "supplier"
        console.log(
          `🖱️ [ClientsController] Click en editar: ID ${contactoId}, Tipo ${tipo}`
        );
        this.editContact(contactoId, tipo);
      });
    });

    // Botones ver detalle
    document.querySelectorAll(".view-contacto").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const contactoId = e.currentTarget.getAttribute("data-id");
        const tipo = e.currentTarget.getAttribute("data-tipo");
        this.viewContactDetail(contactoId, tipo);
      });
    });

    // Botones cuenta corriente
    document.querySelectorAll(".view-cc").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const clienteId = e.currentTarget.getAttribute("data-id");
        this.viewCuentaCorriente(clienteId);
      });
    });
  }

  openContactModal(type = "cliente", contactId = null) {
    const modal = new bootstrap.Modal(
      document.getElementById("modal-nuevo-contacto")
    );
    const title = document.getElementById("modal-contacto-title");
    const form = document.getElementById("form-nuevo-contacto");

    this.currentEditingId = contactId;

    // Configurar según tipo
    document.getElementById("tipo-contacto").value = type;
    document.getElementById("contacto-tipo").value = type;
    this.toggleSeccionProveedor(type === "proveedor");

    if (contactId) {
      // ✅ MODO EDICIÓN - Buscar el contacto por ID y TYPE
      title.textContent = `Editar ${
        type === "cliente" ? "Cliente" : "Proveedor"
      }`;

      // Convertir tipo del frontend al backend
      const tipoBackend = type === "proveedor" ? "supplier" : "client";

      const contacto = this.contactsData.find(
        (c) => c.id == contactId && c.type === tipoBackend
      );

      if (contacto) {
        console.log(
          `🔍 [ClientsController] Contacto encontrado para edición:`,
          contacto
        );
        this.loadContactData(contacto);
      } else {
        console.error(
          `❌ [ClientsController] Contacto no encontrado: ID ${contactId}, Tipo ${tipoBackend}`
        );
        showAlert("Error: No se pudo cargar el contacto para editar", "error");
        return;
      }
    } else {
      // ✅ MODO CREACIÓN
      title.textContent = `Nuevo ${
        type === "cliente" ? "Cliente" : "Proveedor"
      }`;
      form.reset();
      document.getElementById("contacto-id").value = "";
      document.getElementById("estado-contacto").value = "activo";
      document.getElementById("habilitar-cc").checked = false;
      this.toggleCuentaCorriente();
    }

    modal.show();
  }

  loadContactData(contacto) {
    console.log(
      "📝 [ClientsController] Cargando datos del contacto:",
      contacto
    );

    // ✅ Campos básicos
    document.getElementById("contacto-id").value = contacto.id;
    document.getElementById("nombre-contacto").value = contacto.name || "";
    document.getElementById("documento-contacto").value = contacto.cuil || "";
    document.getElementById("email-contacto").value = contacto.email || "";
    document.getElementById("telefono-contacto").value = contacto.phone || "";
    document.getElementById("direccion-contacto").value =
      contacto.address || "";

    // ✅ Estado (mapear del inglés al español para el select)
    const estado = contacto.status || "active";
    document.getElementById("estado-contacto").value =
      estado === "inactive" ? "inactivo" : "activo";

    document.getElementById("observaciones-contacto").value =
      contacto.observations || "";

    // ✅ Tipo de contacto (mapear del inglés al español para el select)
    const tipo = contacto.type || "client";
    document.getElementById("tipo-contacto").value =
      tipo === "supplier" ? "proveedor" : "cliente";

    // Actualizar el campo hidden también
    document.getElementById("contacto-tipo").value =
      tipo === "supplier" ? "proveedor" : "cliente";

    // ✅ Mostrar/ocultar secciones según el tipo
    this.toggleSeccionProveedor(tipo === "supplier");

    // ✅ Cuenta corriente (solo para clientes)
    if (tipo === "client") {
      const tieneCC = contacto.current_account === true;
      document.getElementById("habilitar-cc").checked = tieneCC;
      this.toggleCuentaCorriente();

      if (tieneCC) {
        document.getElementById("limite-credito").value =
          contacto.credit_limit || "0";
        document.getElementById("dias-credito").value =
          contacto.credit_days || "30";
      }
    }

    // ✅ Información de proveedor
    if (tipo === "supplier") {
      document.getElementById("contacto-comercial").value =
        contacto.commercial_contact || "";
      document.getElementById("condiciones-pago").value =
        contacto.payment_terms || "";
    }

    console.log(
      "✅ [ClientsController] Datos del contacto cargados en el modal"
    );
  }

  toggleSeccionProveedor(esProveedor) {
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
      this.toggleCuentaCorriente();
    }
  }

  handleContactTypeChange(type) {
    document.getElementById("contacto-tipo").value = type;
    this.toggleSeccionProveedor(type === "proveedor");
  }

  toggleCuentaCorriente() {
    const habilitarCC = document.getElementById("habilitar-cc").checked;
    const detallesCC = document.getElementById("detalles-cc");

    if (detallesCC) {
      detallesCC.style.display = habilitarCC ? "block" : "none";
    }
  }

  async saveContact() {
    try {
      // Obtener el tipo del select y mapearlo al inglés
      const tipoFrontend = document.getElementById("tipo-contacto").value;
      const tipoBackend = tipoFrontend === "proveedor" ? "supplier" : "client";

      const formData = {
        name: document.getElementById("nombre-contacto").value,
        cuil: document.getElementById("documento-contacto").value,
        email: document.getElementById("email-contacto").value,
        phone: document.getElementById("telefono-contacto").value,
        address: document.getElementById("direccion-contacto").value,
        type: tipoBackend, // ✅ ENVIAR EN INGLÉS: "client" o "supplier"
      };

      // Validaciones básicas
      if (!formData.name) throw new Error("El nombre es requerido");
      if (!formData.cuil) throw new Error("El CUIL es requerido");

      // Campos opcionales
      const estado = document.getElementById("estado-contacto").value;
      const observaciones = document.getElementById(
        "observaciones-contacto"
      ).value;

      if (estado && estado !== "activo") {
        formData.status = estado;
      }

      if (observaciones) {
        formData.observations = observaciones;
      }

      // Cuenta corriente (solo para clients, NO para suppliers)
      if (formData.type === "client") {
        // ✅ Usar el valor en inglés
        const habilitarCC = document.getElementById("habilitar-cc").checked;

        if (habilitarCC) {
          const limiteCredito =
            parseFloat(document.getElementById("limite-credito").value) || 0;
          const diasCredito =
            parseInt(document.getElementById("dias-credito").value) || 30;

          if (limiteCredito < 0) {
            throw new Error("El límite de crédito debe ser mayor o igual a 0");
          }

          formData.credit_limit = limiteCredito;
          formData.credit_days = diasCredito;
          formData.current_account = true;
        }
      }

      // Información de proveedor (solo para suppliers)
      if (formData.type === "supplier") {
        // ✅ Usar el valor en inglés
        const contactoComercial =
          document.getElementById("contacto-comercial").value;
        const condicionesPago =
          document.getElementById("condiciones-pago").value;

        if (contactoComercial) {
          formData.commercial_contact = contactoComercial;
        }

        if (condicionesPago) {
          formData.payment_terms = condicionesPago;
        }
      }

      let result;
      const contactId = document.getElementById("contacto-id").value;

      console.log(
        "📤 [ClientsController] Enviando datos al backend:",
        formData
      );

      if (this.currentEditingId) {
        result = await this.clientsService.updateClient(contactId, formData);
        showAlert("✅ Contacto actualizado correctamente", "success");
      } else {
        result = await this.clientsService.createClient(formData);
        showAlert("✅ Contacto creado correctamente", "success");
      }

      // Cerrar modal y recargar datos
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("modal-nuevo-contacto")
      );
      modal.hide();
      await this.loadClientsData();

      console.log(
        `✅ [ClientsController] Contacto ${
          this.currentEditingId ? "actualizado" : "creado"
        } correctamente`
      );
    } catch (error) {
      console.error("❌ [ClientsController] Error guardando contacto:", error);
      showAlert(`Error: ${error.message}`, "error");
    }
  }

  applyFilters() {
    const tipoFiltro = document.getElementById("filtro-tipo").value;
    const estadoFiltro = document.getElementById("filtro-estado").value;
    const ccFiltro = document.getElementById("filtro-cc").value;
    const busqueda = document
      .getElementById("buscar-cliente")
      .value.toLowerCase();

    this.currentFilters = {
      tipo: tipoFiltro,
      status: estadoFiltro,
      cc: ccFiltro,
      search: busqueda,
    };

    console.log(
      "🔍 [ClientsController] Aplicando filtros:",
      this.currentFilters
    );

    const filtered = this.contactsData.filter((contacto) => {
      // ✅ Filtro de tipo (mapear español → inglés)
      let matchesTipo = true;
      if (tipoFiltro) {
        const tipoBackend = tipoFiltro === "proveedor" ? "supplier" : "client";
        matchesTipo = contacto.type === tipoBackend;
      }

      // ✅ Filtro de estado (mapear español → inglés)
      let matchesEstado = true;
      if (estadoFiltro === "moroso") {
        // Cliente moroso: saldo > límite de crédito
        matchesEstado =
          contacto.type === "client" &&
          contacto.current_account === true &&
          (parseFloat(contacto.balance) || 0) >
            (parseFloat(contacto.credit_limit) || 0);
      } else if (estadoFiltro) {
        // Mapear estado español → inglés
        const estadoBackend =
          estadoFiltro === "inactivo" ? "inactive" : "active";
        matchesEstado = contacto.status === estadoBackend;
      }

      // ✅ Filtro de cuenta corriente
      let matchesCC = true;
      if (ccFiltro === "con_cc") {
        matchesCC =
          contacto.type === "client" && contacto.current_account === true;
      } else if (ccFiltro === "sin_cc") {
        matchesCC =
          contacto.type !== "client" || contacto.current_account !== true;
      }

      // ✅ Filtro de búsqueda (buscar en todos los campos relevantes)
      let matchesBusqueda = true;
      if (busqueda) {
        const searchTerm = busqueda.toLowerCase();
        matchesBusqueda =
          (contacto.name && contacto.name.toLowerCase().includes(searchTerm)) ||
          (contacto.cuil && contacto.cuil.toString().includes(searchTerm)) ||
          (contacto.email &&
            contacto.email.toLowerCase().includes(searchTerm)) ||
          (contacto.phone && contacto.phone.includes(searchTerm)) ||
          (contacto.company &&
            contacto.company.toLowerCase().includes(searchTerm)) ||
          (contacto.address &&
            contacto.address.toLowerCase().includes(searchTerm));
      }

      const matches =
        matchesTipo && matchesEstado && matchesCC && matchesBusqueda;

      if (matches) {
        console.log("✅ Contacto coincide con filtros:", contacto.name);
      }

      return matches;
    });

    console.log(
      `🔍 [ClientsController] Filtrados ${filtered.length} de ${this.contactsData.length} contactos`
    );
    this.renderContactsTable(filtered);
  }

  clearFilters() {
    document.getElementById("filtro-tipo").value = "";
    document.getElementById("filtro-estado").value = "";
    document.getElementById("filtro-cc").value = "";
    document.getElementById("buscar-cliente").value = "";

    this.currentFilters = {};
    this.renderContactsTable();
    showAlert("Filtros limpiados", "info", 2000);
  }

  updateFilters() {
    // Puedes agregar lógica para actualizar filtros dinámicos si es necesario
  }

  viewContactDetail(contactId, type) {
    const contacto = this.contactsData.find(
      (c) => c.id == contactId && c.type === type
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
            contacto.name || "N/A"
          }</td></tr>
          <tr><td><strong>CUIL:</strong></td><td>${
            contacto.cuil || "N/A"
          }</td></tr>
          <tr><td><strong>Estado:</strong></td><td>${
            this.getEstadoInfo(contacto).text
          }</td></tr>
          <tr><td><strong>Email:</strong></td><td>${
            contacto.email || "N/A"
          }</td></tr>
          <tr><td><strong>Teléfono:</strong></td><td>${
            contacto.phone || "N/A"
          }</td></tr>
        </table>
      </div>
      <div class="col-md-6">
        <h6>Información Adicional</h6>
        <table class="table table-sm">
          <tr><td><strong>Dirección:</strong></td><td>${
            contacto.address || "N/A"
          }</td></tr>
          <tr><td><strong>Empresa:</strong></td><td>${
            contacto.company || "N/A"
          }</td></tr>
  `;

    // Información de cuenta corriente (solo para clientes)
    if (contacto.type === "client" && contacto.current_account) {
      html += `
      <tr><td><strong>Cuenta Corriente:</strong></td><td>Sí</td></tr>
      <tr><td><strong>Límite Crédito:</strong></td><td>$${(
        contacto.credit_limit || 0
      ).toFixed(2)}</td></tr>
      <tr><td><strong>Saldo Actual:</strong></td><td>$${(
        contacto.balance || 0
      ).toFixed(2)}</td></tr>
      <tr><td><strong>Días Crédito:</strong></td><td>${
        contacto.credit_days || 30
      } días</td></tr>
    `;
    }

    // Información de proveedor
    if (contacto.type === "supplier") {
      html += `
      <tr><td><strong>Contacto Comercial:</strong></td><td>${
        contacto.commercial_contact || "N/A"
      }</td></tr>
      <tr><td><strong>Condiciones Pago:</strong></td><td>${
        contacto.payment_terms || "N/A"
      }</td></tr>
    `;
    }

    html += `
        </table>
      </div>
    </div>
    ${
      contacto.observations
        ? `
      <div class="row mt-3">
        <div class="col-12">
          <h6>Observaciones</h6>
          <p class="text-muted">${contacto.observations}</p>
        </div>
      </div>
    `
        : ""
    }
  `;

    content.innerHTML = html;
    modal.show();
  }

  viewCuentaCorriente(clientId) {
    const cliente = this.clientsData.find((c) => c.id == clientId);
    if (!cliente || !cliente.cuenta_corriente) return;

    const modal = new bootstrap.Modal(
      document.getElementById("modal-cuenta-corriente")
    );

    // Actualizar información básica
    this.updateElement(
      "cc-nombre-cliente",
      cliente.nombre || cliente.razon_social
    );
    this.updateElement(
      "cc-saldo-actual",
      `$${(cliente.saldo_actual || 0).toFixed(2)}`
    );
    this.updateElement(
      "cc-limite-credito",
      `$${(cliente.limite_credito || 0).toFixed(2)}`
    );

    const disponible =
      (cliente.limite_credito || 0) - (cliente.saldo_actual || 0);
    this.updateElement("cc-disponible", `$${disponible.toFixed(2)}`);

    const disponibleElement = document.getElementById("cc-disponible");
    if (disponibleElement) {
      disponibleElement.className = `mb-0 ${
        disponible >= 0 ? "text-success" : "text-danger"
      }`;
    }

    // Cargar movimientos de cuenta corriente
    this.loadMovimientosCuentaCorriente(clientId);

    modal.show();
  }

  async loadMovimientosCuentaCorriente(clientId) {
    try {
      // Simular carga de movimientos - integrar con API real cuando esté disponible
      const movimientos = await this.fetchMovimientosCCFromAPI(clientId);
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
                            ${
                              mov.tipo === "debe"
                                ? `$${mov.monto.toFixed(2)}`
                                : ""
                            }
                        </td>
                        <td class="${
                          mov.tipo === "haber" ? "text-success" : ""
                        }">
                            ${
                              mov.tipo === "haber"
                                ? `$${mov.monto.toFixed(2)}`
                                : ""
                            }
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
      console.error(
        "❌ [ClientsController] Error cargando movimientos CC:",
        error
      );
    }
  }

  // Función simulada - reemplazar con API real
  async fetchMovimientosCCFromAPI(clientId) {
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

  editContact(contactId, type) {
    console.log(
      `✏️ [ClientsController] Editando contacto ID: ${contactId}, Tipo: ${type}`
    );

    // ✅ Convertir tipo del backend al frontend para el modal
    const tipoFrontend = type === "supplier" ? "proveedor" : "cliente";
    this.openContactModal(tipoFrontend, contactId);
  }

  exportClients() {
    showAlert("🔜 Función de exportación en desarrollo...", "info");
  }

  updateElement(selector, value) {
    const element = document.getElementById(selector);
    if (element && value !== undefined) {
      element.textContent = value;
    }
    return element;
  }

  debounce(func, wait) {
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

  showError(message) {
    console.error("❌ [ClientsController] Error:", message);
    showAlert(message, "error");
  }

  cleanupEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  destroy() {
    this.cleanupEventListeners();
    this.clientsData = [];
    this.suppliersData = [];
    this.contactsData = [];
    this.currentEditingId = null;
    this.currentUser = null;

    console.log("🧹 [ClientsController] Controlador destruido");
  }
}

// ✅ Funciones globales para compatibilidad
window.abrirModalContacto = function (type = "cliente", contactId = null) {
  if (window.clientsController) {
    window.clientsController.openContactModal(type, contactId);
  } else {
    showAlert("Controlador de clientes no disponible", "warning");
  }
};

window.editarContacto = function (contactId, type) {
  if (window.clientsController) {
    window.clientsController.editContact(contactId, type);
  } else {
    showAlert("Controlador de clientes no disponible", "warning");
  }
};

window.verDetalleContacto = function (contactId, type) {
  if (window.clientsController) {
    window.clientsController.viewContactDetail(contactId, type);
  } else {
    showAlert("Controlador de clientes no disponible", "warning");
  }
};

window.verCuentaCorriente = function (clientId) {
  if (window.clientsController) {
    window.clientsController.viewCuentaCorriente(clientId);
  } else {
    showAlert("Controlador de clientes no disponible", "warning");
  }
};

export default ClientsController;
