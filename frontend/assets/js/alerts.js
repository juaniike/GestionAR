// alerts.js - Sistema de notificaciones
export function showAlert(message, type = "info", duration = 5000) {
  // Remover alertas existentes
  removeExistingAlerts();

  const alertClass = getAlertClass(type);
  const icon = getAlertIcon(type);

  const alertHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show custom-alert" role="alert">
            <div class="d-flex align-items-center">
                <i class="material-icons me-2">${icon}</i>
                <span>${message}</span>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

  // Crear contenedor si no existe
  let alertContainer = document.getElementById("alert-container");
  if (!alertContainer) {
    alertContainer = document.createElement("div");
    alertContainer.id = "alert-container";
    alertContainer.className = "position-fixed top-0 end-0 p-3";
    alertContainer.style.zIndex = "9999";
    document.body.appendChild(alertContainer);
  }

  alertContainer.innerHTML = alertHTML;

  // Auto-remover después del tiempo especificado
  if (duration > 0) {
    setTimeout(() => {
      removeExistingAlerts();
    }, duration);
  }
}

function removeExistingAlerts() {
  const existingAlerts = document.querySelectorAll(".custom-alert");
  existingAlerts.forEach((alert) => {
    alert.remove();
  });
}

function getAlertClass(type) {
  const classes = {
    success: "alert-success",
    error: "alert-danger",
    warning: "alert-warning",
    info: "alert-info",
  };
  return classes[type] || "alert-info";
}

function getAlertIcon(type) {
  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };
  return icons[type] || "info";
}

// También puedes agregar confirmaciones
export function showConfirm(message, confirmCallback, cancelCallback = null) {
  // Implementación básica - podrías usar un modal de Bootstrap
  const result = confirm(message);
  if (result && confirmCallback) {
    confirmCallback();
  } else if (!result && cancelCallback) {
    cancelCallback();
  }
  return result;
}
