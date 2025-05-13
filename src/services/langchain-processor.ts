import { ChatOpenAI } from "@langchain/openai";

export const generateFlutterCode = async (
  uiStructureJson: any,
): Promise<any> => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("API key for OpenAI is not defined");
    }

    const openai = new ChatOpenAI({
      apiKey: apiKey,
      temperature: 0.2,
      modelName: "gpt-4o",
    });

    // Definir con un   prompt  al agente del sistema
    // const systemPrompt = `Eres un desarrollador experto de Flutter, usando materias 3. Tu tarea es convertir una descripción JSON de una UI en un proyecto Flutter completo, modular y funcional.
    // La respuesta DEBE SER ÚNICAMENTE un objeto JSON que represente un array de archivos. Cada objeto de archivo debe tener "path" y "content".
    // No incluyas ningún texto explicativo, markdown o comentarios fuera de la estructura JSON principal.`;
    const systemPrompt = `
Eres un desarrollador experto en Flutter y tu Tu tarea objetivo es convertir una descripción JSON de una UI en un proyecto completamente funcional, modular y actualizado.
Debes utilizar **Material 3 (useMaterial3: true) backgroundColor, foregroundColor** en toda la configuración del tema.
Usa el enfoque moderno para definir colores con **ColorScheme.fromSeed()** y configura una tipografía moderna mediante 
**GoogleFonts** (como,GoogleFonts.poppinsTextTheme(), Poppins o Roboto, pero no Arial),dependecia google_fonts: ^6.2.1.
La respuesta DEBE SER ÚNICAMENTE un objeto JSON que represente un array de archivos. Cada objeto de archivo debe tener "path" y "content".
NO incluyas texto explicativo, markdown ni comentarios fuera de la estructura JSON principal.
`;

    const humanPrompt = `
A partir del siguiente JSON estructurado que describe una aplicación Flutter:
\`\`\`json
${JSON.stringify(uiStructureJson, null, 2)}
\`\`\`

Genera:
1. Un archivo \`main.dart\` con MaterialApp, rutas (la primera vista es la inicial '/') y navegación básica.
2. Una clase Dart para cada vista (ej. \`lib/views/nombre_vista_snake_case.dart\`).
3. Un \`pubspec.yaml\` válido. El nombre del proyecto debe ser el \`viewName\` de la primera vista en snake_case, o "generated_flutter_app". Dependencias: flutter, cupertino_icons, google_fonts (si se infieren fuentes). flutter_lints en dev_dependencies.
4. Widgets personalizados reutilizables en \`lib/widgets/\` para elementos comunes (botones, campos de texto, tarjetas) si se repiten o son complejos.
5. Usa StatefulWidget solo si es estrictamente necesario para estado local simple (ej. controlar un campo de texto). Prefiere StatelessWidget.
6. Implementa navegación básica entre pantallas con \`Navigator.pushNamed(context, '/ruta');\` si un widget (ej. botón) tiene una propiedad como \`"navigateTo": "OtraVista"\` en sus \`properties\`. Las rutas deben coincidir con los \`viewName\` convertidos a path (ej. "OtraVista" -> "/otra_vista").
7. Para \`text_input\`, usa \`TextFormField\` y considera validación básica si se infiere del placeholder o descripción.
8. Implementa un tema básico y estilos consistentes. Usa \`Theme.of(context)\` para acceder a estilos.
9. Convierte colores HEX (#RRGGBB o #AARRGGBB) a \`Color(0xAARRGGBB)\`. Si no hay alfa, asume FF.
10. Para padding/margin en \`properties\` (ej. "16" o "8,16,8,16" LTRB), conviértelos a \`EdgeInsets\`.
11. Para \`type: "icon"\` o \`icon_button\`, la propiedad \`iconName\` (ej. "settings") debe mapearse a \`Icons.settings\`. Si no es estándar, usa \`Icons.help_outline\`.
12. Para \`type: "image"\`, si \`properties.sourceUrl\` existe, usa \`Image.network(properties.sourceUrl)\`. Si no, usa \`Placeholder(fallbackHeight: properties.height ?? 100, fallbackWidth: properties.width ?? 100)\`.

Asegúrate de:
- Seguir las mejores prácticas de Flutter (separación de UI y lógica).
- Usar widgets eficientes y optimizados, añadiendo \`const\` donde sea posible.
- Generar código bien formateado y con comentarios donde la lógica sea compleja.
- Estructurar el código de manera modular y mantenible.

Devuelve todos los archivos en un ÚNICO objeto JSON con este formato exacto:
[
  { "path": "lib/views/productos_view.dart", "content": "..." },
  { "path": "lib/widgets/custom_button.dart", "content": "..." },
  { "path": "pubspec.yaml", "content": "..." }
  // ... más archivos
]
El JSON debe ser válido y estar correctamente formateado. NO incluyas ningún texto fuera del array JSON.
`;

    const response = await openai.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: humanPrompt },
    ]);

    try {
      let content = response.content;
      console.log("Respuesta de OpenAI:", content);
      if (typeof content === "string") {
        const cleaned = cleanAIJsonResponse(content);
        content = cleaned;
      }

      if (typeof content === "string") {
        return JSON.parse(content);
      } else if (Array.isArray(content)) {
        // Si es un array, verificar que tenga elementos y que el primer elemento tenga una propiedad que podamos usar
        if (content.length > 0) {
          const firstItem = content[0];
          // Verificar si tiene una propiedad text o value que podamos usar
          if (typeof firstItem === "object" && firstItem !== null) {
            if ("text" in firstItem && typeof firstItem.text === "string") {
              return JSON.parse(firstItem.text);
            } else if (
              "value" in firstItem &&
              typeof firstItem.value === "string"
            ) {
              return JSON.parse(firstItem.value);
            }
          }
        }

        if (typeof content === "string") {
          const cleaned = cleanAIJsonResponse(content);
          return JSON.parse(cleaned);
        }

        // Si no podemos extraer datos del array, convertir todo el array a string
        return JSON.parse(JSON.stringify(content));
      } else if (content && typeof content === "object") {
        // Si ya es un objeto
        return content;
      } else {
        throw new Error("Formato de respuesta no reconocido");
      }
    } catch (e) {
      console.error("Error al parsear JSON de OpenAI:", e);
      throw new Error("La respuesta de OpenAI no contiene un JSON válido");
    }
  } catch (error) {
    console.error("Error generando código Flutter con OpenAI:", error);
    throw error;
  }

  function cleanAIJsonResponse(raw: string): string {
    // Elimina bloques de markdown tipo ```json ... ```
    raw = raw.trim();
    if (raw.startsWith("```json")) {
      raw = raw
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (raw.startsWith("```")) {
      raw = raw.replace(/^```/, "").replace(/```$/, "").trim();
    }

    // Intenta encontrar el primer [ ... ] que represente el array
    const firstBracket = raw.indexOf("[");
    const lastBracket = raw.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket !== -1) {
      raw = raw.slice(firstBracket, lastBracket + 1);
    }

    return raw;
  }
};
