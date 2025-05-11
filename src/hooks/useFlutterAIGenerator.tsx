import { useMutation } from "@liveblocks/react";
import { captureCanvas } from "~/services/canvas-capture";
import { processImageWithGemini } from "~/services/gemini-processor";
import { generateFlutterCode } from "~/services/langchain-processor";
import { exportFlutterProject } from "~/services/flutter-exporter";
import { useToast } from "~/contexts/ToastContext";

export const useFlutterAIGeneratorGEMINI = (roomName: string) => {
  const { showToast } = useToast();

  const generateFlutterAIProject = useMutation(
    async ({ storage }) => {
      try {
        let canvasElement: HTMLElement | null = document.querySelector(
          ".absolute.h-screen.w-screen.overflow-hidden",
        );

        if (!canvasElement) {
          canvasElement = document.querySelector("svg.h-screen.w-screen")
            ?.parentElement as HTMLElement;
        }

        if (!canvasElement) {
          // Como último recurso, buscar cualquier elemento SVG que pueda ser el canvas
          // canvasElement = document.querySelector('svg') as HTMLElement;
          const svgElement = document.querySelector("svg");
          if (svgElement) {
            canvasElement = svgElement as unknown as HTMLElement;
          }
        }

        // Si aún no se encuentra, lanzar error
        if (!canvasElement) {
          throw new Error("No se pudo encontrar el elemento del canvas");
        }

        // Capturar la pantalla del canvas
        const canvasImage = await captureCanvas(canvasElement);

        // Obtener los datos del canvas para referencia adicional
        const layers = storage.get("layers").toImmutable();
        const layerIdsArray = storage.get("layerIds").toImmutable();
        const canvasColor = storage.get("roomColor");

        // Convertir el mapa de capas a un objeto para JSON
        const layersObject: Record<string, any> = {};
        layers.forEach((layer, id) => {
          layersObject[id] = JSON.parse(JSON.stringify(layer));
        });

        const canvasData = {
          layers: layersObject,
          layerIds: layerIdsArray,
          roomColor: canvasColor,
          exportedAt: new Date().toISOString(),
          name: roomName,
        };

        // Procesar la imagen con Gemini para analizar el diseño
        const uiStructureJson = await processImageWithGemini(
          canvasImage,
          canvasData,
        );

        // Generar código Flutter con OpenAI
        const flutterFiles = await generateFlutterCode(uiStructureJson);

        // Exportar el proyecto Flutter como ZIP
        await exportFlutterProject(flutterFiles, roomName);

        // alert(
        //   'Proyecto Flutter generado con éxito mediante IA. Descomprime el archivo y ejecuta "flutter pub get" para instalar las dependencias.',
        // );
        showToast(
          'Proyecto Flutter generado con éxito mediante IA. Descomprime el archivo y ejecuta "flutter pub get" para instalar las dependencias.',
          "success"
        );
      } catch (error: unknown) {
        console.error("Error generando proyecto Flutter con IA:", error);

        // Manejar el error de forma segura
        let errorMessage = "Error desconocido";

        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else if (error && typeof error === "object" && "message" in error) {
          errorMessage = String(error.message);
        }

        // alert(`Error al generar el proyecto Flutter con IA: ${errorMessage}`);
        showToast(`Error al generar el proyecto Flutter con IA: ${errorMessage}`, "error");
      }
    },
    [roomName],
  );

  return generateFlutterAIProject;
};
