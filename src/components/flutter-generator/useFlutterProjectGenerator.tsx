import { useMutation } from "@liveblocks/react";
import { nanoid } from "nanoid";
import { LayerType } from "~/types";

// Función principal para generar un proyecto Flutter a partir del diseño actual
export const useFlutterProjectGenerator = (roomName: string) => {
  const generateFlutterProject = useMutation(async ({ storage }) => {
    try {
      // Obtener los datos del canvas
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
        name: roomName
      };
      
      // Generar estructura de proyecto Flutter
      const flutterProject = {
        // Archivos de configuración
        'pubspec.yaml': generatePubspecYaml(roomName),
        'analysis_options.yaml': generateAnalysisOptions(),
        // Archivos de la aplicación
        'lib/main.dart': generateMainDart(canvasData),
        'lib/canvas_screen.dart': generateCanvasScreen(canvasData),
        'lib/canvas_elements.dart': generateCanvasElements(canvasData),
        'lib/theme.dart': generateTheme(canvasData),
        'android/app/src/main/AndroidManifest.xml': generateAndroidManifest(roomName),
        'ios/Runner/Info.plist': generateIosInfo(roomName),
        // README con instrucciones
        'README.md': generateReadme(roomName)
      };
      
      // Crear un archivo ZIP con todos los archivos
      const JSZip = await import('jszip').then(module => module.default);
      const zip = new JSZip();
      
      // Añadir archivos al ZIP
      Object.entries(flutterProject).forEach(([path, content]) => {
        // Crear carpetas si es necesario
        const folders = path.split('/');
        let currentFolder = zip;
        
        if (folders.length > 1) {
          for (let i = 0; i < folders.length - 1; i++) {
            // Asegurarse de que folders[i] sea una cadena válida
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
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${roomName.replace(/\s+/g, '_')}_flutter_project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Proyecto Flutter generado con éxito. Descomprime el archivo y ejecuta "flutter pub get" para instalar las dependencias.');
      
    } catch (error) {
      console.error("Error generando proyecto Flutter:", error);
      alert("Error al generar el proyecto Flutter. Por favor, intenta de nuevo.");
    }
  }, [roomName]);

  return generateFlutterProject;
};

// Funciones auxiliares para generar archivos del proyecto Flutter
const generatePubspecYaml = (projectName: string) => {
  return `name: ${projectName.toLowerCase().replace(/\s+/g, '_')}
description: Aplicación Flutter generada desde Figma Clone.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2
  provider: ^6.0.5
  path_provider: ^2.0.15

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
`;
};

const generateAnalysisOptions = () => {
  return `include: package:flutter_lints/flutter.yaml

linter:
  rules:
    - prefer_const_constructors
    - prefer_const_declarations
    - avoid_print
    - use_key_in_widget_constructors
`;
};

const generateMainDart = (canvasData: any) => {
  return `import 'package:flutter/material.dart';
import 'canvas_screen.dart';
import 'theme.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${canvasData.name || "Canvas Design"}',
      theme: appTheme,
      debugShowCheckedModeBanner: false,
      home:const CanvasScreen(),
    );
  }
}
`;
};

const generateCanvasScreen = (canvasData: any) => {
  return `import 'package:flutter/material.dart';
import 'canvas_elements.dart';

class CanvasScreen extends StatefulWidget {
  const CanvasScreen({Key? key}) : super(key: key);
  
  @override
  State<CanvasScreen> createState() => _CanvasScreenState();
}

class _CanvasScreenState extends State<CanvasScreen> {
  // Datos del diseño importados desde Figma Clone
  final Map<String, dynamic> canvasData = ${JSON.stringify(canvasData, null, 2)};
  
  // Factor de escala para ajustar el diseño a la pantalla
  double scale = 1.0;
  
  @override
  void initState() {
    super.initState();
    // Inicializar los datos del canvas
    WidgetsBinding.instance.addPostFrameCallback((_) {
      adjustDesignToScreen();
    });
  }
  
  void adjustDesignToScreen() {
    // Encontrar las dimensiones máximas del diseño
    double maxX = 0.0;
    double maxY = 0.0;
    
    canvasData['layers'].forEach((id, layer) {
      final rightEdge = (layer['x'] ?? 0).toDouble() + (layer['width'] ?? 0).toDouble();
      final bottomEdge = (layer['y'] ?? 0).toDouble() + (layer['height'] ?? 0).toDouble();
      
      if (rightEdge > maxX) maxX = rightEdge;
      if (bottomEdge > maxY) maxY = bottomEdge;
    });
    
    // Calcular el factor de escala para ajustar a la pantalla
    final size = MediaQuery.of(context).size;
    
    // Dejar un margen del 2%
    const margin = 0.02;
    final scaleX = (size.width * (1 - margin * 2)) / maxX;
    final scaleY = (size.height * (1 - margin * 2)) / maxY;
    
    // Usar el factor más pequeño para asegurar que todo el diseño sea visible
    setState(() {
      scale = scaleX < scaleY ? scaleX : scaleY;
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Transform.scale(
          scale: scale,
          child: CanvasElements(canvasData: canvasData),
        ),
      ),
    );
  }
}
`;
};

const generateCanvasElements = (canvasData: any) => {
  return `import 'package:flutter/material.dart';

class CanvasElements extends StatelessWidget {
  final Map<String, dynamic> canvasData;
  
  const CanvasElements({
    Key? key,
    required this.canvasData,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    // Obtener las dimensiones máximas para el contenedor
    double maxWidth = 0.0;
    double maxHeight = 0.0;
    
    canvasData['layers'].forEach((id, layer) {
      final rightEdge = (layer['x'] ?? 0) + (layer['width'] ?? 0).toDouble();;
      final bottomEdge = (layer['y'] ?? 0) + (layer['height'] ?? 0).toDouble();;
      
      if (rightEdge > maxWidth) maxWidth = rightEdge;
      if (bottomEdge > maxHeight) maxHeight = bottomEdge;
    });
    
    return Container(
      width: maxWidth,
      height: maxHeight,
      color: Color(int.parse(canvasData['roomColor'] ?? '0xFFFFFFFF')),
      child: Stack(
        children: _buildCanvasElements(),
      ),
    );
  }
  
  List<Widget> _buildCanvasElements() {
    final List<Widget> elements = [];
    
    // Ordenar las capas según el orden en layerIds
    final layerIds = canvasData['layerIds'] as List<dynamic>;
    
    for (final layerId in layerIds) {
      final layer = canvasData['layers'][layerId];
      
      if (layer != null) {
        switch (layer['type']) {
          case 'rectangle':
            elements.add(_buildRectangle(layerId, layer));
            break;
          case 'ellipse':
            elements.add(_buildEllipse(layerId, layer));
            break;
          case 'text':
            elements.add(_buildText(layerId, layer));
            break;
        }
      }
    }
    
    return elements;
  }
  
  Widget _buildRectangle(String id, Map<String, dynamic> layer) {
  final x = (layer['x'] ?? 0).toDouble();
  final y = (layer['y'] ?? 0).toDouble();
  final width = (layer['width'] ?? 100).toDouble();
  final height = (layer['height'] ?? 100).toDouble();
  final fill = layer['fill'] ?? {'r': 255, 'g': 255, 'b': 255};
  final opacity = ((layer['opacity'] ?? 100) / 100).toDouble();
  final stroke = layer['stroke'];
  
  return Positioned(
    left: x,
    top: y,
    child: Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Color.fromRGBO(
          (fill['r'] ?? 255).toInt(),
          (fill['g'] ?? 255).toInt(),
          (fill['b'] ?? 255).toInt(),
          opacity,
        ),
        border: stroke != null
            ? Border.all(
                color: Color.fromRGBO(
                  (stroke['r'] ?? 0).toInt(),
                  (stroke['g'] ?? 0).toInt(),
                  (stroke['b'] ?? 0).toInt(),
                  opacity,
                ),
                width: 1.0,
              )
            : null,
      ),
    ),
  );
}
  
  Widget _buildEllipse(String id, Map<String, dynamic> layer) {
  final x = (layer['x'] ?? 0).toDouble();
  final y = (layer['y'] ?? 0).toDouble();
  final width = (layer['width'] ?? 100).toDouble();
  final height = (layer['height'] ?? 100).toDouble();
  final fill = layer['fill'] ?? {'r': 255, 'g': 255, 'b': 255};
  final opacity = ((layer['opacity'] ?? 100) / 100).toDouble();
  final stroke = layer['stroke'];
  
  return Positioned(
    left: x,
    top: y,
    child: Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Color.fromRGBO(
          (fill['r'] ?? 255).toInt(),
          (fill['g'] ?? 255).toInt(),
          (fill['b'] ?? 255).toInt(),
          opacity,
        ),
        border: stroke != null
            ? Border.all(
                color: Color.fromRGBO(
                  (stroke['r'] ?? 0).toInt(),
                  (stroke['g'] ?? 0).toInt(),
                  (stroke['b'] ?? 0).toInt(),
                  opacity,
                ),
                width: 1.0,
              )
            : null,
      ),
    ),
  );
}
  
  Widget _buildText(String id, Map<String, dynamic> layer) {
  final x = (layer['x'] ?? 0).toDouble();
  final y = (layer['y'] ?? 0).toDouble();
  final text = layer['text'] ?? '';
  final fontSize = (layer['fontSize'] ?? 16).toDouble();
  final fontFamily = layer['fontFamily'] ?? 'Arial';
  final fontWeight = layer['fontWeight'] ?? 'normal';
  final fill = layer['fill'] ?? {'r': 0, 'g': 0, 'b': 0};
  final opacity = ((layer['opacity'] ?? 100) / 100).toDouble();
  
  return Positioned(
    left: x,
    top: y,
    child: Text(
      text,
      style: TextStyle(
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontWeight: fontWeight == 'bold' ? FontWeight.bold : FontWeight.normal,
        color: Color.fromRGBO(
          (fill['r'] ?? 0).toInt(),
          (fill['g'] ?? 0).toInt(),
          (fill['b'] ?? 0).toInt(),
          opacity,
        ),
      ),
    ),
  );
}
`;
};

const generateTheme = (canvasData: any) => {
  return `import 'package:flutter/material.dart';

final ThemeData appTheme = ThemeData(
  primarySwatch: Colors.blue,
  visualDensity: VisualDensity.adaptivePlatformDensity,
  scaffoldBackgroundColor: Colors.white,
  appBarTheme: const AppBarTheme(
    backgroundColor: Colors.white,
    foregroundColor: Colors.black,
    elevation: 0,
  ),
);
`;
};

const generateAndroidManifest = (projectName: string) => {
  return `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:label="${projectName}"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:value="2" 
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`;
};

const generateIosInfo = (projectName: string) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>${projectName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${projectName}</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>$(FLUTTER_BUILD_NAME)</string>
	<key>CFBundleSignature</key>
	<string>????</string>
	<key>CFBundleVersion</key>
	<string>$(FLUTTER_BUILD_NUMBER)</string>
	<key>LSRequiresIPhoneOS</key>
	<true/>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>UIMainStoryboardFile</key>
	<string>Main</string>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
	<key>UIViewControllerBasedStatusBarAppearance</key>
	<false/>
	<key>CADisableMinimumFrameDurationOnPhone</key>
	<true/>
	<key>UIApplicationSupportsIndirectInputEvents</key>
	<true/>
</dict>
</plist>
`;
};

const generateReadme = (projectName: string) => {
  return `# ${projectName} - Proyecto Flutter

Este proyecto Flutter fue generado automáticamente a partir de un diseño creado en Figma Clone.

## Instrucciones de instalación

1. Descomprime el archivo ZIP
2. Abre una terminal en la carpeta del proyecto
3. Ejecuta \`flutter pub get\` para instalar las dependencias
4. Ejecuta \`flutter run\` para iniciar la aplicación en un emulador o dispositivo conectado

## Estructura del proyecto

- \`lib/main.dart\`: Punto de entrada de la aplicación
- \`lib/canvas_screen.dart\`: Pantalla principal que muestra el diseño
- \`lib/canvas_elements.dart\`: Componentes que representan los elementos del diseño
- \`lib/theme.dart\`: Configuración del tema de la aplicación

## Personalización

Puedes modificar cualquier archivo para adaptar el diseño a tus necesidades.
`;
};