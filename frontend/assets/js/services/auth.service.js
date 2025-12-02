// assets/js/services/auth.service.js
class AuthService {
  constructor() {
    this.API_URL = "http://localhost:3000";
    this.currentUser = null;
    this.token = null;
    this.loadUserFromStorage();
  }

  loadUserFromStorage() {
    try {
      const userData = sessionStorage.getItem("user");
      const tokenData = sessionStorage.getItem("token");

      if (userData && tokenData) {
        this.currentUser = JSON.parse(userData);
        this.token = tokenData;
        console.log("✅ Usuario y token cargados desde sessionStorage");
      }
    } catch (error) {
      console.error("❌ Error cargando usuario:", error);
      this.clearAuth();
    }
  }

  async login(username, password) {
    try {
      console.log("🔐 [AuthService] Iniciando sesión...", { username });

      const response = await fetch(`${this.API_URL}/user/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      console.log("📡 [AuthService] Respuesta del servidor:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || this.getErrorMessage(response.status);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ [AuthService] Login exitoso:", data);

      if (!data.token) {
        throw new Error("No se recibió token del servidor");
      }

      this.token = data.token;
      this.currentUser = data.user;

      sessionStorage.setItem("token", data.token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      console.log("✅ [AuthService] Sesión guardada:", data.user.username);
      return data;
    } catch (error) {
      console.error("❌ [AuthService] Error en login:", error);
      this.clearAuth();
      throw error;
    }
  }

  getErrorMessage(status) {
    switch (status) {
      case 401:
        return "Usuario o contraseña incorrectos";
      case 404:
        return "Servicio no disponible";
      case 500:
        return "Error interno del servidor";
      default:
        return `Error ${status}`;
    }
  }

  async logout() {
    try {
      console.log("🚪 [AuthService] Cerrando sesión...");

      if (this.token) {
        await fetch(`${this.API_URL}/user/logout`, {
          method: "POST",
          headers: this.getAuthHeaders(),
        }).catch(() =>
          console.log("⚠️ No se pudo contactar servidor para logout")
        );
      }
    } catch (error) {
      console.error("❌ [AuthService] Error en logout:", error);
    } finally {
      this.clearAuth();
      console.log("🧹 [AuthService] Sesión cerrada");
    }
  }

  clearAuth() {
    this.currentUser = null;
    this.token = null;
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
  }

  isAuthenticated() {
    const hasAuth = !!(this.currentUser && this.token);
    console.log("🔐 [AuthService] Autenticado:", hasAuth);
    return hasAuth;
  }

  getUser() {
    return this.currentUser;
  }

  getToken() {
    return this.token;
  }

  getAuthHeaders() {
    const headers = {
      "Content-Type": "application/json",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async authenticatedFetch(url, options = {}) {
    const headers = this.getAuthHeaders();

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (response.status === 401) {
      this.clearAuth();
      window.location.href = "index.html";
      throw new Error("Sesión expirada - Por favor iniciá sesión nuevamente");
    }

    return response;
  }
}

// ✅ EXPORT CORRECTO para módulos ES6
export default AuthService;

// ✅ También mantener instancia global para compatibilidad
window.authService = new AuthService();
