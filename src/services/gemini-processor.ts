import { GoogleGenerativeAI } from "@google/generative-ai";
import { Base64ConversionResult } from "~/types";

export const processImageWithGemini = async (
  imageBlob: Blob,
  designJson?: any,
): Promise<any> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("API key for Gemini is not defined");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const imageBase64 = await blobToBase64(imageBlob);

    const imagePart = {
      inlineData: {
        data: imageBase64.base64Data,
        mimeType: imageBase64.mimeType,
      },
    };

    const promptForGemini = `
A partir de esta imagen de una pantalla móvil y, opcionalmente, el JSON de diseño que la acompaña, genera un JSON estructurado con las vistas detectadas (viewName) y dentro de cada una, sus widgets. Para cada widget incluye:

- type (button, text, image, container, row, column, stack, list_item, app_bar, bottom_navigation_bar, text_input, card, icon_button, floating_action_button, etc.)
- text o description (si aplica, el texto visible)
- properties (con estilo, color, tamaño, fuente, padding, margin, alineación, icono si es un icon_button, etc. - sé muy específico con colores en formato hexadecimal #RRGGBB o #AARRGGBB)
- children (si es un contenedor como container, row, column, card, list_item, stack, etc., lista los widgets hijos)

Analiza cuidadosamente:
1. La jerarquía de elementos (qué contiene a qué). Los elementos "container" pueden usarse para agrupar.
2. Los colores exactos (en hexadecimal #RRGGBB).
3. Las dimensiones relativas y absolutas si son inferibles.
4. Los estilos de texto (tamaño en puntos, peso como 'bold', 'normal', familia si es reconocible).
5. Los espaciados y márgenes (intenta inferir padding y margin alrededor de los elementos).
6. Identifica elementos de navegación (tabs, drawer, AppBar, BottomNavigationBar). Nómbralos con tipos claros.
7. Detecta patrones de diseño (cards, lists, grids). Un \`card\` puede tener \`children\`. Una lista sería un array de \`list_item\`.
8. Para \`text_input\`, incluye propiedades como \`placeholder\` o \`label\`.
9. Para \`image\`, si es un placeholder, indícalo. Si parece una imagen real, solo pon \`type: "image"\` y si puedes inferir una URL de placeholder como "https://placehold.co/WIDTHxHEIGHT", inclúyela en properties.sourceUrl.

${
  designJson
    ? `JSON de Diseño (opcional, para referencia estructural si la imagen no es clara):
\`\`\`json
${JSON.stringify(designJson, null, 2)}
\`\`\``
    : ""
}

El formato de respuesta debe ser un array de vistas, cada una con un nombre y sus widgets.
`;

    const result = await model.generateContent([promptForGemini, imagePart]);
    const response = result.response;
    const text = response.text();
    console.log("Respuesta de Gemini:", text);

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
      text.match(/```\s*([\s\S]*?)\s*```/) || [null, text];

    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch (e) {
        console.error("Error al parsear JSON de Gemini:", e);
        throw new Error("La respuesta de Gemini no contiene un JSON válido");
      }
    } else {
      throw new Error("No se pudo extraer JSON de la respuesta de Gemini");
    }
  } catch (error) {
    console.error("Error procesando imagen con Gemini:", error);
    throw error;
  }
};

// Función auxiliar para convertir Blob a Base64

const blobToBase64 = (blob: Blob): Promise<Base64ConversionResult> => {
  return new Promise((resolve, reject) => {
    // 1. Validar la entrada
    if (!blob) {
      return reject(new Error("El Blob proporcionado es nulo o indefinido."));
    }
    if (!(blob instanceof Blob)) {
      return reject(
        new Error("La entrada proporcionada no es un objeto Blob válido."),
      );
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const base64StringWithPrefix = reader.result;
        const parts = base64StringWithPrefix.split(",");

        if (parts.length < 2 || !parts[1]) {
          // parts[1] no debe estar vacío
          reject(
            new Error(
              "Formato de string base64 inválido después de la lectura del Blob. Faltan datos después de la coma.",
            ),
          );
          return;
        }

        // extraemos el mimeType del prefijo                                    ejemplo: data:image/png;base64
        let mimeType = "application/octet-stream"; // Default MIME type
        if (parts[0]) {
          const mimeMatch = parts[0].match(/:(.*?);/);
          if (mimeMatch && mimeMatch[1]) {
            mimeType = mimeMatch[1];
          } else if (blob.type) {
            // Fallback al tipo del blob original si el prefijo es extraño
            mimeType = blob.type;
          }
        } else if (blob.type) {
          // Si parts[0] está vacío, usa el tipo del blob
          mimeType = blob.type;
        }

        resolve({ base64Data: parts[1], mimeType });
      } else {
        reject(
          new Error(
            "El resultado de FileReader no fue un string como se esperaba.",
          ),
        );
      }
    };

    reader.onerror = () => {
      // FileReader.error contiene un DOMException
      const error =
        reader.error ||
        new Error(
          "Error desconocido durante la lectura del Blob con FileReader.",
        );
      console.error("Error en FileReader:", error);
      reject(
        new Error(`Error al leer el Blob: ${error.message || error.name}`),
      );
    };

    // Iniciar la lectura del Blob
    try {
      reader.readAsDataURL(blob);
    } catch (e: any) {
      // Capturar errores síncronos que podrían ocurrir al llamar a readAsDataURL (raro)
      console.error("Error al iniciar readAsDataURL:", e);
      reject(new Error(`Error al iniciar la lectura del Blob: ${e.message}`));
    }
  });
};
