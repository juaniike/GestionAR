// sales-form.js - VERSIÓN COMPLETAMENTE CORREGIDA
let isSalesFormInitialized = false;
let productosDisponibles = [];
let cajaAbierta = null;

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

  // ✅ CARGAR PRODUCTOS
  async function cargarProductos() {
    try {
      const user = getUserWithToken();
      if (!user?.token) throw new Error("Usuario no autenticado");

      console.log("📦 Cargando productos desde /products...");
      const response = await fetch("http://localhost:3000/products", {
        headers: {
          Authorization: `Bearer ${user.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const products = await response.json();
      productosDisponibles = Array.isArray(products) ? products : [];
      console.log(`✅ ${productosDisponibles.length} productos cargados`);

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
          .map((product) => {
            const stock = product.stock || 0;
            const precio = parseFloat(product.price) || 0;
            const stockClass =
              stock === 0
                ? "option-no-stock"
                : stock <= (product.minstock || 5)
                ? "option-low-stock"
                : "";

            return `<option value="${product.id}" 
                  data-precio="${precio}" 
                  data-stock="${stock}"
                  class="${stockClass}">
            ${product.name} - $${precio.toFixed(2)} (Stock: ${stock})
          </option>`;
          })
          .join("")}
      `;

      if (currentValue) select.value = currentValue;
    });
  }

  // ✅ VERIFICAR CAJA ABIERTA
  async function verificarCajaAbierta() {
    try {
      const user = getUserWithToken();
      console.log("💰 Verificando estado de caja...");

      const response = await fetch(
        "http://localhost:3000/cash-register/status",
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      if (response.ok) {
        const cajaData = await response.json();
        console.log("✅ Estado caja:", cajaData);
        cajaAbierta = cajaData;
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Error verificando caja:", error);
      return false;
    }
  }

  // ✅ ABRIR CAJA SI ESTÁ CERRADA
  async function manejarCaja() {
    const cajaEstaAbierta = await verificarCajaAbierta();

    if (!cajaEstaAbierta) {
      const abrirCaja = confirm(
        "❌ La caja está cerrada. ¿Deseas abrirla ahora?"
      );

      if (abrirCaja) {
        try {
          const user = getUserWithToken();
          const response = await fetch(
            "http://localhost:3000/cash-register/open",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${user.token}`,
              },
              body: JSON.stringify({
                startingcash: 0,
              }),
            }
          );

          if (response.ok) {
            const nuevaCaja = await response.json();
            cajaAbierta = nuevaCaja;
            alert("✅ Caja abierta correctamente");
            return true;
          } else {
            const errorData = await response.json();
            throw new Error(errorData.message || "Error abriendo caja");
          }
        } catch (error) {
          console.error("Error abriendo caja:", error);
          alert(`❌ No se pudo abrir la caja: ${error.message}`);
          return false;
        }
      } else {
        return false;
      }
    }
    return true;
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
    console.log("✅ Formulario de ventas cerrado");
  }

  // ✅ RESETEAR FORMULARIO
  function resetFormulario() {
    productosContainer.innerHTML = "";
    crearProductoRow();
    document.getElementById("cliente").value = "";
    document.getElementById("cuenta-corriente").checked = false;
    document.getElementById("metodo").value = "efectivo";
    totalSpan.textContent = "$0.00";
  }

  // ✅ EVENT LISTENERS
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    cerrarFormulario();
  });

  ventaForm.addEventListener("click", (e) => {
    if (e.target === ventaForm) cerrarFormulario();
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
    return total;
  }

  function crearProductoRow() {
    const row = document.createElement("div");
    row.className = "producto-item";

    row.innerHTML = `
      <select class="producto-select" required>
        <option value="">Seleccionar producto</option>
        ${productosDisponibles
          .map((producto) => {
            const stock = producto.stock || 0;
            const precio = parseFloat(producto.price) || 0;
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

    function calcularSubtotal() {
      const cant = parseFloat(cantidad.value) || 0;
      const prec = parseFloat(precio.value) || 0;
      const subtotalCalculado = cant * prec;
      subtotal.textContent = `$${subtotalCalculado.toFixed(2)}`;
    }

    select.addEventListener("change", function () {
      const selectedOption = this.options[this.selectedIndex];
      if (selectedOption.value) {
        const precioProducto = selectedOption.dataset.precio;
        const stockDisponible = parseInt(selectedOption.dataset.stock);

        precio.value = precioProducto;

        // Validar stock
        const cantidadActual = parseInt(cantidad.value) || 1;
        if (cantidadActual > stockDisponible) {
          alert(`⚠️ Stock insuficiente. Máximo: ${stockDisponible}`);
          cantidad.value = stockDisponible;
        }

        cantidad.max = stockDisponible;
        calcularSubtotal();
        calcularTotal();
      }
    });

    cantidad.addEventListener("input", () => {
      const selectedOption = select.options[select.selectedIndex];
      if (selectedOption.value) {
        const stockDisponible = parseInt(selectedOption.dataset.stock);
        const cantidadIngresada = parseInt(cantidad.value) || 0;

        if (cantidadIngresada > stockDisponible) {
          alert(`⚠️ Stock insuficiente. Máximo: ${stockDisponible}`);
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

  // ✅ REGISTRAR VENTA - ESTRUCTURA CORREGIDA
  async function registrarVenta() {
    const user = getUserWithToken();
    if (!user?.token) {
      alert("❌ Error: Usuario no autenticado");
      return false;
    }

    // 1. Verificar y manejar caja
    const cajaLista = await manejarCaja();
    if (!cajaLista) {
      return false;
    }

    // 2. Validar productos
    const productosVenta = [];
    let isValid = true;
    let errorMessage = "";

    productosContainer.querySelectorAll(".producto-item").forEach((row) => {
      const productoSelect = row.querySelector(".producto-select");
      const productoId = productoSelect.value;
      const cantidad = parseFloat(
        row.querySelector(".producto-cantidad").value
      );
      const precio = parseFloat(row.querySelector(".producto-precio").value);
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

      if (cantidad > stockDisponible) {
        isValid = false;
        errorMessage = `Stock insuficiente para ${
          selectedOption.text.split(" - ")[0]
        }. Disponible: ${stockDisponible}`;
        return;
      }

      // ✅ CORREGIDO - usar variables correctas
      productosVenta.push({
        productid: parseInt(productoId),
        quantity: cantidad,
        unitprice: precio,
      });
    });

    if (!isValid) {
      alert(`❌ Error: ${errorMessage}`);
      return false;
    }

    if (productosVenta.length === 0) {
      alert("❌ Por favor agregue al menos un producto");
      return false;
    }

    // 3. Preparar datos para el endpoint /sales
    const ventaData = {
      items: productosVenta,
      paymentmethod: document.getElementById("metodo").value,
    };

    console.log("📤 Enviando venta:", ventaData);

    try {
      const response = await fetch("http://localhost:3000/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(ventaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Venta registrada:", result);

      // Después de registrar venta exitosa - en sales-form.js
      if (typeof window.recargarEstadoCaja === "function") {
        await window.recargarEstadoCaja();
        console.log("💰 Estado de caja actualizado después de venta");
      }

      // Éxito - preguntar por ticket
      setTimeout(() => {
        if (
          confirm("✅ Venta registrada exitosamente. ¿Desea generar el ticket?")
        ) {
          generarTicket(result.id);
        }
      }, 500);

      return true;
    } catch (error) {
      console.error("❌ Error registrando venta:", error);
      alert(`❌ Error al registrar la venta: ${error.message}`);
      return false;
    }
  }

  // ✅ GENERAR TICKET
  async function generarTicket(saleId) {
    try {
      const user = getUserWithToken();
      const response = await fetch(
        `http://localhost:3000/sales/${saleId}/ticket`,
        {
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
        console.warn("⚠️ No se pudo generar el ticket");
      }
    } catch (error) {
      console.error("❌ Error generando ticket:", error);
    }
  }

  // ✅ EVENTO PARA CONFIRMAR VENTA
  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    // Loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<i class="material-icons align-middle">hourglass_empty</i> Procesando...';

    try {
      const success = await registrarVenta();

      if (success) {
        cerrarFormulario();

        // Recargar datos del dashboard
        if (typeof window.refreshDashboard === "function") {
          window.refreshDashboard();
        }

        // Recargar stock
        if (typeof window.refreshStockCard === "function") {
          window.refreshStockCard();
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

  console.log("✅ Sales Form completamente inicializado");
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
