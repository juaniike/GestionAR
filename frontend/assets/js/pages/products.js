// assets/js/products.js - CORREGIDO SIN /api
let productsData = [];
let currentEditingId = null;

// Inicializar cuando se carga la página
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔄 Inicializando sistema de productos...");
  initProducts();
});

async function initProducts() {
  await loadComponents();
  initProductsEvents();
  await loadProductsData();
}

async function loadComponents() {
  try {
    // Cargar navbar y footer
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
    const user = getUserWithToken();
    if (!user?.token) {
      showProductsError("Usuario no autenticado. Por favor, inicia sesión.");
      return;
    }

    console.log("🔄 Cargando datos de productos...");
    const response = await fetch("http://localhost:3000/products", {
      // ✅ SIN /api
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("🔍 Status de respuesta:", response.status);

    if (response.status === 401) {
      showProductsError("Sesión expirada. Por favor, vuelve a iniciar sesión.");
      return;
    }

    if (response.status === 403) {
      showProductsError("No tienes permisos para ver productos.");
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const products = await response.json();
    console.log(`📦 ${products.length} productos cargados`);

    // ✅ Asegurar que los números sean números
    productsData = products.map((p) => ({
      ...p,
      cost: parseFloat(p.cost) || 0,
      price: parseFloat(p.price) || 0,
      stock: parseInt(p.stock) || 0,
      minstock: parseInt(p.minstock) || 5,
    }));

    updateProductsSummary();
    renderProductsTable();
    updateCategoryFilter();
  } catch (error) {
    console.error("❌ Error cargando productos:", error);
    showProductsError("Error de conexión con el servidor");
  }
}

// ✅ FUNCIÓN AUXILIAR PARA OBTENER USUARIO
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

function updateProductsSummary() {
  const elements = {
    critical: document.getElementById("critical-stock"),
    outOfStock: document.getElementById("out-of-stock"),
    stable: document.getElementById("stable-stock"),
    overStock: document.getElementById("over-stock"),
    inventory: document.getElementById("inventory-value"),
  };

  // Reiniciar contadores
  let critical = 0,
    outOfStock = 0,
    stable = 0,
    overStock = 0;
  let totalValue = 0;

  productsData.forEach((p) => {
    const stock = p.stock || 0;
    const minStock = p.minstock || 5;
    const maxNormalStock = minStock * 3; // 300% del mínimo

    if (stock === 0) {
      outOfStock++;
    } else if (stock <= minStock) {
      critical++;
    } else if (stock <= maxNormalStock) {
      stable++;
    } else {
      overStock++;
    }

    // Calcular valor del inventario (stock * costo)
    totalValue += stock * (p.cost || 0);
  });

  // Actualizar UI
  if (elements.critical) elements.critical.textContent = critical;
  if (elements.outOfStock) elements.outOfStock.textContent = outOfStock;
  if (elements.stable) elements.stable.textContent = stable;
  if (elements.overStock) elements.overStock.textContent = overStock;
  if (elements.inventory)
    elements.inventory.textContent = `$${totalValue.toFixed(2)}`;

  console.log("📊 Resumen de stock actualizado:", {
    critical,
    outOfStock,
    stable,
    overStock,
    totalValue,
  });
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
    const stockStatus = getStockStatus(product);

    html += `
      <tr>
        <td>
          <div class="d-flex px-2 py-1">
            <div class="d-flex flex-column justify-content-center">
              <h6 class="mb-0 text-sm">${product.name || "Sin nombre"}</h6>
            </div>
          </div>
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">${
            product.category || "Sin categoría"
          }</p>
        </td>
        <td>
          <p class="text-xs text-secondary mb-0">${product.barcode || "N/A"}</p>
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0">$${(
            product.price || 0
          ).toFixed(2)}</p>
        </td>
        <td>
          <p class="text-xs font-weight-bold mb-0 ${stockStatus.class}">${
      product.stock || 0
    }</p>
        </td>
        <td>
          <p class="text-xs text-secondary mb-0">${product.minstock || 5}</p>
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
    tableInfo.textContent = `${productsToShow.length} de ${productsData.length} productos`;
  }

  // Agregar eventos a los botones
  initTableEvents();

  console.log("✅ Tabla de productos renderizada");
}

// ✅ FUNCIÓN MEJORADA PARA ESTADO DE STOCK
function getStockStatus(product) {
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
      const stockStatus = getStockStatus(product)
        .text.toLowerCase()
        .replace(" ", "");
      const filterStatus = stockFilter.toLowerCase();
      matchesStock = stockStatus.includes(filterStatus);
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
    const user = getUserWithToken();
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
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("product-form-modal")
    );
    modal.hide();

    await loadProductsData();

    // ✅ ACTUALIZAR STOCK CARD
    await refreshStockCard();

    // ✅ NUEVO: ACTUALIZAR CASH CARD
    if (typeof window.recargarEstadoCaja === "function") {
      await window.recargarEstadoCaja();
      console.log("💰 Estado de caja actualizado después de guardar producto");
    }

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
    const user = getUserWithToken();
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

    // ✅ ACTUALIZAR STOCK CARD
    await refreshStockCard();

    // ✅ NUEVO: ACTUALIZAR CASH CARD
    if (typeof window.recargarEstadoCaja === "function") {
      await window.recargarEstadoCaja();
      console.log("💰 Estado de caja actualizado después de eliminar producto");
    }

    console.log("✅ Producto eliminado correctamente");
  } catch (error) {
    console.error("❌ Error eliminando producto:", error);
    alert("Error: " + error.message);
  }
}

function showProductsError(message = "Error cargando productos") {
  const tbody = document.getElementById("products-table-body");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-danger">
          <i class="material-icons me-2">error</i>
          ${message}
        </td>
      </tr>
    `;
  }
}

async function refreshStockCard() {
  if (window.stockCard && typeof window.stockCard.refresh === "function") {
    await window.stockCard.refresh();
    console.log("🔄 Stock card actualizada desde products");
  }
}

function editProduct(productId) {
  openProductForm(productId);
}

window.openProductForm = openProductForm;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
