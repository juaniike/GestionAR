// assets/js/services/products.service.js
class ProductsService {
  constructor(apiService) {
    this.apiService = apiService;
    this.cache = {
      products: null,
      lastUpdate: null,
      ttl: 60000, // 1 minuto
    };
    console.log("📦 ProductsService instanciado");
  }

  async getAllProducts(forceRefresh = false) {
    try {
      if (!forceRefresh && this.isCacheValid()) {
        console.log("📦 [ProductsService] Usando productos en cache");
        return this.cache.products;
      }

      console.log("📦 [ProductsService] Obteniendo productos...");
      const products = await this.apiService.get(
        this.apiService.endpoints.PRODUCTS
      );

      // Procesar datos
      const processedProducts = products.map((p) => ({
        id: p.id,
        barcode: p.barcode,
        name: p.name,
        category: p.category,
        cost: parseFloat(p.cost) || 0,
        price: parseFloat(p.price) || 0,
        stock: parseInt(p.stock) || 0,
        minstock: parseInt(p.minstock) || 5,
      }));

      this.cache.products = processedProducts;
      this.cache.lastUpdate = Date.now();

      console.log(
        `📦 [ProductsService] ${processedProducts.length} productos cargados`
      );
      return processedProducts;
    } catch (error) {
      console.error("❌ [ProductsService] Error obteniendo productos:", error);
      throw error;
    }
  }

  async getProductById(id) {
    try {
      console.log(`📦 [ProductsService] Obteniendo producto #${id}...`);
      const product = await this.apiService.get(
        this.apiService.endpoints.PRODUCT_BY_ID(id)
      );
      return this.processProductData(product);
    } catch (error) {
      console.error(
        `❌ [ProductsService] Error obteniendo producto ${id}:`,
        error
      );
      throw error;
    }
  }

  async getProductByBarcode(barcode) {
    try {
      console.log(
        `📦 [ProductsService] Buscando producto por código: ${barcode}`
      );
      const product = await this.apiService.get(
        this.apiService.endpoints.PRODUCT_BY_BARCODE(barcode)
      );
      return this.processProductData(product);
    } catch (error) {
      console.error(
        `❌ [ProductsService] Error buscando producto ${barcode}:`,
        error
      );
      throw error;
    }
  }

  async createProduct(productData) {
    try {
      console.log("📦 [ProductsService] Creando producto...", productData);
      const result = await this.apiService.post(
        this.apiService.endpoints.PRODUCTS,
        productData
      );
      this.clearCache();
      return result;
    } catch (error) {
      console.error("❌ [ProductsService] Error creando producto:", error);
      throw error;
    }
  }

  async updateProduct(id, productData) {
    try {
      console.log(`📦 [ProductsService] Actualizando producto #${id}...`);
      const result = await this.apiService.put(
        this.apiService.endpoints.PRODUCT_BY_ID(id),
        productData
      );
      this.clearCache();
      return result;
    } catch (error) {
      console.error(
        `❌ [ProductsService] Error actualizando producto ${id}:`,
        error
      );
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      console.log(`📦 [ProductsService] Eliminando producto #${id}...`);
      const result = await this.apiService.delete(
        this.apiService.endpoints.PRODUCT_BY_ID(id)
      );
      this.clearCache();
      return result;
    } catch (error) {
      console.error(
        `❌ [ProductsService] Error eliminando producto ${id}:`,
        error
      );
      throw error;
    }
  }

  // Métodos de utilidad
  processProductData(product) {
    return {
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      cost: parseFloat(product.cost) || 0,
      price: parseFloat(product.price) || 0,
      stock: parseInt(product.stock) || 0,
      minstock: parseInt(product.minstock) || 5,
    };
  }

  calculateStockSummary(products) {
    let critical = 0,
      outOfStock = 0,
      stable = 0,
      overStock = 0;
    let totalValue = 0;

    products.forEach((p) => {
      const stock = p.stock || 0;
      const minStock = p.minstock || 5;
      const maxNormalStock = minStock * 3;

      if (stock === 0) {
        outOfStock++;
      } else if (stock <= minStock) {
        critical++;
      } else if (stock <= maxNormalStock) {
        stable++;
      } else {
        overStock++;
      }

      totalValue += stock * (p.cost || 0);
    });

    return {
      critical,
      outOfStock,
      stable,
      overStock,
      totalValue: parseFloat(totalValue.toFixed(2)),
    };
  }

  getStockStatus(product) {
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

  isCacheValid() {
    return (
      this.cache.products &&
      this.cache.lastUpdate &&
      Date.now() - this.cache.lastUpdate < this.cache.ttl
    );
  }

  clearCache() {
    this.cache.products = null;
    this.cache.lastUpdate = null;
    console.log("📦 [ProductsService] Cache limpiado");
  }
}

export default ProductsService;
