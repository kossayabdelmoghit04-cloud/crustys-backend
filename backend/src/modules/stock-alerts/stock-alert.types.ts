export interface LowStockProduct {
  id: string;
  name: string;
  stockQuantity: number;
  lowStockThreshold: number;
}

export interface StockStats {
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
  healthyStock: number;
}
