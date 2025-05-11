"use client";

import {
  useCanRedo,
  useCanUndo,
  useHistory,
  useMutation,
  useMyPresence,
  useSelf,
  useStorage,
} from "@liveblocks/react";
import {
  colorToCss,
  findIntersectionLayersWithRectangle,
  penPointsToPathPayer,
  pointerEventToCanvasPoint,
  resizeBounds,
} from "~/utils";
import LayerComponent from "./LayerComponent";
import {
  Camera,
  CanvasMode,
  CanvasState,
  EllipseLayer,
  Layer,
  LayerType,
  Point,
  RectangleLayer,
  Side,
  TextLayer,
  XYWH,
} from "~/types";
import { nanoid } from "nanoid";
import { LiveObject } from "@liveblocks/client";
import { useCallback, useEffect, useRef, useState } from "react";
import React from "react";
import ToolsBar from "../toolsbar/ToolsBar";
import Path from "./Path";
import SelectionBox from "./SelectionBox";
import useDeleteLayers from "~/hooks/useDeleteLayers";
import SelectionTools from "./SelectionTools";
import Sidebars from "../sidebars/Sidebars";
import MultiplayerGuides from "./MultiplayerGuides";
import { User } from "@prisma/client";
import { ActionButton } from "./ActionButtonProps";
import { GoogleGenAI, createUserContent } from "@google/genai";

// Importar el hook para generar proyectos Angular
import { useAngularProjectGenerator } from "../angular-generator/useAngularProjectGenerator";
// Importar el hook para generar proyectos flutter
import { useFlutterProjectGenerator } from "~/components/flutter-generator/useFlutterProjectGenerator";
//Importar el hook para generar copy&pase con teclado
import useCopyPaste from "~/hooks/useCopyPaste";
import { useFlutterAIGeneratorGEMINI } from "~/hooks/useFlutterAIGenerator";

const MAX_LAYERS = 100;

export default function Canvas({
  roomName,
  roomId,
  othersWithAccessToRoom,
}: {
  roomName: string;
  roomId: string;
  othersWithAccessToRoom: User[];
}) {
  // Obtener la función para generar proyectos Angular
  const generateAngularProject = useAngularProjectGenerator(roomName);
  // Obtener la función para generar proyectos Flutter
  const generateFlutterProject = useFlutterProjectGenerator(roomName);

  // Obtener la funcion para copiar y pegar capas
  const { copyLayers, pasteLayers } = useCopyPaste();

  const generateFlutterAIProject = useFlutterAIGeneratorGEMINI(roomName);
  const [loading, setLoading] = useState(false); // Nuevo estado para el indicador de carga

  const generateFlutter = async () => {
    setLoading(true);
    try {
      await generateFlutterAIProject(); // Aquí se invoca la mutación real
    } catch (err) {
      console.error("Error al generar proyecto:", err);
    } finally {
      setLoading(false);
    }
  };

  const [leftIsMinimized, setLeftIsMinimized] = useState(false);
  const [isProcessingSketch, setIsProcessingSketch] = useState(false);
  const roomColor = useStorage((root) => root.roomColor);
  const layerIds = useStorage((root) => root.layerIds);
  const pencilDraft = useSelf((me) => me.presence.pencilDraft);
  const deleteLayers = useDeleteLayers();
  const [canvasState, setState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sketchImageInputRef = useRef<HTMLInputElement>(null);

  const selectAllLayers = useMutation(
    ({ setMyPresence }) => {
      if (layerIds) {
        setMyPresence({ selection: [...layerIds] }, { addToHistory: true });
      }
    },
    [layerIds],
  );

  // Función para exportar el lienzo a JSON
  const exportToJSON = useMutation(
    ({ storage }) => {
      const layers = storage.get("layers").toImmutable();
      const layerIdsArray = storage.get("layerIds").toImmutable();
      const canvasColor = storage.get("roomColor");

      // Convertir el mapa de capas a un objeto para JSON
      const layersObject: Record<string, any> = {};
      layers.forEach((layer, id) => {
        // Usar JSON.parse(JSON.stringify()) en lugar de toObject()
        layersObject[id] = JSON.parse(JSON.stringify(layer));
      });

      const canvasData = {
        layers: layersObject,
        layerIds: layerIdsArray,
        roomColor: canvasColor,
        exportedAt: new Date().toISOString(),
        name: roomName,
      };

      // Crear y descargar el archivo JSON
      const jsonString = JSON.stringify(canvasData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${roomName.replace(/\s+/g, "_")}_canvas_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [roomName],
  );

  // Función para importar desde JSON
  const importFromJSON = useMutation(
    ({ storage, setMyPresence }, jsonData: any) => {
      try {
        // Validar que el JSON tenga la estructura esperada
        if (!jsonData.layers || !jsonData.layerIds) {
          throw new Error("Invalid JSON format: missing layers or layerIds");
        }

        // Obtener referencias al almacenamiento
        const liveLayers = storage.get("layers");
        const liveLayerIds = storage.get("layerIds");

        // Limpiar el lienzo actual
        // Fix: Usar delete en lugar de pop para LiveList
        const currentLength = liveLayerIds.length;
        for (let i = currentLength - 1; i >= 0; i--) {
          liveLayerIds.delete(i);
        }

        // Limpiar todas las capas existentes
        const existingLayerIds = [...liveLayers.keys()];
        existingLayerIds.forEach((id) => {
          liveLayers.delete(id);
        });

        // Importar el color de la sala si existe
        if (jsonData.roomColor) {
          storage.set("roomColor", jsonData.roomColor);
        }

        // Importar las capas
        Object.entries(jsonData.layers).forEach(([id, layerData]) => {
          // Cast the layerData to Layer type to ensure type safety
          const typedLayerData = layerData as Layer;
          liveLayers.set(id, new LiveObject(typedLayerData));
        });

        // Importar los IDs de las capas en el orden correcto
        jsonData.layerIds.forEach((id: string, index: number) => {
          liveLayerIds.push(id);
        });

        // Deseleccionar todo
        setMyPresence({ selection: [] });

        // Restablecer el estado del lienzo
        setState({ mode: CanvasMode.None });
      } catch (error) {
        console.error("Error importing JSON:", error);
        alert("Error importing file. Please check the file format.");
      }
    },
    [],
  );

  // Manejador para la carga de archivos
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          importFromJSON(jsonData);
        } catch (error) {
          console.error("Error parsing JSON file:", error);
          alert("Invalid JSON file format");
        }
      };
      reader.readAsText(file);

      // Limpiar el input para permitir cargar el mismo archivo nuevamente
      event.target.value = "";
    },
    [importFromJSON],
  );

  // Función para procesar una imagen de boceto con Gemini AI
  const processSketchWithGemini = useMutation(
    async ({ storage }, file: File) => {
      try {
        setIsProcessingSketch(true);

        // Inicializar el cliente de Gemini AI
        const ai = new GoogleGenAI({
          apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || "",
        });

        // Convertir la imagen a formato base64
        const fileArrayBuffer = await file.arrayBuffer();
        const fileUint8Array = new Uint8Array(fileArrayBuffer);
        const base64 = btoa(String.fromCharCode(...fileUint8Array));
        const mimeType = file.type;

        // Crear la parte de imagen para la API
        const imagePart = {
          inlineData: {
            data: base64,
            mimeType,
          },
        };

        // Solicitar a Gemini que convierta el boceto en un diseño JSON
        const prompt = `
      Esta es una imagen de un boceto/wireframe de un diseño de interfaz de usuario. 
      Por favor, analiza esta imagen y conviértela en una representación JSON que pueda ser utilizada en una herramienta de diseño.
      
      Identifica todos los elementos de la interfaz como:
      - Encabezados, barras de navegación (rectángulos)
      - Botones (rectángulos)
      - Elementos de texto (etiquetas, títulos)
      - Imágenes o marcadores de posición (rectángulos con X)
      - los elementos que tengan imágenes, tengan el estilo de https://placehold.co
      - los elementos de la interfaz asegúrate de que los elementos estén correctamente organizados y que estén en el orden correcto.
      
      
      El JSON debe seguir esta estructura:
      {
        "layers": {
          "[ID]": {
            "type": [0 para Rectángulo, 1 para Elipse, 3 para Texto],
            "x": [posición_x],
            "y": [posición_y],
            "height": [altura],
            "width": [ancho],
            "fill": {"r": [0-255], "g": [0-255], "b": [0-255]},
            "stroke": {"r": [0-255], "g": [0-255], "b": [0-255]},
            "opacity": [0-100]
          }
          // Para elementos de texto (tipo 3), incluir: fontSize, text, fontWeight, fontFamily
        },
        "layerIds": ["[ID1]", "[ID2]", ...],
        "roomColor": {"r": 30, "g": 30, "b": 30}
      }
      
      Responde solo con el JSON, sin explicaciones.`;

        // Enviar la solicitud a Gemini usando la nueva API
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [createUserContent([prompt, imagePart])],
        });

        // Corregido: Acceder correctamente al texto de la respuesta según la estructura de la API
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          throw new Error("No se pudo obtener respuesta de texto de Gemini");
        }

        // Extraer el JSON de la respuesta
        const jsonMatch =
          text.match(/```json\n([\s\S]*?)\n```/) ||
          text.match(/```\n([\s\S]*?)\n```/) ||
          text.match(/{[\s\S]*}/);

        if (!jsonMatch) {
          throw new Error("No se pudo extraer JSON de la respuesta de Gemini");
        }

        // Parsear el JSON - Corregido para manejar posibles undefined
        const jsonString = jsonMatch[0].startsWith("{")
          ? jsonMatch[0]
          : jsonMatch[1] || jsonMatch[0];
        const jsonData = JSON.parse(jsonString);

        // Importar el diseño generado
        importFromJSON(jsonData);
      } catch (error) {
        console.error("Error al procesar boceto con Gemini AI:", error);
        alert("Error al procesar el boceto. Por favor, intenta de nuevo.");
      } finally {
        setIsProcessingSketch(false);
      }
    },
    [importFromJSON],
  );

  // Manejador para la carga de imágenes de boceto
  const handleSketchUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      processSketchWithGemini(file);

      // Limpiar el input para permitir cargar la misma imagen nuevamente
      event.target.value = "";
    },
    [processSketchWithGemini],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const activeElement = document.activeElement;
      const isInputField =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA");

      if (isInputField) return;

      switch (e.key) {
        case "Backspace":
          deleteLayers();
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              history.redo();
            } else {
              history.undo();
            }
          }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            selectAllLayers();
            break;
          }
          break;
        //begin copy
        //begin copy
        case "c":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            copyLayers();
            break;
          }
          break;
        case "v":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            pasteLayers();
            break;
          }
          break;
        //end copy
        case "s":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            exportToJSON();
            break;
          }
          break;
        case "o":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            fileInputRef.current?.click();
            break;
          }
          break;
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteLayers, exportToJSON]);

  const onLayerPointerDown = useMutation(
    ({ self, setMyPresence }, e: React.PointerEvent, layerId: string) => {
      if (
        canvasState.mode === CanvasMode.Pencil ||
        canvasState.mode === CanvasMode.Inserting
      ) {
        return;
      }

      history.pause();
      e.stopPropagation();
      if (!self.presence.selection.includes(layerId)) {
        setMyPresence(
          {
            selection: [layerId],
          },
          { addToHistory: true },
        );
      }

      if (e.nativeEvent.button === 2) {
        setState({ mode: CanvasMode.RightClick });
      } else {
        const point = pointerEventToCanvasPoint(e, camera);
        setState({ mode: CanvasMode.Translating, current: point });
      }
    },
    [camera, canvasState.mode, history],
  );

  const onResizeHandlePointerDown = useCallback(
    (corner: Side, initialBounds: XYWH) => {
      history.pause();
      setState({
        mode: CanvasMode.Resizing,
        initialBounds,
        corner,
      });
    },
    [history],
  );

  const insertLayer = useMutation(
    (
      { storage, setMyPresence },
      layerType: LayerType.Ellipse | LayerType.Rectangle | LayerType.Text,
      position: Point,
    ) => {
      const liveLayers = storage.get("layers");
      if (liveLayers.size >= MAX_LAYERS) {
        return;
      }

      const liveLayerIds = storage.get("layerIds");
      const layerId = nanoid();
      let layer: LiveObject<Layer> | null = null;

      if (layerType === LayerType.Rectangle) {
        layer = new LiveObject<RectangleLayer>({
          type: LayerType.Rectangle,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fill: { r: 217, g: 217, b: 217 },
          stroke: { r: 217, g: 217, b: 217 },
          opacity: 100,
        });
      } else if (layerType === LayerType.Ellipse) {
        layer = new LiveObject<EllipseLayer>({
          type: LayerType.Ellipse,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fill: { r: 217, g: 217, b: 217 },
          stroke: { r: 217, g: 217, b: 217 },
          opacity: 100,
        });
      } else if (layerType === LayerType.Text) {
        layer = new LiveObject<TextLayer>({
          type: LayerType.Text,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fontSize: 16,
          text: "Text",
          fontWeight: 400,
          fontFamily: "Inter",
          stroke: { r: 217, g: 217, b: 217 },
          fill: { r: 217, g: 217, b: 217 },
          opacity: 100,
        });
      }

      if (layer) {
        liveLayerIds.push(layerId);
        liveLayers.set(layerId, layer);

        setMyPresence({ selection: [layerId] }, { addToHistory: true });
        setState({ mode: CanvasMode.None });
      }
    },
    [],
  );

  const insertPath = useMutation(({ storage, self, setMyPresence }) => {
    const liveLayers = storage.get("layers");
    const { pencilDraft } = self.presence;

    if (
      pencilDraft === null ||
      pencilDraft.length < 2 ||
      liveLayers.size >= MAX_LAYERS
    ) {
      setMyPresence({ pencilDraft: null });
      return;
    }

    const id = nanoid();
    liveLayers.set(
      id,
      new LiveObject(
        penPointsToPathPayer(pencilDraft, { r: 217, g: 217, b: 217 }),
      ),
    );

    const liveLayerIds = storage.get("layerIds");
    liveLayerIds.push(id);
    setMyPresence({ pencilDraft: null });
    setState({ mode: CanvasMode.Pencil });
  }, []);

  const translateSelectedLayers = useMutation(
    ({ storage, self }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Translating) {
        return;
      }

      const offset = {
        x: point.x - canvasState.current.x,
        y: point.y - canvasState.current.y,
      };

      const liveLayers = storage.get("layers");
      for (const id of self.presence.selection) {
        const layer = liveLayers.get(id);
        if (layer) {
          layer.update({
            x: layer.get("x") + offset.x,
            y: layer.get("y") + offset.y,
          });
        }
      }

      setState({ mode: CanvasMode.Translating, current: point });
    },
    [canvasState],
  );

  const resizeSelectedLayer = useMutation(
    ({ storage, self }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Resizing) {
        return;
      }

      const bounds = resizeBounds(
        canvasState.initialBounds,
        canvasState.corner,
        point,
      );

      const liveLayers = storage.get("layers");

      if (self.presence.selection.length > 0) {
        const layer = liveLayers.get(self.presence.selection[0]!);
        if (layer) {
          layer.update(bounds);
        }
      }

      // Update layers to set the new width and height of the layer
    },
    [canvasState],
  );

  const unselectLayers = useMutation(({ self, setMyPresence }) => {
    if (self.presence.selection.length > 0) {
      setMyPresence({ selection: [] }, { addToHistory: true });
    }
  }, []);

  const startDrawing = useMutation(
    ({ setMyPresence }, point: Point, pressure: number) => {
      setMyPresence({
        pencilDraft: [[point.x, point.y, pressure]],
        penColor: { r: 217, g: 217, b: 217 },
      });
    },
    [],
  );

  const continueDrawing = useMutation(
    ({ self, setMyPresence }, point: Point, e: React.PointerEvent) => {
      const { pencilDraft } = self.presence;

      if (
        canvasState.mode !== CanvasMode.Pencil ||
        e.buttons !== 1 ||
        pencilDraft === null
      ) {
        return;
      }

      setMyPresence({
        cursor: point,
        pencilDraft: [...pencilDraft, [point.x, point.y, e.pressure]],
      });
    },
    [canvasState.mode],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    setCamera((camera) => ({
      x: camera.x - e.deltaX,
      y: camera.y - e.deltaY,
      zoom: camera.zoom,
    }));
  }, []);

  const onPointerDown = useMutation(
    ({}, e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, camera);

      if (canvasState.mode === CanvasMode.Dragging) {
        setState({ mode: CanvasMode.Dragging, origin: point });
        return;
      }

      if (canvasState.mode === CanvasMode.Inserting) return;

      if (canvasState.mode === CanvasMode.Pencil) {
        startDrawing(point, e.pressure);
        return;
      }

      setState({ origin: point, mode: CanvasMode.Pressing });
    },
    [camera, canvasState.mode, setState, startDrawing],
  );

  const startMultiSelection = useCallback((current: Point, origin: Point) => {
    if (Math.abs(current.x - origin.x) + Math.abs(current.y - origin.y) > 5) {
      setState({ mode: CanvasMode.SelectionNet, origin, current });
    }
  }, []);

  const updateSelectionNet = useMutation(
    ({ storage, setMyPresence }, current: Point, origin: Point) => {
      if (layerIds) {
        const layers = storage.get("layers").toImmutable();
        setState({
          mode: CanvasMode.SelectionNet,
          origin,
          current,
        });
        const ids = findIntersectionLayersWithRectangle(
          layerIds,
          layers,
          origin,
          current,
        );
        setMyPresence({ selection: ids });
      }
    },
    [layerIds],
  );

  const onPointerMove = useMutation(
    ({ setMyPresence }, e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, camera);

      if (canvasState.mode === CanvasMode.Pressing) {
        startMultiSelection(point, canvasState.origin);
      } else if (canvasState.mode === CanvasMode.SelectionNet) {
        updateSelectionNet(point, canvasState.origin);
      } else if (
        canvasState.mode === CanvasMode.Dragging &&
        canvasState.origin !== null
      ) {
        const deltaX = e.movementX;
        const deltaY = e.movementY;

        setCamera((camera) => ({
          x: camera.x + deltaX,
          y: camera.y + deltaY,
          zoom: camera.zoom,
        }));
      } else if (canvasState.mode === CanvasMode.Translating) {
        translateSelectedLayers(point);
      } else if (canvasState.mode === CanvasMode.Pencil) {
        continueDrawing(point, e);
      } else if (canvasState.mode === CanvasMode.Resizing) {
        resizeSelectedLayer(point);
      }
      setMyPresence({ cursor: point });
    },
    [
      camera,
      canvasState,
      translateSelectedLayers,
      continueDrawing,
      resizeSelectedLayer,
      updateSelectionNet,
      startMultiSelection,
    ],
  );

  const onPointerLeave = useMutation(({ setMyPresence }) => {
    setMyPresence({ cursor: null });
  }, []);

  const onPointerUp = useMutation(
    ({}, e: React.PointerEvent) => {
      if (canvasState.mode === CanvasMode.RightClick) return;

      const point = pointerEventToCanvasPoint(e, camera);

      if (
        canvasState.mode === CanvasMode.None ||
        canvasState.mode === CanvasMode.Pressing
      ) {
        unselectLayers();
        setState({ mode: CanvasMode.None });
      } else if (canvasState.mode === CanvasMode.Inserting) {
        insertLayer(canvasState.layerType, point);
      } else if (canvasState.mode === CanvasMode.Dragging) {
        setState({ mode: CanvasMode.Dragging, origin: null });
      } else if (canvasState.mode === CanvasMode.Pencil) {
        insertPath();
      } else {
        setState({ mode: CanvasMode.None });
      }
      history.resume();
    },
    [canvasState, setState, insertLayer, unselectLayers, history],
  );

  return (
    <div className="flex h-screen w-full">
      <main className="fixed left-0 right-0 h-screen overflow-y-auto">
        {/* Botones de exportación, importación y procesamiento de bocetos */}
        <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 transform gap-2">
          {/* <button 
    onClick={() => exportToJSON()} 
    className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600" 
    title="Export to JSON (Ctrl+S)" 
  > 
    Export JSON 
  </button> */}

          {/* <label className="cursor-pointer rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"> 
    Import JSON 
    <input 
      ref={fileInputRef} 
      type="file" 
      accept=".json" 
      onChange={handleFileUpload} 
      className="hidden" 
      title="Import from JSON (Ctrl+O)" 
    /> 
  </label> */}

          <label
            className={`${
              isProcessingSketch
                ? "bg-gray-100 text-gray-400"
                : "bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700"
            } flex h-10 w-10 cursor-pointer items-center justify-center rounded-full p-3 shadow-md transition-all duration-200`}
            title="Convertir Boceto a Diseño con Gemini AI"
          >
            {isProcessingSketch ? (
              <svg
                className="h-5 w-5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            )}
            <input
              ref={sketchImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleSketchUpload}
              className="hidden"
              disabled={isProcessingSketch}
            />
          </label>

          {/* Nuevo botón para generar proyecto Angular */}
          <button
            onClick={() => generateAngularProject()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-pink-600 p-3 text-white shadow-md transition-all duration-200 hover:from-red-600 hover:to-pink-700"
            title="Generar Proyecto Angular"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </button>

          <button
            onClick={() => generateFlutterProject()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-pink-600 p-3 text-white shadow-md transition-all duration-200 hover:from-blue-600 hover:to-pink-700"
            title="Generar Proyecto Flutter"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </button>

          {/* Nuevo botón para generar proyecto Flutter 2.0 */}

          <ActionButton
            title="Generar Proyecto Flutter"
            onClick={() => generateFlutter()}
            isLoading={loading}
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 256 317"
                className="h-5 w-5"
              >
                <g fill="none">
                  <path
                    fill="#42A5F5"
                    d="M14.1 158.5 141.4 31.3h78.6L92.9 158.5l-78.8 78.9H0z"
                  />
                  <path fill="#0D47A1" d="m92.9 237.4 55.3 55.3h78.6l-94-94z" />
                  <path fill="#42A5F5" d="m92.9 237.4 94-94-38.8-38.9-94 94z" />
                </g>
              </svg>
            }
          />
        </div>
        <div
          style={{
            backgroundColor: roomColor ? colorToCss(roomColor) : "#1e1e1e",
          }}
          className="h-full w-full touch-none"
        >
          <SelectionTools camera={camera} canvasMode={canvasState.mode} />
          <svg
            onWheel={onWheel}
            onPointerUp={onPointerUp}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            className="h-full w-full"
            onContextMenu={(e) => e.preventDefault()}
          >
            <g
              style={{
                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
              }}
            >
              {layerIds?.map((layerId) => (
                <LayerComponent
                  key={layerId}
                  id={layerId}
                  onLayerPointerDown={onLayerPointerDown}
                />
              ))}
              <SelectionBox
                onResizeHandlePointerDown={onResizeHandlePointerDown}
              />
              {canvasState.mode === CanvasMode.SelectionNet &&
                canvasState.current != null && (
                  <rect
                    className="fill-blue-600/5 stroke-blue-600 stroke-[0.5]"
                    x={Math.min(canvasState.origin.x, canvasState.current.x)}
                    y={Math.min(canvasState.origin.y, canvasState.current.y)}
                    width={Math.abs(
                      canvasState.origin.x - canvasState.current.x,
                    )}
                    height={Math.abs(
                      canvasState.origin.y - canvasState.current.y,
                    )}
                  />
                )}
              <MultiplayerGuides />
              {pencilDraft !== null && pencilDraft.length > 0 && (
                <Path
                  x={0}
                  y={0}
                  opacity={100}
                  fill={colorToCss({ r: 217, g: 217, b: 217 })}
                  points={pencilDraft}
                />
              )}
            </g>
          </svg>
        </div>
      </main>

      <ToolsBar
        canvasState={canvasState}
        setCanvasState={(newState) => setState(newState)}
        zoomIn={() => {
          setCamera((camera) => ({ ...camera, zoom: camera.zoom + 0.1 }));
        }}
        zoomOut={() => {
          setCamera((camera) => ({ ...camera, zoom: camera.zoom - 0.1 }));
        }}
        canZoomIn={camera.zoom < 2}
        canZoomOut={camera.zoom > 0.5}
        redo={() => history.redo()}
        undo={() => history.undo()}
        canRedo={canRedo}
        canUndo={canUndo}
      />
      <Sidebars
        roomName={roomName}
        roomId={roomId}
        othersWithAccessToRoom={othersWithAccessToRoom}
        leftIsMinimized={leftIsMinimized}
        setLeftIsMinimized={setLeftIsMinimized}
      />
    </div>
  );
}
