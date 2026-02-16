
export type DayOfWeek = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: 'unidades' | 'kg';
}

export interface Client {
  id: string;
  name: string;
  address?: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  clientId: string;
  date: string; // ISO format YYYY-MM-DD
  day: DayOfWeek; // Kept for legacy compatibility if needed, but derived from date
  items: OrderItem[];
}

export interface ProductionSummary {
  productName: string;
  total: number;
  unit: string;
}
