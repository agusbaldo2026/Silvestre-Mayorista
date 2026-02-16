
import { Order, Product, Client } from "../types";

export const syncToSheets = async (url: string, orders: Order[], products: Product[], clients: Client[]) => {
  if (!url) return { success: false, error: "No URL configured" };

  // Preparamos los datos para que sean fáciles de leer en Sheets
  const dataToSync = orders.map(order => {
    const client = clients.find(c => c.id === order.clientId);
    return {
      id: order.id,
      fecha: order.date,
      dia: order.day,
      cliente: client?.name || 'Desconocido',
      productos: order.items.map(it => {
        const p = products.find(prod => prod.id === it.productId);
        return `${p?.name} (x${it.quantity} ${p?.unit})`;
      }).join(", ")
    };
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "no-cors", // Requerido para Apps Script Web Apps
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        orders: dataToSync
      }),
    });

    // Con no-cors no podemos ver el body, pero asumimos éxito si no hay excepción
    return { success: true };
  } catch (error) {
    console.error("Sheets sync error:", error);
    return { success: false, error };
  }
};
