// assets/js/login.js
import AuthService from "./services/auth.service.js";

class LoginManager {
  constructor() {
    this.authService = new AuthService();
    this.init();
  }

  init() {
    console.log("🔐 Inicializando LoginManager...");
    this.setupEventListeners();
    this.checkExistingAuth();
    this.focusUsername();
  }

  setupEventListeners() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleFormSubmit(e));
    }

    // Enter key support
    document.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && document.getElementById("loginForm")) {
        this.handleLogin();
      }
    });
  }

  handleFormSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    this.handleLogin();
    return false;
  }

  checkExistingAuth() {
    if (this.authService.isAuthenticated()) {
      console.log("✅ Usuario ya autenticado, redirigiendo...");
      this.redirectToApp();
    }
  }

  async handleLogin() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const loginButton = document.getElementById("loginButton");

    // Validaciones básicas
    if (!username || !password) {
      this.showError("Por favor completá todos los campos");
      return;
    }

    this.setLoadingState(loginButton, true);

    try {
      await this.authService.login(username, password);
      console.log("✅ Login exitoso - Redirigiendo...");
      this.redirectToApp();
    } catch (error) {
      console.error("❌ Error en login:", error);
      this.showError(this.getUserFriendlyError(error.message));
      this.setLoadingState(loginButton, false);
    }
  }

  getUserFriendlyError(errorMessage) {
    const lowerMessage = errorMessage.toLowerCase();

    if (lowerMessage.includes("incorrect") || lowerMessage.includes("401")) {
      return "Usuario o contraseña incorrectos";
    }
    if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
      return "Error de conexión. Verificá que el servidor esté ejecutándose";
    }
    if (lowerMessage.includes("404")) {
      return "Servicio no disponible. Contactá al administrador";
    }

    return errorMessage || "Error desconocido al iniciar sesión";
  }

  redirectToApp() {
    console.log("📍 Redirigiendo a app.html");
    window.location.href = "app.html";
  }

  setLoadingState(button, isLoading) {
    if (!button) return;

    const originalHTML =
      '<i class="material-icons me-2">login</i>Iniciar sesión';
    const loadingHTML =
      '<i class="material-icons me-2">hourglass_empty</i>Verificando...';

    button.disabled = isLoading;
    button.innerHTML = isLoading ? loadingHTML : originalHTML;
  }

  showError(message) {
    const errorAlert = document.getElementById("errorAlert");
    const errorMessage = document.getElementById("errorMessage");

    if (errorAlert && errorMessage) {
      errorMessage.textContent = message;
      errorAlert.classList.remove("d-none");

      // Auto-ocultar después de 5 segundos
      setTimeout(() => {
        errorAlert.classList.add("d-none");
      }, 5000);
    } else {
      // Fallback
      alert(`❌ ${message}`);
    }

    // Focus en campo de contraseña para reintentar
    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.focus();
      passwordInput.select();
    }
  }

  focusUsername() {
    const usernameInput = document.getElementById("username");
    if (usernameInput) {
      setTimeout(() => {
        usernameInput.focus();
      }, 100);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new LoginManager();
});
