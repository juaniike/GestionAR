// assets/js/login.js - CON RUTA CORREGIDA
class LoginManager {
  constructor() {
    this.API_URL = "http://localhost:3000"; // Tu backend
    this.init();
  }

  init() {
    console.log("🔐 Inicializando sistema de login...");
    this.setupEventListeners();
    this.checkExistingAuth();
    this.focusUsername();
  }

  setupEventListeners() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    }
  }

  checkExistingAuth() {
    const user = this.getStoredUser();
    if (user && user.token) {
      this.redirectToApp();
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const loginButton = document.getElementById("loginButton");

    if (!username || !password) {
      this.showError("Completa todos los campos");
      return;
    }

    this.setLoadingState(loginButton, true);

    try {
      const success = await this.authenticateUser(username, password);
      if (success) {
        this.showSuccess("¡Login exitoso! Redirigiendo...");
        setTimeout(() => this.redirectToApp(), 1000);
      }
    } catch (error) {
      this.showError(error.message);
      this.setLoadingState(loginButton, false);
    }
  }

  setLoadingState(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.innerHTML =
        '<i class="material-icons me-2">hourglass_empty</i>Verificando...';
    } else {
      button.disabled = false;
      button.innerHTML = "Iniciar sesión";
    }
  }

  async authenticateUser(username, password) {
    console.log("🔐 Conectando a API...", { username, password });

    try {
      // ✅ CORREGIR RUTA SEGÚN TU BACKEND
      const response = await fetch(`${this.API_URL}/api/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      console.log(
        "📡 Respuesta del servidor:",
        response.status,
        response.statusText
      );

      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // Si no se puede parsear JSON, usar texto plano
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Login exitoso - Datos recibidos:", data);

      // ✅ ADAPTAR SEGÚN LA RESPUESTA DE TU BACKEND
      if (data.user && data.token) {
        // Caso: { user: {...}, token: "..." }
        sessionStorage.setItem("user", JSON.stringify(data.user));
        sessionStorage.setItem("token", data.token);
      } else if (data.id && data.username) {
        // Caso: el user viene directamente en la respuesta
        sessionStorage.setItem("user", JSON.stringify(data));
        sessionStorage.setItem("token", data.token || `token_${Date.now()}`);
      } else {
        console.warn("⚠️ Estructura de respuesta no reconocida:", data);
        throw new Error("Estructura de respuesta inválida");
      }

      return true;
    } catch (error) {
      console.error("❌ Error en login:", error);

      // ✅ FALLBACK PARA DESARROLLO
      if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("Network") ||
        error.message.includes("404") ||
        error.message.includes("Route not found")
      ) {
        console.warn(
          "🌐 API no disponible o ruta incorrecta, usando modo desarrollo..."
        );
        return this.fallbackToMockAuth(username, password);
      }

      throw error;
    }
  }

  // ✅ FALLBACK MEJORADO
  fallbackToMockAuth(username, password) {
    console.log("🛠️ Usando autenticación mock para desarrollo...");

    const mockUsers = {
      "Juan Ignacio": {
        password: "123456",
        role: "owner",
        id: 1,
        username: "Juan Ignacio",
      },
      admin: { password: "admin123", role: "owner", id: 2, username: "admin" },
      vendedor: {
        password: "vendedor123",
        role: "employee",
        id: 3,
        username: "vendedor",
      },
      demo: { password: "demo123", role: "employee", id: 4, username: "demo" },
    };

    // Debug detallado
    console.log("🔍 Buscando usuario:", username);
    console.log("🔍 Usuarios disponibles:", Object.keys(mockUsers));

    const user = mockUsers[username];

    if (user && user.password === password) {
      const userData = {
        id: user.id,
        username: user.username,
        role: user.role,
        token: `dev_token_${Date.now()}`,
      };

      sessionStorage.setItem("user", JSON.stringify(userData));
      sessionStorage.setItem("token", userData.token);

      console.log("✅ Mock login exitoso:", userData);
      return true;
    } else {
      console.log("❌ Mock login fallido - Credenciales incorrectas");
      throw new Error("Usuario o contraseña incorrectos");
    }
  }

  redirectToApp() {
    window.location.href = "app.html";
  }

  getStoredUser() {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch (error) {
      return null;
    }
  }

  showError(message) {
    alert(`❌ ${message}`);
    document.getElementById("password").focus();
  }

  showSuccess(message) {
    alert(`✅ ${message}`);
  }

  focusUsername() {
    const usernameInput = document.getElementById("username");
    if (usernameInput) {
      setTimeout(() => usernameInput.focus(), 100);
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  new LoginManager();
});
