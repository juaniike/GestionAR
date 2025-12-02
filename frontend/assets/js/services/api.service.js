// assets/js/services/api.js
class ApiService {
  constructor() {
    this.BASE_URL = "http://localhost:3000";
    this.endpoints = {
      // Auth
      LOGIN: "/user/login",
      LOGOUT: "/user/logout",

      // Cash
      CASH_STATUS: "/cash-register/status",
      CASH_OPEN: "/cash-register/open",
      CASH_CLOSE: (id) => `/cash-register/${id}/close`,

      // Products
      PRODUCTS: "/products",
      PRODUCT_BY_ID: (id) => `/products/${id}`,
      PRODUCT_BY_BARCODE: (barcode) => `/products/barcode/${barcode}`,

      // Sales
      SALES: "/sales",
      SALE_BY_ID: (id) => `/sales/${id}`,
      SALES_BY_USER: (userid) => `/sales/user/${userid}`,
      SALES_DAILY_REPORT: "/sales/report/daily",
      SALES_APPLY_DISCOUNT: "/sales/discount",
      SALES_GENERATE_TICKET: (id) => `/sales/${id}/ticket`,
      SALES_CANCEL: (id) => `/sales/${id}/cancel`,
      SALES_ITEMS: (id) => `/sales/${id}/items`,
      SALES_SOLD_PRODUCTS: "/sales/report/sold",

      // Clients
      CLIENTS: "/clients",
      CLIENT_BY_ID: (id) => `/clients/${id}`,

      // Consolidated View
      SALES_CONSOLIDATED: "/view",

      // Movements
      MOVEMENTS: "/movements",
      MOVEMENTS_BY_CASH_REGISTER: (id) => `/movements/cash-register/${id}`,
      MOVEMENTS_TODAY: "/movements/today/movements",
      MOVEMENTS_TOTALS: "/movements/totals/by-type",
    };
  }

  async request(endpoint, options = {}) {
    try {
      const url = `${this.BASE_URL}${endpoint}`;
      const headers = {
        "Content-Type": "application/json",
        ...options.headers,
      };

      // Obtener token
      const token = this.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const config = {
        ...options,
        headers,
      };

      console.log(`🌐 [API] ${options.method || "GET"} ${endpoint}`);

      const response = await fetch(url, config);

      console.log(
        `📡 [API] Response: ${response.status} ${response.statusText}`
      );

      // Manejar errores de autenticación
      if (response.status === 401) {
        this.handleUnauthorized();
        throw new Error("Unauthorized - Please login again");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ [API] Error in request to ${endpoint}:`, error);
      throw error;
    }
  }

  getToken() {
    try {
      const userData =
        sessionStorage.getItem("user") || localStorage.getItem("user");
      const tokenData =
        sessionStorage.getItem("token") || localStorage.getItem("token");

      if (userData && tokenData) {
        const user = JSON.parse(userData);
        return tokenData;
      }
      return null;
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  handleUnauthorized() {
    // Limpiar datos de sesión
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    // Redirigir al login
    window.location.href = "index.html";
  }

  // Métodos HTTP helpers
  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: "DELETE",
    });
  }
}

export default ApiService;
