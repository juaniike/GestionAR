// assets/js/controllers/dashboard/sales-form.controller.js
import { showAlert, showConfirm } from "../../plugins/alerts.js";

class SalesFormController {
  constructor(
    productsService,
    clientsService,
    salesService,
    authService,
    cashService
  ) {
    this.productsService = productsService;
    this.clientsService = clientsService;
    this.salesService = salesService;
    this.authService = authService;
    this.cashService = cashService;

    this.modal = null;
    this.selectedProducts = [];
    this.currentClient = null;
    this.products = [];
    this.clients = [];
    this.isInitialized = false;

    console.log(
      "🛒 [SalesFormController] Inicializado con servicios inyectados"
    );
  }

  async init() {
    if (this.isInitialized) return;

    console.log(
      "🛒 [SalesFormController] Inicializando formulario de ventas..."
    );

    try {
      // ✅ CAMBIO: Usar "venta-form" en lugar de "salesModal"
      this.modal = new bootstrap.Modal(document.getElementById("venta-form"));
      this.bindEvents();
      await this.loadData();

      this.isInitialized = true;
      console.log("✅ [SalesFormController] Formulario de ventas inicializado");
    } catch (error) {
      console.error("❌ [SalesFormController] Error en inicialización:", error);
      throw error;
    }
  }

  bindEvents() {
    // Botón agregar producto
    const addProductBtn = document.getElementById("add-product");
    if (addProductBtn) {
      addProductBtn.addEventListener("click", () => this.addEmptyProduct());
    }

    // Selector de productos
    const productSelect = document.getElementById("producto-select");
    if (productSelect) {
      productSelect.addEventListener("change", (e) => {
        if (e.target.value) this.addProductFromSelect(e.target.value);
      });
    }

    // Confirmar venta
    const submitBtn = document.getElementById("submit-venta");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.confirmSale());
    }

    // Verificar estado de caja al abrir modal
    const ventaForm = document.getElementById("venta-form");
    if (ventaForm) {
      ventaForm.addEventListener("show.bs.modal", () => this.onModalOpen());
    }

    console.log("✅ [SalesFormController] Eventos configurados");
  }

  async loadData() {
    try {
      await Promise.all([this.loadProducts(), this.loadClients()]);
      console.log("✅ [SalesFormController] Datos cargados correctamente");
    } catch (error) {
      console.error("❌ [SalesFormController] Error cargando datos:", error);
      showAlert("Error cargando datos del formulario", "error");
    }
  }

  async loadProducts() {
    try {
      console.log("🛒 [SalesFormController] Cargando productos...");
      this.products = await this.productsService.getAllProducts();
      console.log(
        `✅ [SalesFormController] ${this.products.length} productos cargados`
      );
      this.populateProductSelect();
    } catch (error) {
      console.error(
        "❌ [SalesFormController] Error cargando productos:",
        error
      );
      this.products = [];
      showAlert("Error cargando productos", "warning");
    }
  }

  async loadClients() {
    try {
      console.log("🛒 [SalesFormController] Cargando clientes...");
      this.clients = await this.clientsService.getAllClients();
      console.log(
        `✅ [SalesFormController] ${this.clients.length} clientes cargados`
      );
      this.populateClientSelect();
    } catch (error) {
      console.error("❌ [SalesFormController] Error cargando clientes:", error);
      this.clients = [];
      showAlert("Error cargando clientes", "warning");
    }
  }

  populateProductSelect() {
    const select = document.getElementById("producto-select");
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un producto...</option>';

    this.products.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = `${product.name} - $${(product.price || 0).toFixed(
        2
      )} (Stock: ${product.stock || 0})`;
      option.dataset.product = JSON.stringify(product);
      select.appendChild(option);
    });
  }

  populateClientSelect() {
    const select = document.getElementById("cliente");
    if (!select) return;

    select.innerHTML = '<option value="">Selecciona un cliente...</option>';

    this.clients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client.id;
      option.textContent = `${client.name} - ${client.email || ""}`;
      select.appendChild(option);
    });
  }

  onModalOpen() {
    this.checkCashStatus();
    this.resetForm();
  }

  async checkCashStatus() {
    const alert = document.getElementById("cash-status-alert");
    const statusText = document.getElementById("cash-status-text");

    if (!alert || !statusText) return;

    try {
      const cashStatus = await this.cashService.getCashStatus();

      if (cashStatus) {
        alert.className = "alert alert-success";
        statusText.innerHTML = `<strong>Caja abierta</strong> - Efectivo inicial: $${(
          parseFloat(cashStatus.startingcash) || 0
        ).toFixed(2)}`;
        alert.classList.remove("d-none");
      } else {
        alert.className = "alert alert-danger";
        statusText.innerHTML =
          "<strong>Caja cerrada</strong> - Debe abrir la caja antes de registrar ventas";
        alert.classList.remove("d-none");
      }
    } catch (error) {
      console.error("❌ [SalesFormController] Error verificando caja:", error);
      alert.className = "alert alert-warning";
      statusText.innerHTML =
        "<strong>Estado de caja desconocido</strong> - Verifique que la caja esté abierta";
      alert.classList.remove("d-none");
    }
  }

  addEmptyProduct() {
    this.addProductRow(null);
  }

  addProductFromSelect(productId) {
    const select = document.getElementById("producto-select");
    if (!select) return;

    const selectedOption = select.querySelector(`option[value="${productId}"]`);
    if (selectedOption && selectedOption.dataset.product) {
      const product = JSON.parse(selectedOption.dataset.product);
      this.addProductRow(product);
      select.value = ""; // Reset select
    }
  }

  addProductRow(product = null) {
    const container = document.getElementById("productos-container");
    if (!container) return;

    // Remover mensaje de "no hay productos"
    if (container.querySelector(".text-center.text-muted")) {
      container.innerHTML = "";
    }

    const productId = product ? product.id : `temp-${Date.now()}`;
    const productName = product ? product.name : "";
    const price = product ? product.price || 0 : 0;
    const maxStock = product ? product.stock || 999 : 999;

    const productRow = document.createElement("div");
    productRow.className = "product-row card card-body mb-2";
    productRow.innerHTML = `
      <div class="row align-items-center">
        <div class="col-md-5">
          <div class="input-group input-group-static">
            <label>Producto</label>
            <input type="text" 
                   class="form-control product-name" 
                   value="${productName}" 
                   placeholder="Nombre del producto"
                   ${product ? "readonly" : ""}>
          </div>
        </div>
        <div class="col-md-2">
          <div class="input-group input-group-static">
            <label>Precio</label>
            <input type="number" 
                   class="form-control product-price" 
                   value="${price}" 
                   min="0" 
                   step="0.01"
                   ${product ? "readonly" : ""}>
          </div>
        </div>
        <div class="col-md-2">
          <div class="input-group input-group-static">
            <label>Cantidad</label>
            <input type="number" 
                   class="form-control product-quantity" 
                   value="1" 
                   min="1" 
                   max="${maxStock}" 
                   step="1">
          </div>
        </div>
        <div class="col-md-2">
          <div class="input-group input-group-static">
            <label>Subtotal</label>
            <input type="text" 
                   class="form-control product-subtotal" 
                   value="$${price.toFixed(2)}" 
                   readonly>
          </div>
        </div>
        <div class="col-md-1">
          <button type="button" class="btn btn-danger btn-sm remove-product" 
                  style="margin-top: 1.5rem;">
            <i class="material-icons">delete</i>
          </button>
        </div>
      </div>
    `;

    container.appendChild(productRow);
    this.bindProductRowEvents(productRow, productId);
    this.calculateTotal();
  }

  bindProductRowEvents(row, productId) {
    const quantityInput = row.querySelector(".product-quantity");
    const priceInput = row.querySelector(".product-price");
    const removeBtn = row.querySelector(".remove-product");

    const updateSubtotal = () => {
      const quantity = parseInt(quantityInput.value) || 0;
      const price = parseFloat(priceInput.value) || 0;
      const subtotal = quantity * price;

      const subtotalInput = row.querySelector(".product-subtotal");
      if (subtotalInput) {
        subtotalInput.value = `$${subtotal.toFixed(2)}`;
      }

      this.calculateTotal();
    };

    if (quantityInput) quantityInput.addEventListener("input", updateSubtotal);
    if (priceInput) priceInput.addEventListener("input", updateSubtotal);

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        row.remove();
        this.calculateTotal();
        this.checkEmptyProducts();
      });
    }
  }

  checkEmptyProducts() {
    const container = document.getElementById("productos-container");
    if (!container) return;

    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted py-3">
          <i class="material-icons mb-2">shopping_basket</i>
          <p>No hay productos agregados</p>
        </div>
      `;
    }
  }

  calculateTotal() {
    const productRows = document.querySelectorAll(".product-row");
    let total = 0;

    productRows.forEach((row) => {
      const subtotalInput = row.querySelector(".product-subtotal");
      if (subtotalInput) {
        const subtotalText = subtotalInput.value;
        const subtotal = parseFloat(subtotalText.replace("$", "")) || 0;
        total += subtotal;
      }
    });

    const totalElement = document.getElementById("total-venta");
    if (totalElement) {
      totalElement.textContent = `$${total.toFixed(2)}`;
    }

    return total;
  }

  getSaleData() {
    const productRows = document.querySelectorAll(".product-row");
    const items = [];

    productRows.forEach((row) => {
      const nameInput = row.querySelector(".product-name");
      const priceInput = row.querySelector(".product-price");
      const quantityInput = row.querySelector(".product-quantity");

      if (nameInput && priceInput && quantityInput) {
        const name = nameInput.value;
        const price = parseFloat(priceInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 0;

        if (name && price > 0 && quantity > 0) {
          // Encontrar el ID real del producto
          const product = this.products.find((p) => p.name === name);

          if (product) {
            items.push({
              productid: product.id,
              quantity: quantity,
              unitprice: price,
            });
          } else {
            // Producto manual (sin ID en el sistema)
            items.push({
              productname: name,
              quantity: quantity,
              unitprice: price,
            });
          }
        }
      }
    });

    const paymentMethodSelect = document.getElementById("metodo");
    const clientSelect = document.getElementById("cliente");

    return {
      items: items,
      paymentmethod: paymentMethodSelect ? paymentMethodSelect.value : "cash",
      clientid:
        clientSelect && clientSelect.value
          ? parseInt(clientSelect.value)
          : null,
    };
  }

  async confirmSale() {
    try {
      // Verificar estado de caja
      const cashStatus = await this.cashService.getCashStatus();
      if (!cashStatus) {
        showAlert(
          "❌ La caja debe estar abierta para registrar ventas",
          "error"
        );
        return;
      }

      const saleData = this.getSaleData();

      // Validaciones
      if (saleData.items.length === 0) {
        showAlert("❌ Agregue al menos un producto a la venta", "warning");
        return;
      }

      // Mostrar loading
      const submitBtn = document.getElementById("submit-venta");
      const originalText = submitBtn ? submitBtn.innerHTML : "";

      if (submitBtn) {
        submitBtn.innerHTML =
          '<i class="material-icons me-1">hourglass_empty</i> Procesando...';
        submitBtn.disabled = true;
      }

      console.log("🔄 [SalesFormController] Enviando venta:", saleData);

      // ✅ USAR salesService inyectado
      const result = await this.salesService.createSale(saleData);

      console.log("✅ [SalesFormController] Venta registrada:", result);

      showAlert("✅ Venta registrada exitosamente!", "success");
      this.modal.hide();

      // Disparar evento para refrescar dashboard
      window.dispatchEvent(
        new CustomEvent("saleCompleted", {
          detail: { saleId: result.id, total: result.total },
        })
      );
    } catch (error) {
      console.error("❌ [SalesFormController] Error registrando venta:", error);
      showAlert(`❌ Error al registrar venta: ${error.message}`, "error");
    } finally {
      // Restaurar botón
      const submitBtn = document.getElementById("submit-venta");
      if (submitBtn) {
        submitBtn.innerHTML =
          '<i class="material-icons me-1">check_circle</i> Confirmar Venta';
        submitBtn.disabled = false;
      }
    }
  }

  resetForm() {
    const clienteSelect = document.getElementById("cliente");
    const cuentaCorriente = document.getElementById("cuenta-corriente");
    const metodoSelect = document.getElementById("metodo");
    const productosContainer = document.getElementById("productos-container");
    const totalVenta = document.getElementById("total-venta");

    if (clienteSelect) clienteSelect.value = "";
    if (cuentaCorriente) cuentaCorriente.checked = false;
    if (metodoSelect) metodoSelect.value = "cash";

    if (productosContainer) {
      productosContainer.innerHTML = `
        <div class="text-center text-muted py-3">
          <i class="material-icons mb-2">shopping_basket</i>
          <p>No hay productos agregados</p>
        </div>
      `;
    }

    if (totalVenta) totalVenta.textContent = "$0.00";

    this.selectedProducts = [];
  }

  open() {
    if (!this.isInitialized) {
      this.init().then(() => {
        this.modal.show();
      });
    } else {
      this.modal.show();
    }
  }

  close() {
    if (this.modal) {
      this.modal.hide();
    }
  }

  destroy() {
    // Limpiar event listeners si es necesario
    this.isInitialized = false;
    this.modal = null;
    this.products = [];
    this.clients = [];
    this.selectedProducts = [];

    console.log("🧹 [SalesFormController] Recursos limpiados");
  }
}

// ✅ Función global mejorada
window.mostrarFormularioVentas = function () {
  console.log("🛒 mostrarFormularioVentas() llamado");

  if (window.dashboardController && window.dashboardController.salesForm) {
    window.dashboardController.salesForm.open();
  } else {
    showAlert(
      "El formulario de ventas no está disponible. Recarga la página.",
      "warning"
    );
  }
};

export default SalesFormController;
