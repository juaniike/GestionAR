// assets/js/products.js - SISTEMA MODULARIZADO DE PRODUCTOS
let productsPanel = null;
let productsData = [];
let currentEditingId = null;

export async function initProductsPanel() {
  console.log("🔄 Inicializando panel de productos...");

  // Cargar el panel HTML
  await loadProductsPanel();

  // Inicializar eventos
  initProductsEvents();

  // Cargar datos iniciales
  await loadProductsData();

  console.log("✅ Panel de productos inicializado");
}

async function loadProductsPanel() {
  try {
    const response = await fetch("components/products-panel.html");
    const html = await response.text();

    // Crear contenedor para el panel
    productsPanel = document.createElement("div");
    productsPanel.id = "products-panel-container";
    productsPanel.innerHTML = html;
    productsPanel.style.display = "none";

    // Insertar después del navbar
    const navbar = document.getElementById("navbar-container");
    navbar.parentNode.insertBefore(productsPanel, navbar.nextSibling);

    console.log("✅ Panel de productos cargado");
  } catch (error) {
    console.error("❌ Error cargando panel de productos:", error);
  }
}

function initProductsEvents() {
  // Botón agregar producto
  const addBtn = document.getElementById("btn-add-product");
  if (addBtn) {
    addBtn.addEventListener("click", () => openProductForm());
  }

  // Botón guardar producto
  const saveBtn = document.getElementById("save-product");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => saveProduct());
  }

  // Búsqueda y filtros
  const searchInput = document.getElementById("search-products");
  const categoryFilter = document.getElementById("filter-category");
  const stockFilter = document.getElementById("filter-stock");

  if (searchInput) searchInput.addEventListener("input", filterProducts);
  if (categoryFilter) categoryFilter.addEventListener("change", filterProducts);
  if (stockFilter) stockFilter.addEventListener("change", filterProducts);

  console.log("✅ Eventos de productos inicializados");
}

async function loadProductsData() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) throw new Error("Usuario no autenticado");

    const response = await fetch("http://localhost:3000/products", {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    productsData = await response.json();
    console.log(`📦 ${productsData.length} productos cargados`);

    updateProductsSummary();
    renderProductsTable();
    updateCategoryFilter();
  } catch (error) {
    console.error("❌ Error cargando productos:", error);
    showProductsError();
  }
}

function updateProductsSummary() {
  const totalProducts = document.getElementById("total-products");
  const lowStockCount = document.getElementById("low-stock-count");
  const outOfStockCount = document.getElementById("out-of-stock-count");
  const inventoryValue = document.getElementById("inventory-value");

  if (!totalProducts) return;

  // Calcular métricas
  const total = productsData.length;
  const lowStock = productsData.filter(
    (p) => (p.stock || 0) <= (p.minstock || 5) && (p.stock || 0) > 0
  ).length;
  const outOfStock = productsData.filter((p) => (p.stock || 0) === 0).length;
  const totalValue = productsData.reduce(
    (sum, p) => sum + (p.stock || 0) * (p.cost || 0),
    0
  );

  // Actualizar UI
  totalProducts.textContent = total;
  lowStockCount.textContent = lowStock;
  outOfStockCount.textContent = outOfStock;
  inventoryValue.textContent = `$${totalValue.toFixed(2)}`;

  console.log("✅ Resumen de productos actualizado");
}

function renderProductsTable(filteredProducts = null) {
  const tbody = document.getElementById("products-table-body");
  const tableInfo = document.getElementById("table-info");

  if (!tbody) return;

  const productsToShow = filteredProducts || productsData;

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
    const stock = product.stock || 0;
    const minStock = product.minstock || 5;
    let statusClass = "success";
    let statusText = "Normal";
    let statusIcon = "check_circle";

    if (stock === 0) {
      statusClass = "danger";
      statusText = "Sin Stock";
      statusIcon = "cancel";
    } else if (stock <= minStock) {
      statusClass = "warning";
      statusText = "Stock Bajo";
      statusIcon = "warning";
    }

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
                      stock === 0 ? "text-danger" : ""
                    }">${stock}</p>
                </td>
                <td>
                    <p class="text-xs text-secondary mb-0">${minStock}</p>
                </td>
                <td>
                    <span class="badge badge-sm bg-gradient-${statusClass}">
                        <i class="material-icons me-1" style="font-size: 12px">${statusIcon}</i>
                        ${statusText}
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
    tableInfo.textContent = `${productsToShow.length} de ${productsData.length} productos`;
  }

  // Agregar eventos a los botones
  initTableEvents();

  console.log("✅ Tabla de productos renderizada");
}

function initTableEvents() {
  // Botones editar
  document.querySelectorAll(".edit-product").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const productId = e.currentTarget.getAttribute("data-id");
      editProduct(productId);
    });
  });

  // Botones eliminar
  document.querySelectorAll(".delete-product").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const productId = e.currentTarget.getAttribute("data-id");
      deleteProduct(productId);
    });
  });
}

function filterProducts() {
  const searchTerm =
    document.getElementById("search-products")?.value.toLowerCase() || "";
  const categoryFilter =
    document.getElementById("filter-category")?.value || "";
  const stockFilter = document.getElementById("filter-stock")?.value || "";

  let filtered = productsData.filter((product) => {
    // Filtro de búsqueda
    const matchesSearch =
      !searchTerm ||
      product.name?.toLowerCase().includes(searchTerm) ||
      product.barcode?.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm);

    // Filtro de categoría
    const matchesCategory =
      !categoryFilter || product.category === categoryFilter;

    // Filtro de stock
    let matchesStock = true;
    if (stockFilter) {
      const stock = product.stock || 0;
      const minStock = product.minstock || 5;

      if (stockFilter === "low") {
        matchesStock = stock > 0 && stock <= minStock;
      } else if (stockFilter === "out") {
        matchesStock = stock === 0;
      } else if (stockFilter === "normal") {
        matchesStock = stock > minStock;
      }
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  renderProductsTable(filtered);
}

function updateCategoryFilter() {
  const categoryFilter = document.getElementById("filter-category");
  if (!categoryFilter) return;

  // Obtener categorías únicas
  const categories = [
    ...new Set(productsData.map((p) => p.category).filter(Boolean)),
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

  console.log("✅ Filtro de categorías actualizado");
}

function openProductForm(productId = null) {
  const modal = new bootstrap.Modal(
    document.getElementById("product-form-modal")
  );
  const title = document.getElementById("product-modal-title");
  const form = document.getElementById("product-form");

  currentEditingId = productId;

  if (productId) {
    // Modo edición
    title.textContent = "Editar Producto";
    const product = productsData.find((p) => p.id == productId);
    if (product) {
      document.getElementById("product-id").value = product.id;
      document.getElementById("product-name").value = product.name || "";
      document.getElementById("product-category").value =
        product.category || "";
      document.getElementById("product-barcode").value = product.barcode || "";
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

async function saveProduct() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) throw new Error("Usuario no autenticado");

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

    let response;
    if (currentEditingId) {
      // Actualizar
      response = await fetch(
        `http://localhost:3000/products/${currentEditingId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );
    } else {
      // Crear
      response = await fetch("http://localhost:3000/products", {
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
      throw new Error(errorData.message || "Error guardando producto");
    }

    const savedProduct = await response.json();

    // Cerrar modal y recargar datos
    bootstrap.Modal.getInstance(
      document.getElementById("product-form-modal")
    ).hide();
    await loadProductsData();

    console.log(
      `✅ Producto ${currentEditingId ? "actualizado" : "creado"} correctamente`
    );
  } catch (error) {
    console.error("❌ Error guardando producto:", error);
    alert("Error: " + error.message);
  }
}

async function deleteProduct(productId) {
  if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) {
    return;
  }

  try {
    const user = JSON.parse(sessionStorage.getItem("user"));
    if (!user?.token) throw new Error("Usuario no autenticado");

    const response = await fetch(
      `http://localhost:3000/products/${productId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error eliminando producto");
    }

    await loadProductsData();
    console.log("✅ Producto eliminado correctamente");
  } catch (error) {
    console.error("❌ Error eliminando producto:", error);
    alert("Error: " + error.message);
  }
}

function showProductsError() {
  const tbody = document.getElementById("products-table-body");
  if (tbody) {
    tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-danger">
                    <i class="material-icons me-2">error</i>
                    Error cargando productos
                </td>
            </tr>
        `;
  }
}

// FUNCIONES INTERNAS PARA EL GESTOR DE VISTAS
function showProductsPanel() {
  console.log("🔄 Mostrando panel de productos...");
  if (productsPanel) {
    productsPanel.style.display = "block";
    loadProductsData();
    console.log("✅ Panel de productos mostrado");
  }
  return Promise.resolve();
}

function hideProductsPanel() {
  console.log("🔄 Ocultando panel de productos...");
  if (productsPanel) {
    productsPanel.style.display = "none";
    console.log("✅ Panel de productos ocultado");
  }
  return Promise.resolve();
}

// Hacer disponibles globalmente para navigation.js
window.showProductsPanel = showProductsPanel;
window.hideProductsPanel = hideProductsPanel;
