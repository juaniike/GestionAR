// sales-form.js - VERSIÓN COMPATIBLE CON TU BACKEND
let isSalesFormInitialized = false;
let productosDisponibles = [];

export async function initSalesForm() {
  if (isSalesFormInitialized) return;
  isSalesFormInitialized = true;

  const ventaForm = document.getElementById("venta-form");
  if (!ventaForm) {
    console.error("❌ Formulario de ventas no encontrado en el DOM");
    return;
  }

  const closeBtn = ventaForm.querySelector(".venta-form-close");
  const productosContainer = document.getElementById("productos-container");
  const totalSpan = document.getElementById("total-venta");
  const addProductBtn = document.getElementById("add-product");
  const submitBtn = document.getElementById("submit-venta");

  if (
    !closeBtn ||
    !productosContainer ||
    !totalSpan ||
    !addProductBtn ||
    !submitBtn
  ) {
    console.error("❌ Elementos del formulario de ventas no encontrados");
    return;
  }

  console.log("🎯 Formulario de ventas inicializado");

  // ✅ CARGAR PRODUCTOS DEL BACKEND
  async function cargarProductos() {
    try {
      const user = getUserWithToken();
      if (!user || !user.token) {
        throw new Error("Usuario no autenticado");
      }

      const response = await fetch("http://localhost:3000/api/products", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status} al cargar productos`);
      }

      const products = await response.json();
      productosDisponibles = Array.isArray(products) ? products : [];
      console.log("✅ Productos cargados:", productosDisponibles.length);

      actualizarSelectsProductos();
    } catch (error) {
      console.error("❌ Error cargando productos:", error);
      productosDisponibles = [];
    }
  }

  function actualizarSelectsProductos() {
    const selects = document.querySelectorAll(".producto-select");
    selects.forEach((select) => {
      const currentValue = select.value;

      select.innerHTML = `
        <option value="">Seleccionar producto</option>
        ${productosDisponibles
          .map((producto) => {
            const stock = producto.stock || 0;
            const precio = producto.price || 0;
            const stockClass =
              stock === 0
                ? "option-no-stock"
                : stock <= (producto.minstock || 5)
                ? "option-low-stock"
                : "";

            return `<option value="${producto.id}" 
                    data-precio="${precio}" 
                    data-stock="${stock}"
                    class="${stockClass}">
            ${producto.name} - $${precio.toFixed(2)} (Stock: ${stock})
          </option>`;
          })
          .join("")}
      `;

      if (currentValue) {
        select.value = currentValue;
      }
    });
  }

  // ✅ FUNCIÓN PARA MOSTRAR FORMULARIO
  async function mostrarFormulario() {
    await cargarProductos();
    ventaForm.classList.remove("venta-form-overlay--hidden");
    ventaForm.classList.add("venta-form-overlay--visible");
    console.log("✅ Formulario de ventas mostrado");
  }

  // ✅ FUNCIÓN PARA CERRAR FORMULARIO
  function cerrarFormulario() {
    ventaForm.classList.remove("venta-form-overlay--visible");
    ventaForm.classList.add("venta-form-overlay--hidden");
    resetFormulario();
    console.log("✅ Formulario de ventas cerrado y reseteado");
  }

  // ✅ FUNCIÓN PARA RESETEAR FORMULARIO
  function resetFormulario() {
    productosContainer.innerHTML = "";
    crearProductoRow();
    document.getElementById("cliente").value = "";
    document.getElementById("cuenta-corriente").checked = false;
    document.getElementById("metodo").value = "efectivo";
    totalSpan.textContent = "$0.00";
  }

  // ✅ ASIGNAR EVENTOS
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cerrarFormulario();
  });

  ventaForm.addEventListener("click", (e) => {
    if (e.target === ventaForm) {
      cerrarFormulario();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      ventaForm.classList.contains("venta-form-overlay--visible")
    ) {
      cerrarFormulario();
    }
  });

  // ✅ FUNCIONES DE PRODUCTOS
  function calcularTotal() {
    let total = 0;
    productosContainer.querySelectorAll(".producto-item").forEach((row) => {
      const cantidad =
        parseFloat(row.querySelector(".producto-cantidad").value) || 0;
      const precio =
        parseFloat(row.querySelector(".producto-precio").value) || 0;
      total += cantidad * precio;
    });
    totalSpan.textContent = `$${total.toFixed(2)}`;
  }

  function crearProductoRow() {
    const productoId = `producto-${Date.now()}`;
    const row = document.createElement("div");
    row.className = "producto-item";
    row.id = productoId;

    row.innerHTML = `
      <select class="producto-select" required>
        <option value="">Seleccionar producto</option>
        ${productosDisponibles
          .map((producto) => {
            const stock = producto.stock || 0;
            const precio = producto.price || 0;
            const stockClass =
              stock === 0
                ? "option-no-stock"
                : stock <= (producto.minstock || 5)
                ? "option-low-stock"
                : "";

            return `<option value="${producto.id}" 
                    data-precio="${precio}" 
                    data-stock="${stock}"
                    class="${stockClass}">
            ${producto.name} - $${precio.toFixed(2)} (Stock: ${stock})
          </option>`;
          })
          .join("")}
      </select>
      <input type="number" class="producto-cantidad" placeholder="Cantidad" value="1" min="1" required>
      <input type="number" class="producto-precio" placeholder="Precio" step="0.01" min="0" required>
      <span class="producto-subtotal">$0.00</span>
      <button type="button" class="producto-remove">
        <i class="material-icons">delete</i>
      </button>
    `;

    // Eventos para el nuevo producto
    const select = row.querySelector(".producto-select");
    const cantidad = row.querySelector(".producto-cantidad");
    const precio = row.querySelector(".producto-precio");
    const subtotal = row.querySelector(".producto-subtotal");
    const removeBtn = row.querySelector(".producto-remove");

    // Actualizar precio cuando se selecciona producto
    select.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      if (selectedOption.value) {
        const precioProducto = selectedOption.dataset.precio;
        const stockDisponible = parseInt(selectedOption.dataset.stock);

        precio.value = precioProducto;

        // Validar stock disponible
        const cantidadActual = parseInt(cantidad.value) || 1;
        if (cantidadActual > stockDisponible) {
          alert(
            `⚠️ Stock insuficiente. Solo hay ${stockDisponible} unidades disponibles.`
          );
          cantidad.value = stockDisponible;
        }

        // Actualizar máximo permitido
        cantidad.max = stockDisponible;

        calcularSubtotal();
        calcularTotal();
      }
    });

    // Calcular subtotal y total cuando cambian valores
    function calcularSubtotal() {
      const cant = parseFloat(cantidad.value) || 0;
      const prec = parseFloat(precio.value) || 0;
      const subtotalCalculado = cant * prec;
      subtotal.textContent = `$${subtotalCalculado.toFixed(2)}`;
    }

    cantidad.addEventListener("input", () => {
      // Validar stock
      const selectedOption = select.options[select.selectedIndex];
      if (selectedOption.value) {
        const stockDisponible = parseInt(selectedOption.dataset.stock);
        const cantidadIngresada = parseInt(cantidad.value) || 0;

        if (cantidadIngresada > stockDisponible) {
          alert(
            `⚠️ Stock insuficiente. Solo hay ${stockDisponible} unidades disponibles.`
          );
          cantidad.value = stockDisponible;
        }
      }

      calcularSubtotal();
      calcularTotal();
    });

    precio.addEventListener("input", () => {
      calcularSubtotal();
      calcularTotal();
    });

    // Eliminar producto
    removeBtn.addEventListener("click", () => {
      row.remove();
      calcularTotal();
    });

    productosContainer.appendChild(row);
    calcularTotal();
  }

  addProductBtn.addEventListener("click", (e) => {
    e.preventDefault();
    crearProductoRow();
  });

  // ✅ REGISTRAR VENTA EN EL BACKEND
  async function registrarVenta() {
    const user = getUserWithToken();
    if (!user || !user.token) {
      alert("Error: Usuario no autenticado");
      return false;
    }

    // Verificar que haya una caja abierta
    const cajaAbierta = await verificarCajaAbierta();
    if (!cajaAbierta) {
      alert(
        "❌ No hay una caja abierta. Debe abrir la caja antes de registrar una venta."
      );
      return false;
    }

    // Obtener datos del formulario
    const productosVenta = [];
    let isValid = true;
    let errorMessage = "";

    productosContainer.querySelectorAll(".producto-item").forEach((row) => {
      const productoId = row.querySelector(".producto-select").value;
      const cantidad = parseFloat(
        row.querySelector(".producto-cantidad").value
      );
      const precio = parseFloat(row.querySelector(".producto-precio").value);
      const productoSelect = row.querySelector(".producto-select");
      const selectedOption =
        productoSelect.options[productoSelect.selectedIndex];
      const stockDisponible = parseInt(selectedOption.dataset.stock);

      if (!productoId) {
        isValid = false;
        errorMessage = "Todos los productos deben ser seleccionados";
        return;
      }

      if (isNaN(cantidad) || cantidad <= 0) {
        isValid = false;
        errorMessage = "Las cantidades deben ser mayores a 0";
        return;
      }

      if (isNaN(precio) || precio < 0) {
        isValid = false;
        errorMessage = "Los precios deben ser válidos";
        return;
      }

      if (cantidad > stockDisponible) {
        isValid = false;
        errorMessage = `Stock insuficiente para ${
          selectedOption.text.split(" - ")[0]
        }. Disponible: ${stockDisponible}`;
        return;
      }

      productosVenta.push({
        productId: parseInt(productoId),
        quantity: cantidad,
        unitPrice: precio,
      });
    });

    if (!isValid) {
      alert(`Error: ${errorMessage}`);
      return false;
    }

    if (productosVenta.length === 0) {
      alert("Por favor agregue al menos un producto a la venta.");
      return false;
    }

    // Preparar datos para el backend según tu estructura
    const ventaData = {
      client: document.getElementById("cliente").value || null,
      paymentMethod: document.getElementById("metodo").value,
      onAccount: document.getElementById("cuenta-corriente").checked,
      products: productosVenta,
      total: parseFloat(totalSpan.textContent.replace("$", "")),
      cashRegisterId: cajaAbierta.id, // Incluir el ID de la caja abierta
    };

    console.log("📤 Enviando venta al backend:", ventaData);

    try {
      const response = await fetch("http://localhost:3000/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(ventaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Error ${response.status} al registrar venta`
        );
      }

      const result = await response.json();
      console.log("✅ Venta registrada:", result);

      // Mostrar ticket si está disponible
      if (result.id) {
        setTimeout(() => {
          if (
            confirm(
              "✅ Venta registrada exitosamente. ¿Desea generar el ticket?"
            )
          ) {
            generarTicket(result.id);
          }
        }, 500);
      }

      return true;
    } catch (error) {
      console.error("❌ Error registrando venta:", error);
      alert("Error al registrar la venta: " + error.message);
      return false;
    }
  }

  // ✅ VERIFICAR CAJA ABIERTA
  async function verificarCajaAbierta() {
    try {
      const user = getUserWithToken();
      const response = await fetch(
        "http://localhost:3000/api/cash-register/status",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const caja = await response.json();
        return caja; // Retorna la caja abierta o null
      }
      return null;
    } catch (error) {
      console.error("Error verificando caja:", error);
      return null;
    }
  }

  // ✅ GENERAR TICKET
  async function generarTicket(saleId) {
    try {
      const user = getUserWithToken();
      const response = await fetch(
        `http://localhost:3000/api/sales/${saleId}/ticket`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.ok) {
        const ticketBlob = await response.blob();
        const ticketUrl = URL.createObjectURL(ticketBlob);
        window.open(ticketUrl, "_blank");
      } else {
        console.warn("No se pudo generar el ticket");
      }
    } catch (error) {
      console.error("Error generando ticket:", error);
    }
  }

  // ✅ EVENTO PARA CONFIRMAR VENTA
  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Mostrar loading
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="material-icons align-middle">hourglass_empty</i> Procesando...';

    try {
      const success = await registrarVenta();

      if (success) {
        cerrarFormulario();

        // Recargar datos del dashboard
        if (typeof window.recargarDashboard === "function") {
          window.recargarDashboard();
        }

        // Recargar estado de caja
        if (typeof window.recargarEstadoCaja === "function") {
          window.recargarEstadoCaja();
        }
      }
    } finally {
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // ✅ INICIALIZAR CON UNA FILA
  crearProductoRow();

  // ✅ HACER FUNCIONES DISPONIBLES GLOBALMENTE
  window.mostrarFormularioVentas = mostrarFormulario;
  window.recargarEstadoCaja = () => {
    // Esta función será implementada en cash-card.js
    console.log("Recargar estado de caja...");
  };

  console.log("✅ Sales Form completamente inicializado");
}

// Función auxiliar para obtener usuario
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
