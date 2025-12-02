// assets/js/controllers/products.controller.js
import { showAlert, showConfirm } from "../plugins/alerts.js";

class ProductsController {
  constructor(productsService, authService, dashboardService) {
    this.productsService = productsService;
    this.authService = authService;
    this.dashboardService = dashboardService;

    this.productsData = [];
    this.currentEditingId = null;
    this.eventListeners = [];
    this.currentFilters = {
      search: "",
      category: "",
      stock: "",
    };

    console.log(
      "📦 [ProductsController] Controlador de productos inicializado"
    );
  }

  async init() {
    console.log("🚀 [ProductsController] Inicializando módulo de productos...");

    const user = this.authService.getUser();
    if (!user) {
      this.showError("Usuario no autenticado");
      return;
    }

    try {
      // Cargar componentes estructurales
      await this.loadComponents();

      // Configurar eventos
      this.initProductsEvents();

      // Cargar datos
      await this.loadProductsData();

      console.log(
        "✅ [ProductsController] Módulo de productos inicializado correctamente"
      );
    } catch (error) {
      console.error("❌ [ProductsController] Error inicializando:", error);
      this.showError("Error al cargar el módulo de productos");
    }
  }

  async loadComponents() {
    try {
      await Promise.all([
        this.loadComponent("sidenav-container", "./components/sidenav.html"),
        this.loadComponent("navbar-container", "./components/navbar.html"),
        this.loadComponent("footer-container", "./components/footer.html"),
      ]);
      console.log("✅ [ProductsController] Componentes cargados");
    } catch (error) {
      console.error(
        "❌ [ProductsController] Error cargando componentes:",
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
      console.error(`❌ [ProductsController] Error cargando ${id}:`, error);
    }
  }

  initProductsEvents() {
    this.cleanupEventListeners();

    // Botón agregar producto
    this.setupButton("btn-add-product", () => this.openProductForm());

    // Botón guardar producto
    this.setupButton("save-product", () => this.saveProduct());

    // Búsqueda y filtros
    this.setupInput("search-products", "input", (e) => {
      this.currentFilters.search = e.target.value.toLowerCase();
      this.filterProducts();
    });

    this.setupInput("filter-category", "change", (e) => {
      this.currentFilters.category = e.target.value;
      this.filterProducts();
    });

    this.setupInput("filter-stock", "change", (e) => {
      this.currentFilters.stock = e.target.value;
      this.filterProducts();
    });

    console.log("✅ [ProductsController] Eventos configurados");
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

  async loadProductsData() {
    try {
      console.log("🔄 [ProductsController] Cargando datos de productos...");

      this.productsData = await this.productsService.getAllProducts();

      // ✅ Asegurar que los números sean números
      this.productsData = this.productsData.map((p) => ({
        ...p,
        cost: parseFloat(p.cost) || 0,
        price: parseFloat(p.price) || 0,
        stock: parseInt(p.stock) || 0,
        minstock: parseInt(p.minstock) || 5,
      }));

      this.updateProductsSummary();
      this.renderProductsTable();
      this.updateCategoryFilter();

      console.log(
        `✅ [ProductsController] ${this.productsData.length} productos cargados`
      );
    } catch (error) {
      console.error("❌ [ProductsController] Error cargando productos:", error);
      this.showError("Error de conexión con el servidor");
      this.productsData = [];
      this.renderProductsTable();
    }
  }

  updateProductsSummary() {
    const elements = {
      critical: document.getElementById("critical-stock"),
      outOfStock: document.getElementById("out-of-stock"),
      stable: document.getElementById("stable-stock"),
      overStock: document.getElementById("over-stock"),
      inventory: document.getElementById("inventory-value"),
    };

    let critical = 0,
      outOfStock = 0,
      stable = 0,
      overStock = 0;
    let totalValue = 0;

    this.productsData.forEach((p) => {
      const stock = p.stock || 0;
      const minStock = p.minstock || 5;
      const maxNormalStock = minStock * 3;

      if (stock === 0) {
        outOfStock++;
      } else if (stock <= minStock) {
        critical++;
      } else if (stock <= maxNormalStock) {
        stable++;
      } else {
        overStock++;
      }

      totalValue += stock * (p.cost || 0);
    });

    // Actualizar UI
    if (elements.critical) elements.critical.textContent = critical;
    if (elements.outOfStock) elements.outOfStock.textContent = outOfStock;
    if (elements.stable) elements.stable.textContent = stable;
    if (elements.overStock) elements.overStock.textContent = overStock;
    if (elements.inventory) {
      elements.inventory.textContent = `$${totalValue.toFixed(2)}`;
    }

    console.log("📊 [ProductsController] Resumen de stock actualizado");
  }

  renderProductsTable(filteredProducts = null) {
    const tbody = document.getElementById("products-table-body");
    const tableInfo = document.getElementById("table-info");

    if (!tbody) return;

    const productsToShow = filteredProducts || this.productsData;

    if (productsToShow.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4 text-muted">
                        <i class="material-icons me-2">search_off</i>
                        No se encontraron productos
                    </td>
                </tr>
            `;
      if (tableInfo) tableInfo.textContent = "0 productos encontrados";
      return;
    }

    let html = "";
    productsToShow.forEach((product) => {
      const stockStatus = this.getStockStatus(product);

      html += `
                <tr>
                    <td>
                        <div class="d-flex px-2 py-1">
                            <div class="d-flex flex-column justify-content-center">
                                <h6 class="mb-0 text-sm">${
                                  product.name || "Sin nombre"
                                }</h6>
                            </div>
                        </div>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0">${
                          product.category || "Sin categoría"
                        }</p>
                    </td>
                    <td>
                        <p class="text-xs text-secondary mb-0">${
                          product.barcode || "N/A"
                        }</p>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0">$${(
                          product.price || 0
                        ).toFixed(2)}</p>
                    </td>
                    <td>
                        <p class="text-xs font-weight-bold mb-0 ${
                          stockStatus.class
                        }">${product.stock || 0}</p>
                    </td>
                    <td>
                        <p class="text-xs text-secondary mb-0">${
                          product.minstock || 5
                        }</p>
                    </td>
                    <td>
                        <span class="badge badge-sm ${stockStatus.badgeClass}">
                            <i class="material-icons me-1" style="font-size: 12px">${
                              stockStatus.icon
                            }</i>
                            ${stockStatus.text}
                        </span>
                    </td>
                    <td class="align-middle">
                        <button type="button" class="btn btn-sm btn-outline-info me-1 edit-product" data-id="${
                          product.id
                        }">
                            <i class="material-icons" style="font-size: 16px">edit</i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-danger delete-product" data-id="${
                          product.id
                        }">
                            <i class="material-icons" style="font-size: 16px">delete</i>
                        </button>
                    </td>
                </tr>
            `;
    });

    tbody.innerHTML = html;

    if (tableInfo) {
      tableInfo.textContent = `${productsToShow.length} de ${this.productsData.length} productos`;
    }

    this.initTableEvents();
    console.log("✅ [ProductsController] Tabla de productos renderizada");
  }

  getStockStatus(product) {
    const stock = product.stock || 0;
    const minStock = product.minstock || 5;
    const maxNormalStock = minStock * 3;

    if (stock === 0) {
      return {
        class: "text-danger",
        badgeClass: "bg-gradient-danger",
        icon: "cancel",
        text: "Sin Stock",
      };
    } else if (stock <= minStock) {
      return {
        class: "text-warning",
        badgeClass: "bg-gradient-warning",
        icon: "warning",
        text: "Stock Crítico",
      };
    } else if (stock <= maxNormalStock) {
      return {
        class: "text-success",
        badgeClass: "bg-gradient-success",
        icon: "check_circle",
        text: "Stock Estable",
      };
    } else {
      return {
        class: "text-info",
        badgeClass: "bg-gradient-info",
        icon: "inventory",
        text: "Sobre-Stock",
      };
    }
  }

  initTableEvents() {
    // Botones editar
    document.querySelectorAll(".edit-product").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const productId = e.currentTarget.getAttribute("data-id");
        this.editProduct(productId);
      });
    });

    // Botones eliminar
    document.querySelectorAll(".delete-product").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const productId = e.currentTarget.getAttribute("data-id");
        this.deleteProduct(productId);
      });
    });
  }

  filterProducts() {
    const filtered = this.productsData.filter((product) => {
      // Filtro de búsqueda
      const matchesSearch =
        !this.currentFilters.search ||
        product.name?.toLowerCase().includes(this.currentFilters.search) ||
        product.barcode?.toLowerCase().includes(this.currentFilters.search) ||
        product.category?.toLowerCase().includes(this.currentFilters.search);

      // Filtro de categoría
      const matchesCategory =
        !this.currentFilters.category ||
        product.category === this.currentFilters.category;

      // Filtro de stock
      let matchesStock = true;
      if (this.currentFilters.stock) {
        const stockStatus = this.getStockStatus(product)
          .text.toLowerCase()
          .replace(" ", "");
        const filterStatus = this.currentFilters.stock.toLowerCase();
        matchesStock = stockStatus.includes(filterStatus);
      }

      return matchesSearch && matchesCategory && matchesStock;
    });

    this.renderProductsTable(filtered);
  }

  updateCategoryFilter() {
    const categoryFilter = document.getElementById("filter-category");
    if (!categoryFilter) return;

    // Obtener categorías únicas
    const categories = [
      ...new Set(this.productsData.map((p) => p.category).filter(Boolean)),
    ];

    // Limpiar opciones excepto la primera
    while (categoryFilter.children.length > 1) {
      categoryFilter.removeChild(categoryFilter.lastChild);
    }

    // Agregar categorías
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    console.log("✅ [ProductsController] Filtro de categorías actualizado");
  }

  openProductForm(productId = null) {
    const modal = new bootstrap.Modal(
      document.getElementById("product-form-modal")
    );
    const title = document.getElementById("product-modal-title");
    const form = document.getElementById("product-form");

    this.currentEditingId = productId;

    if (productId) {
      // Modo edición
      title.textContent = "Editar Producto";
      const product = this.productsData.find((p) => p.id == productId);
      if (product) {
        document.getElementById("product-id").value = product.id;
        document.getElementById("product-name").value = product.name || "";
        document.getElementById("product-category").value =
          product.category || "";
        document.getElementById("product-barcode").value =
          product.barcode || "";
        document.getElementById("product-price").value = product.price || "";
        document.getElementById("product-cost").value = product.cost || "";
        document.getElementById("product-stock").value = product.stock || "";
        document.getElementById("product-minstock").value =
          product.minstock || "";
      }
    } else {
      // Modo creación
      title.textContent = "Agregar Producto";
      form.reset();
      document.getElementById("product-id").value = "";
    }

    modal.show();
  }

  async saveProduct() {
    try {
      const formData = {
        name: document.getElementById("product-name").value,
        category: document.getElementById("product-category").value,
        barcode: document.getElementById("product-barcode").value,
        price: parseFloat(document.getElementById("product-price").value),
        cost: parseFloat(document.getElementById("product-cost").value),
        stock: parseInt(document.getElementById("product-stock").value),
        minstock: parseInt(document.getElementById("product-minstock").value),
      };

      // Validaciones básicas
      if (!formData.name) throw new Error("El nombre es requerido");
      if (formData.price < 0)
        throw new Error("El precio debe ser mayor o igual a 0");
      if (formData.cost < 0)
        throw new Error("El costo debe ser mayor o igual a 0");
      if (formData.stock < 0)
        throw new Error("El stock debe ser mayor o igual a 0");
      if (formData.minstock < 1)
        throw new Error("El stock mínimo debe ser al menos 1");

      let savedProduct;
      if (this.currentEditingId) {
        // Actualizar
        savedProduct = await this.productsService.updateProduct(
          this.currentEditingId,
          formData
        );
        showAlert("✅ Producto actualizado correctamente", "success");
      } else {
        // Crear
        savedProduct = await this.productsService.createProduct(formData);
        showAlert("✅ Producto creado correctamente", "success");
      }

      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("product-form-modal")
      );
      modal.hide();

      // Recargar datos
      await this.loadProductsData();

      // Refrescar dashboard si está disponible
      this.refreshDashboard();

      console.log(
        `✅ [ProductsController] Producto ${
          this.currentEditingId ? "actualizado" : "creado"
        } correctamente`
      );
    } catch (error) {
      console.error("❌ [ProductsController] Error guardando producto:", error);
      showAlert(`Error: ${error.message}`, "error");
    }
  }

  async deleteProduct(productId) {
    const confirmed = await showConfirm(
      "¿Estás seguro de que quieres eliminar este producto?",
      () => {}, // confirm callback
      () => {} // cancel callback
    );

    if (!confirmed) return;

    try {
      await this.productsService.deleteProduct(productId);

      showAlert("✅ Producto eliminado correctamente", "success");

      // Recargar datos
      await this.loadProductsData();

      // Refrescar dashboard si está disponible
      this.refreshDashboard();

      console.log("✅ [ProductsController] Producto eliminado correctamente");
    } catch (error) {
      console.error(
        "❌ [ProductsController] Error eliminando producto:",
        error
      );
      showAlert(`Error: ${error.message}`, "error");
    }
  }

  refreshDashboard() {
    // Disparar evento para refrescar dashboard
    window.dispatchEvent(new CustomEvent("productsUpdated"));

    // También refrescar datos del dashboard service
    if (this.dashboardService) {
      this.dashboardService.clearCache();
    }
  }

  editProduct(productId) {
    this.openProductForm(productId);
  }

  showError(message) {
    console.error("❌ [ProductsController] Error:", message);
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
    this.productsData = [];
    this.currentEditingId = null;

    console.log("🧹 [ProductsController] Controlador destruido");
  }
}

export default ProductsController;
