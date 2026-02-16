
import { GoogleGenAI, Type } from "@google/genai";
import { OrderItem, Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const parseOrderWithAI = async (text: string, products: Product[]) => {
  const productNames = products.map(p => p.name).join(', ');
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analiza el siguiente pedido de panadería y extrae los productos y cantidades. 
    Los productos disponibles son: ${productNames}. 
    Si un producto no coincide exactamente, intenta mapearlo al más parecido.
    
    Pedido: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            quantity: { type: Type.NUMBER },
          },
          required: ["productName", "quantity"],
        }
      }
    }
  });

  try {
    const rawData = JSON.parse(response.text || '[]');
    const mappedItems: OrderItem[] = rawData.map((item: any) => {
      const product = products.find(p => p.name.toLowerCase().includes(item.productName.toLowerCase()));
      return product ? { productId: product.id, quantity: item.quantity } : null;
    }).filter(Boolean);
    
    return mappedItems;
  } catch (e) {
    console.error("Error parsing AI response", e);
    return [];
  }
};

export const getProductionInsights = async (productionData: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Como experto jefe de panadería, analiza este plan de producción semanal y da 3 consejos breves para optimizar el trabajo (tiempos de fermentación, uso de hornos, o preparación de masas). 
    
    Plan de producción: ${productionData}`,
  });
  return response.text;
};
