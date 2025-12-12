# Despliegue del Sistema

## Prerrequisitos

* Java JDK 8+
* Node.js v14+
* Python 3.x

## Compilar Core (Java)

Desde la raíz del proyecto (PowerShell):

```powershell
cd src/core
mkdir bin, models, datasets, logs -Force
javac -d bin src/Main.java src/math/*.java src/nn/*.java src/data/*.java src/concurrent/*.java
cd bin
"Main-Class: Main" | Out-File -Encoding ascii manifest.txt
jar cvfm ../core.jar manifest.txt .
cd ../../..
```

## Preparar Cliente (Python)

```powershell
pip install -r src/client/requirements.txt
```

## Iniciar Clúster (Node.js)

Abrir **3 terminales** en la raíz del proyecto y ejecutar uno en cada una:

```powershell
# Terminal 1
node src/server/node_worker/server.js Node_A

# Terminal 2
node src/server/node_worker/server.js Node_B

# Terminal 3
node src/server/node_worker/server.js Node_C
```

## Ejecutar Cliente

```powershell
python src/client/gui_app.py
```

## Uso

1. **Entrenar:** Pestaña "Entrenamiento" -> Subir CSV (ej. `dummy_data.csv`) -> "Iniciar".
2. **Predecir:** Pestaña "Predicción" -> ID Modelo (ej. `modelo_test`) -> Vector (ej. `0.1,0.2,0.3`) -> "Predecir".
