# distributed-ai-raft

```txt
nombre-repositorio/
│
├── README.md                 # Instrucciones generales de cómo correr todo el sistema
├── .gitignore                # CRÍTICO: Para no subir basura (ver abajo)
├── docs/                     # Documentación (PDFs del examen)
│   ├── informe_final.pdf
│   ├── presentacion.pdf
│   └── diagramas/            # Imágenes de arquitectura y flujo
│
├── src/                      # Código Fuente
│   │
│   ├── client-python/        # (Equipo P5)
│   │   ├── main.py           # Punto de entrada de la GUI
│   │   ├── stress_test.py    # Script de los 1000 archivos
│   │   ├── requirements.txt  # Dependencias (si usan algo externo, aunque sea nativo)
│   │   └── modules/
│   │       ├── gui.py        # Lógica de Tkinter/PyQt
│   │       └── network.py    # Cliente TCP Socket
│   │
│   ├── server-node/          # (Equipo P1 y P2)
│   │   ├── index.js          # Punto de entrada del Worker
│   │   ├── package.json      # Definición del proyecto Node
│   │   ├── public/           # Archivos para el Monitor Web
│   │   │   └── monitor.html
│   │   └── modules/
│   │       ├── raft.js       # Lógica del Consenso (States, Voting)
│   │       ├── tcp_server.js # Manejo de Sockets TCP
│   │       ├── http_server.js# Manejo del Monitor Web
│   │       └── storage.js    # Escritura en disco
│   │
│   └── core-java/            # (Equipo P3 y P4)
│       ├── build.sh          # Script opcional para compilar rápido
│       ├── manifest.txt      # Para generar el JAR correctamente
│       └── src/
│           ├── Main.java     # Entry point (CLI Wrapper)
│           ├── math/         # Matrix.java, Vector.java
│           ├── nn/           # NeuralNetwork.java, Layer.java
│           └── util/         # Serializer.java, DataLoader.java
```
