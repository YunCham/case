
import html2canvas from 'html2canvas';

export const captureCanvas = async (canvasElement: HTMLElement | SVGSVGElement): Promise<Blob> => {
  try {
    // Verificar si el elemento es un SVG
    if (canvasElement instanceof SVGElement) {
      return captureSVG(canvasElement as SVGSVGElement);
    }
    
    // Si no es SVG, usar html2canvas
    const canvas = await html2canvas(canvasElement as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
    });
    
    // Convertir el canvas a Blob (formato PNG)
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Error al convertir canvas a imagen'));
        }
      }, 'image/png', 0.95);
    });
  } catch (error) {
    console.error('Error capturando canvas:', error);
    throw new Error('No se pudo capturar la imagen del canvas');
  }
};

const captureSVG = (svgElement: SVGSVGElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Asegurarse de que tiene dimensiones
      if (!clonedSvg.getAttribute('width')) {
        clonedSvg.setAttribute('width', svgElement.getBoundingClientRect().width.toString());
      }
      if (!clonedSvg.getAttribute('height')) {
        clonedSvg.setAttribute('height', svgElement.getBoundingClientRect().height.toString());
      }
      
      // Convertir SVG a string
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      
      // Crear un blob del SVG o canvas capbturado
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
      
      // aca Convertir SVG a imagen
      const img = new Image();
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // liberar el  URL
        URL.revokeObjectURL(url);
        
        // crear un canvas para dibujar la imagen
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto 2D del canvas'));
          return;
        }
        
        // dibujar la imagen en el canvas
        ctx.drawImage(img, 0, 0);
        
        // convertir el canvas a Blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Error al convertir SVG a imagen'));
          }
        }, 'image/png', 0.95);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Error al cargar la imagen SVG'));
      };
      
      img.src = url;
    } catch (error) {
      console.error('Error capturando SVG:', error);
      reject(error);
    }
  });
};