
import { Product, Client, DayOfWeek } from './types';

export const DAYS: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Pan Francés', category: 'Panes', unit: 'unidades' },
  { id: '2', name: 'Mignon', category: 'Panes', unit: 'kg' },
  { id: '3', name: 'Factura Medialuna', category: 'Bollería', unit: 'unidades' },
  { id: '4', name: 'Pan de Molde Blanco', category: 'Panes', unit: 'unidades' },
  { id: '5', name: 'Bizcochitos de Grasa', category: 'Secos', unit: 'kg' },
  { id: '6', name: 'Integral con Semillas', category: 'Panes', unit: 'unidades' },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', name: 'Supermercado Central' },
  { id: 'c2', name: 'Cafetería El Faro' },
  { id: 'c3', name: 'Restaurante Gourmet' },
];
