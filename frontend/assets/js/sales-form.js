// sales-form.js - VERSIÓN CORREGIDA (solo formulario)
export async function initSalesForm() {
  const cardsContainer = document.getElementById("cards-container");
  if (!cardsContainer) return;

  // Inyectar formulario overlay
  const ventaFormHtml = await fetch("components/forms/sales-form.html").then(
    (r) => r.text()
  );
  cardsContainer.insertAdjacentHTML("afterend", ventaFormHtml);

  const ventaForm = document.getElementById("venta-form");
  if (!ventaForm) return;

  const cashBtn = document.getElementById("btn-cash-action");
  const cashStatus = document.getElementById("cash-status");
  const closeBtn = document.getElementById("close-form");
  const productosContainer = document.getElementById("productos-container");
  const totalSpan = document.getElementById("total-venta");
  const addProductBtn = document.getElementById("add-product");
  const submitBtn = document.getElementById("submit-venta");

  if (
    !cashBtn ||
    !cashStatus ||
    !productosContainer ||
    !totalSpan ||
    !addProductBtn ||
    !submitBtn
  )
    return;

  // ✅ DETECTAR CAMBIOS EN EL ESTADO DEL BOTÓN
  function configurarEventos() {
    console.log("🎯 Configurando eventos del botón de caja");

    // Verificar el estado actual del botón
    const estadoActual = cashBtn.textContent.trim();
    console.log("🔍 Estado del botón:", estadoActual);

    if (estadoActual === "Registrar Venta") {
      // Si la caja está abierta, asignar evento para abrir formulario
      cashBtn.onclick = abrirFormularioVenta;
      console.log("✅ Evento asignado: abrir formulario de venta");
    } else if (estadoActual === "Abrir Caja") {
      // Si la caja está cerrada, no hacer nada (cash-card.js maneja esto)
      cashBtn.onclick = null;
      console.log("✅ Botón de abrir caja - manejado por cash-card.js");
    }
  }

  // ✅ FUNCIÓN PARA ABRIR FORMULARIO
  function abrirFormularioVenta() {
    console.log("🎯 Abriendo formulario de ventas...");

    if (!cashStatus.textContent.includes("Abierta")) {
      alert("La caja está cerrada. Ábrala antes de registrar una venta.");
      return;
    }

    ventaForm.classList.remove("d-none");
    ventaForm.style.display = "flex";
    console.log("✅ Formulario de ventas abierto");
  }

  // ✅ OBSERVAR CAMBIOS EN EL BOTÓN
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === "characterData" || mutation.type === "childList") {
        configurarEventos();
      }
    });
  });

  // Observar cambios en el texto del botón
  observer.observe(cashBtn, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  // Configurar eventos iniciales
  configurarEventos();

  // Cerrar formulario
  closeBtn.addEventListener("click", () => {
    ventaForm.classList.add("d-none");
    ventaForm.style.display = "none";
  });

  // Función para calcular total
  function calcularTotal() {
    let total = 0;
    productosContainer.querySelectorAll(".producto-row").forEach((row) => {
      const cantidad = parseFloat(row.querySelector(".cantidad").value) || 0;
      const precio = parseFloat(row.querySelector(".precio").value) || 0;
      total += cantidad * precio;
    });
    totalSpan.textContent = `Total: $${total.toFixed(2)}`;
  }

  // Agregar fila de producto
  function crearProductoRow() {
    const row = document.createElement("div");
    row.className = "producto-row";

    row.innerHTML = `
      <input type="text" class="form-control producto" placeholder="Producto" required>
      <input type="number" class="form-control cantidad" placeholder="Cantidad" value="1" min="1" required>
      <input type="number" class="form-control precio" placeholder="Precio Unitario" min="0" required>
      <button type="button" class="btn btn-danger btn-remove-row">&times;</button>
    `;

    // Event listener eliminar fila
    row.querySelector(".btn-remove-row").addEventListener("click", () => {
      row.remove();
      calcularTotal();
    });

    // Recalcular total al cambiar cantidad o precio
    row.querySelectorAll(".cantidad, .precio").forEach((input) => {
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
    productosContainer.querySelectorAll(".producto-row").forEach((row) => {
      venta.push({
        producto: row.querySelector(".producto").value,
        cantidad: parseFloat(row.querySelector(".cantidad").value),
        precio: parseFloat(row.querySelector(".precio").value),
      });
    });

    const cliente = document.getElementById("cliente").value || null;
    const cuentaCorriente = document.getElementById("cuenta-corriente").checked;

    console.log({
      venta,
      cliente,
      cuentaCorriente,
      metodo: document.getElementById("metodo").value,
    });

    alert("✅ Venta registrada correctamente.");
    ventaForm.classList.add("d-none");
    ventaForm.style.display = "none";
    productosContainer.innerHTML = "";
    crearProductoRow();
    document.getElementById("cliente").value = "";
    document.getElementById("cuenta-corriente").checked = false;
    totalSpan.textContent = "Total: $0";
  });
}
