// assets/js/pages/dashboard/sales-form.js
class SalesForm {
  constructor() {
    this.modal = null;
    this.selectedProducts = [];
    this.currentClient = null;
    this.products = [];
    this.clients = [];
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    console.log("🛒 [SalesForm] Inicializando formulario de ventas...");

    this.modal = new bootstrap.Modal(document.getElementById("venta-form"));
    this.bindEvents();
    await this.loadData();

    this.isInitialized = true;
    console.log("✅ [SalesForm] Formulario de ventas inicializado");
  }

  bindEvents() {
    // Botón agregar producto
    document
      .getElementById("add-product")
      .addEventListener("click", () => this.addEmptyProduct());

    // Selector de productos
    document
      .getElementById("producto-select")
      .addEventListener("change", (e) => {
        if (e.target.value) this.addProductFromSelect(e.target.value);
      });

    // Confirmar venta
    document
      .getElementById("submit-venta")
      .addEventListener("click", () => this.confirmSale());

    // Verificar estado de caja al abrir modal
    document
      .getElementById("venta-form")
      .addEventListener("show.bs.modal", () => this.onModalOpen());
  }

  async loadData() {
    try {
      await Promise.all([this.loadProducts(), this.loadClients()]);
    } catch (error) {
      console.error("❌ [SalesForm] Error cargando datos:", error);
    }
  }

  async loadProducts() {
    try {
      // TODO: Conectar con API de productos
      const response = await fetch("http://localhost:3000/products", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        this.products = await response.json();
        this.populateProductSelect();
      } else {
        throw new Error("Error cargando productos");
      }
    } catch (error) {
      console.warn("⚠️ [SalesForm] Usando datos mock de productos");
      // Datos mock temporalmente
      this.products = [
        { id: 1, name: "Producto 1", price: 1000, stock: 10 },
        { id: 2, name: "Producto 2", price: 2500, stock: 5 },
        { id: 3, name: "Producto 3", price: 500, stock: 20 },
      ];
      this.populateProductSelect();
    }
  }

  async loadClients() {
    try {
      // TODO: Conectar con API de clientes
      const response = await fetch("http://localhost:3000/clients", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        this.clients = await response.json();
      }
    } catch (error) {
      console.warn("⚠️ [SalesForm] No se pudieron cargar clientes");
      this.clients = [];
    }
  }

  populateProductSelect() {
    const select = document.getElementById("producto-select");
    select.innerHTML = '<option value="">Selecciona un producto...</option>';

    this.products.forEach((product) => {
      const option = document.createElement("option");
      option.value = product.id;
      option.textContent = `${product.name} - $${product.price} (Stock: ${product.stock})`;
      option.dataset.product = JSON.stringify(product);
      select.appendChild(option);
    });
  }

  onModalOpen() {
    this.checkCashStatus();
    this.resetForm();
  }

  checkCashStatus() {
    const alert = document.getElementById("cash-status-alert");
    const statusText = document.getElementById("cash-status-text");

    if (window.cashCard) {
      const state = window.cashCard.getState();
      if (state.isOpen) {
        alert.className = "alert alert-success";
        statusText.innerHTML = `<strong>Caja abierta</strong> - Operador: ${state.operator} - Efectivo: $${state.currentAmount}`;
        alert.classList.remove("d-none");
      } else {
        alert.className = "alert alert-danger";
        statusText.innerHTML =
          "<strong>Caja cerrada</strong> - Debe abrir la caja antes de registrar ventas";
        alert.classList.remove("d-none");
      }
    } else {
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
    const selectedOption = select.querySelector(`option[value="${productId}"]`);

    if (selectedOption && selectedOption.dataset.product) {
      const product = JSON.parse(selectedOption.dataset.product);
      this.addProductRow(product);
      select.value = ""; // Reset select
    }
  }

  addProductRow(product = null) {
    const container = document.getElementById("productos-container");

    // Remover mensaje de "no hay productos"
    if (container.querySelector(".text-center.text-muted")) {
      container.innerHTML = "";
    }

    const productId = product ? product.id : Date.now();
    const productName = product ? product.name : "";
    const price = product ? product.price : 0;
    const maxStock = product ? product.stock : 999;

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

    // Event listeners para la nueva fila
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
      subtotalInput.value = `$${subtotal.toFixed(2)}`;

      this.calculateTotal();
    };

    quantityInput.addEventListener("input", updateSubtotal);
    priceInput.addEventListener("input", updateSubtotal);

    removeBtn.addEventListener("click", () => {
      row.remove();
      this.calculateTotal();
      this.checkEmptyProducts();
    });
  }

  checkEmptyProducts() {
    const container = document.getElementById("productos-container");
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
      const subtotalText = row.querySelector(".product-subtotal").value;
      const subtotal = parseFloat(subtotalText.replace("$", "")) || 0;
      total += subtotal;
    });

    document.getElementById("total-venta").textContent = `$${total.toFixed(2)}`;
    return total;
  }

  getSaleData() {
    const productRows = document.querySelectorAll(".product-row");
    const products = [];

    productRows.forEach((row) => {
      const name = row.querySelector(".product-name").value;
      const price = parseFloat(row.querySelector(".product-price").value) || 0;
      const quantity =
        parseInt(row.querySelector(".product-quantity").value) || 0;

      if (name && price > 0 && quantity > 0) {
        products.push({
          name,
          price,
          quantity,
          subtotal: price * quantity,
        });
      }
    });

    return {
      client: document.getElementById("cliente").value || null,
      isCredit: document.getElementById("cuenta-corriente").checked,
      paymentMethod: document.getElementById("metodo").value,
      products,
      total: this.calculateTotal(),
      date: new Date().toISOString(),
    };
  }

  async confirmSale() {
    try {
      // Verificar estado de caja
      if (!window.cashCard || !window.cashCard.getState().isOpen) {
        alert("❌ La caja debe estar abierta para registrar ventas");
        return;
      }

      const saleData = this.getSaleData();

      // Validaciones
      if (saleData.products.length === 0) {
        alert("❌ Agregue al menos un producto a la venta");
        return;
      }

      if (saleData.total <= 0) {
        alert("❌ El total de la venta debe ser mayor a 0");
        return;
      }

      // Mostrar loading
      const submitBtn = document.getElementById("submit-venta");
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML =
        '<i class="material-icons me-1">hourglass_empty</i> Procesando...';
      submitBtn.disabled = true;

      console.log("🔄 [SalesForm] Enviando venta:", saleData);

      // TODO: Conectar con API de ventas
      const response = await fetch("http://localhost:3000/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(saleData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ [SalesForm] Venta registrada:", result);

        alert("✅ Venta registrada exitosamente!");
        this.modal.hide();

        // Recargar estado de caja y dashboard
        if (window.cashCard) await window.cashCard.refresh();
        if (window.dashboardPage) await window.dashboardPage.refresh();
      } else {
        throw new Error("Error del servidor al registrar venta");
      }
    } catch (error) {
      console.error("❌ [SalesForm] Error registrando venta:", error);
      alert(`❌ Error al registrar venta: ${error.message}`);
    } finally {
      // Restaurar botón
      const submitBtn = document.getElementById("submit-venta");
      submitBtn.innerHTML =
        '<i class="material-icons me-1">check_circle</i> Confirmar Venta';
      submitBtn.disabled = false;
    }
  }

  resetForm() {
    document.getElementById("cliente").value = "";
    document.getElementById("cuenta-corriente").checked = false;
    document.getElementById("metodo").value = "cash";
    document.getElementById("productos-container").innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="material-icons mb-2">shopping_basket</i>
                <p>No hay productos agregados</p>
            </div>
        `;
    document.getElementById("total-venta").textContent = "$0.00";
    this.selectedProducts = [];
  }

  open() {
    if (!this.isInitialized) {
      this.init();
    }
    this.modal.show();
  }

  close() {
    if (this.modal) {
      this.modal.hide();
    }
  }
}

// ✅ FUNCIÓN GLOBAL PARA INTEGRAR CON TU CASH-CARD
function mostrarFormularioVentas() {
  if (!window.salesForm) {
    window.salesForm = new SalesForm();
    window.salesForm.init().then(() => {
      window.salesForm.open();
    });
  } else {
    window.salesForm.open();
  }
}

// ✅ INICIALIZACIÓN AUTOMÁTICA
document.addEventListener("DOMContentLoaded", () => {
  // Crear instancia global
  window.salesForm = new SalesForm();

  // Inicializar cuando se necesite
  window.mostrarFormularioVentas = mostrarFormularioVentas;

  console.log("🛒 [SalesForm] Listo para usar - Función global disponible");
});

export default SalesForm;
