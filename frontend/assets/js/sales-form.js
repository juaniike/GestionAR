// sales-form.js - VERSIÓN ACTUALIZADA CON NUEVAS CLASES
export async function initSalesForm() {
  const cardsContainer = document.getElementById("cards-container");
  if (!cardsContainer) return;

  // Inyectar formulario overlay con nuevas clases
  const ventaFormHtml = await fetch("components/forms/sales-form.html").then(
    (r) => r.text()
  );
  cardsContainer.insertAdjacentHTML("afterend", ventaFormHtml);

  const ventaForm = document.getElementById("venta-form");
  if (!ventaForm) return;

  const closeBtn = document.querySelector(".venta-form-close");
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
  )
    return;

  console.log("🎯 Formulario de ventas listo");

  // ✅ FUNCIÓN MEJORADA PARA CERRAR FORMULARIO
  function cerrarFormulario() {
    console.log("🔒 Cerrando formulario de venta...");

    const ventaForm = document.getElementById("venta-form");
    if (ventaForm) {
      ventaForm.classList.remove("venta-form-overlay--visible");
      ventaForm.classList.add("venta-form-overlay--hidden");
      console.log("✅ Formulario cerrado con nuevas clases");
    }
  }

  // ✅ ASIGNAR EVENTO AL BOTÓN CERRAR
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    cerrarFormulario();
  });

  // ✅ CERRAR AL HACER CLICK FUERA DEL FORMULARIO
  ventaForm.addEventListener("click", (e) => {
    if (e.target === ventaForm) {
      cerrarFormulario();
    }
  });

  // ✅ CERRAR CON TECLA ESC
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      ventaForm.classList.contains("venta-form-overlay--visible")
    ) {
      cerrarFormulario();
    }
  });

  // Función para calcular total
  function calcularTotal() {
    let total = 0;
    productosContainer
      .querySelectorAll(".venta-form-producto-row")
      .forEach((row) => {
        const cantidad =
          parseFloat(row.querySelector(".producto-cantidad").value) || 0;
        const precio =
          parseFloat(row.querySelector(".producto-precio").value) || 0;
        total += cantidad * precio;
      });
    totalSpan.textContent = `$${total.toFixed(2)}`;
  }

  // Agregar fila de producto
  function crearProductoRow() {
    const row = document.createElement("div");
    row.className = "venta-form-producto-row";

    row.innerHTML = `
      <div class="venta-form-input-group">
        <label class="venta-form-label">Producto</label>
        <input type="text" class="venta-form-input producto-nombre" placeholder="Nombre del producto" required>
      </div>
      <div class="venta-form-input-group">
        <label class="venta-form-label">Cantidad</label>
        <input type="number" class="venta-form-input producto-cantidad" placeholder="0" value="1" min="1" required>
      </div>
      <div class="venta-form-input-group">
        <label class="venta-form-label">Precio Unitario</label>
        <input type="number" class="venta-form-input producto-precio" placeholder="0.00" min="0" step="0.01" required>
      </div>
      <button type="button" class="venta-form-remove-btn">
        <i class="material-icons align-middle">delete</i>
      </button>
    `;

    row
      .querySelector(".venta-form-remove-btn")
      .addEventListener("click", () => {
        row.remove();
        calcularTotal();
      });

    row
      .querySelectorAll(".producto-cantidad, .producto-precio")
      .forEach((input) => {
        input.addEventListener("input", calcularTotal);
      });

    productosContainer.appendChild(row);
    calcularTotal();
  }

  addProductBtn.addEventListener("click", (e) => {
    e.preventDefault();
    crearProductoRow();
  });

  // Inicializar con una fila
  crearProductoRow();

  // Submit formulario
  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const venta = [];
    let isValid = true;

    productosContainer
      .querySelectorAll(".venta-form-producto-row")
      .forEach((row) => {
        const producto = row.querySelector(".producto-nombre").value;
        const cantidad = parseFloat(
          row.querySelector(".producto-cantidad").value
        );
        const precio = parseFloat(row.querySelector(".producto-precio").value);

        if (!producto || isNaN(cantidad) || isNaN(precio)) {
          isValid = false;
        }

        venta.push({
          producto,
          cantidad,
          precio,
        });
      });

    if (!isValid) {
      alert("Por favor complete todos los campos correctamente.");
      return;
    }

    const cliente = document.getElementById("cliente").value || null;
    const cuentaCorriente = document.getElementById("cuenta-corriente").checked;

    console.log({
      venta,
      cliente,
      cuentaCorriente,
      metodo: document.getElementById("metodo").value,
    });

    alert("✅ Venta registrada correctamente.");
    cerrarFormulario();
    productosContainer.innerHTML = "";
    crearProductoRow();
    document.getElementById("cliente").value = "";
    document.getElementById("cuenta-corriente").checked = false;
    totalSpan.textContent = "$0.00";
  });
}
