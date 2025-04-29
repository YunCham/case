import { useMutation, useSelf } from "@liveblocks/react";
import { LiveObject } from "@liveblocks/client";

// Definimos los tipos necesarios directamente en este archivo
type BaseLayer = {
  x: number;
  y: number;
  type: string;
};

export default function useCopyPaste() {
  const selection = useSelf((me) => me.presence.selection);
  
  const copyLayers = useMutation(
    ({ storage }) => {
      if (!selection?.length) return;
      
      const liveLayers = storage.get("layers");
      const layersToSave: Record<string, any> = {};
      
      selection.forEach((id) => {
        const layer = liveLayers.get(id);
        if (layer) {
          layersToSave[id] = layer.toObject();
        }
      });
      
      try {
        localStorage.setItem("figma-clipboard", JSON.stringify(layersToSave));
      } catch (err) {
        console.error("Error al copiar las capas:", err);
      }
    },
    [selection]
  );

  const pasteLayers = useMutation(
    ({ storage, setMyPresence }) => {
      try {
        const clipboard = localStorage.getItem("figma-clipboard");
        if (!clipboard) return;

        const liveLayers = storage.get("layers");
        const liveLayerIds = storage.get("layerIds");
        const copiedLayers = JSON.parse(clipboard);
        
        const newSelection: string[] = [];
        const OFFSET = 10; // Desplazamiento para elementos pegados

        Object.values(copiedLayers).forEach((layer: any) => {
          const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const newLayer = new LiveObject({
            ...layer,
            x: layer.x + OFFSET,
            y: layer.y + OFFSET
          });

          liveLayers.set(newId, newLayer);
          liveLayerIds.push(newId);
          newSelection.push(newId);
        });

        setMyPresence({ selection: newSelection }, { addToHistory: true });
      } catch (err) {
        console.error("Error al pegar las capas:", err);
      }
    },
    []
  );

  return {
    copyLayers,
    pasteLayers
  };
}