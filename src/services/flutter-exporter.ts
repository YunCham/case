import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export const exportFlutterProject = async (
  files: Array<{ path: string; content: string }>,
  projectName: string
): Promise<void> => {
  try {

    const zip = new JSZip();
    
    files.forEach(({ path, content }) => {
      const folders = path.split('/');
      let currentFolder = zip;
      
      if (folders.length > 1) {
        for (let i = 0; i < folders.length - 1; i++) {
          const folderName = folders[i];
          if (folderName) {
            currentFolder = currentFolder.folder(folderName) || currentFolder;
          }
        }
        const fileName = folders[folders.length - 1];
        if (fileName) {
          currentFolder.file(fileName, content);
        }
      } else {
        zip.file(path, content);
      }
    });
    
    // Generar el ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    
    // Descargar el archivo ZIP
    saveAs(zipBlob, `${projectName.replace(/\s+/g, '_')}_flutter_project.zip`);
    
    return Promise.resolve();
  } catch (error) {
    console.error('Error exportando proyecto Flutter:', error);
    throw error;
  }
};