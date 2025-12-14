# **Plan Técnico de Implementación: Sistema Distribuido de Entrenamiento IA con Raft**

Proyecto: Sistema Distribuido de Entrenamiento y Consumo de Modelos de IA  
Curso: Programación Concurrente y Distribuida  
Arquitectura: Híbrida (Python \+ Node.js \+ Java)  
Equipo: 5 Integrantes

## **1\. Resumen de Arquitectura**

El sistema se divide en tres capas lógicas para cumplir con el requisito de múltiples lenguajes de programación y las restricciones específicas sobre el motor de Inteligencia Artificial:

1. **Capa de Cliente (LP1 \- Python):** \* Interfaz Desktop (GUI) para usuarios finales.  
   * Scripts de automatización para pruebas de estrés.  
   * Comunicación vía Sockets TCP puros.  
2. **Capa de Servidor y Consenso (LP2 \- Node.js):** \* Rol de "Workers" en el clúster.  
   * Implementación del algoritmo RAFT para elección de líder y consistencia.  
   * Gestión de replicación de archivos y servidor web de monitoreo.  
   * Actúa como orquestador de los procesos de IA.  
3. **Capa de Cómputo (LP3 \- Java):** \* "Core" de IA (Motor de red neuronal).  
   * Se ejecuta como subproceso (child process) invocado por Node.js.  
   * Realiza el entrenamiento matemático intensivo utilizando concurrencia (Hilos/Threads) para aprovechar todos los núcleos del procesador.

## **2\. Definición de Roles y Tareas (5 Integrantes)**

### **🔵 Equipo de Infraestructura y Consenso (Node.js)**

*Responsables de la red, sincronización de estados y visualización web.*

#### **Participante 1 (P1): Arquitecto de Algoritmo Raft**

*Responsable de la lógica de estado y elecciones de líder.*

* **Tarea 1.1: Máquina de Estados.** Implementar la clase RaftNode con los estados Follower, Candidate, Leader y las transiciones lógicas entre ellos.  
* **Tarea 1.2: Election Timeout.** Programar temporizadores aleatorios (ej. 150-300ms). Si el nodo no recibe comunicación del líder en este tiempo, se autopromueve a Candidato.  
* **Tarea 1.3: Lógica de Votación (RequestVote RPC).** Validar los términos (term) recibidos y otorgar el voto únicamente si el candidato tiene un log igual o más actualizado.  
* **Tarea 1.4: Gestión del Líder.** Implementar el envío periódico de mensajes *Heartbeats* para mantener la autoridad y evitar nuevas elecciones innecesarias.

#### **Participante 2 (P2): Ingeniero de Red TCP y Monitoreo**

*Responsable de Sockets, Persistencia en disco y Servidor HTTP.*

* **Tarea 2.1: Servidor TCP.** Crear el servidor usando el módulo nativo net de Node.js para recibir conexiones persistentes de Clientes y otros Nodos. *(Nota: Prohibido usar WebSockets o Socket.io)*.  
* **Tarea 2.2: Replicación (AppendEntries RPC).** Implementar la lógica para recibir archivos/logs y escribirlos físicamente en la carpeta local Disk n.  
* **Tarea 2.3: Servidor Web Embebido.** Usar el módulo http para servir un panel HTML que muestre: Rol actual del nodo, Término actual, y lista de Logs replicados en tiempo real.  
* **Tarea 2.4: Integración con Java.** Implementar child\_process.spawn para ejecutar el JAR de IA automáticamente cuando el consenso sobre un archivo de entrada se confirme.

### **☕ Equipo de Motor de IA (Java \>= 8\)**

*Responsables del cálculo matemático y concurrencia. **Restricción:** No usar frameworks de IA (TensorFlow, PyTorch, etc).*

#### **Participante 3 (P3): Matemático Computacional (Core)**

*Responsable de la lógica matemática de las Redes Neuronales.*

* **Tarea 3.1: Álgebra Lineal.** Implementar clases desde cero para manejo de matrices: Matrix, Vector, y funciones de activación Sigmoid, ReLU.  
* **Tarea 3.2: Forward Propagation.** Implementar el algoritmo de inferencia (multiplicación de pesos \+ bias).  
* **Tarea 3.3: Backpropagation.** Implementar el algoritmo de entrenamiento y ajuste de pesos (Descenso del gradiente).  
* **Tarea 3.4: Serialización.** Crear métodos para persistencia: saveModel(path) y loadModel(path) para guardar los pesos entrenados en formato binario o JSON manual.

#### **Participante 4 (P4): Ingeniero de Datos y Concurrencia**

*Responsable de eficiencia, uso de CPU y gestión de I/O.*

* **Tarea 4.1: Multi-threading.** Implementar java.lang.Thread o ExecutorService para dividir las operaciones matriciales grandes entre todos los núcleos disponibles de la CPU.  
* **Tarea 4.2: Pipeline de Datos.** Leer los CSVs o imágenes procesados por Node.js y normalizar los datos (escala 0-1) antes del entrenamiento.  
* **Tarea 4.3: Wrapper CLI.** Diseñar el public static void main para que acepte argumentos de línea de comandos:  
  * Modo Entrenamiento: java \-jar core.jar train \<input\_path\> \<output\_model\_id\>  
  * Modo Predicción: java \-jar core.jar predict \<model\_id\> \<input\_data\>

### **🐍 Equipo de Cliente e Integración (Python)**

*Responsable de la experiencia de usuario (UX) y validación de calidad (QA).*

#### **Participante 5 (P5): Desarrollador Frontend y QA**

*Responsable de GUI y Pruebas de Estrés.*

* **Tarea 5.1: Cliente Desktop.** Construir interfaz gráfica (usando Tkinter o PyQt) con paneles para:  
  * Subir dataset (Entrenamiento).  
  * Consultar modelos disponibles y solicitar predicciones (Testeo).  
* **Tarea 5.2: Cliente Socket TCP.** Implementar la lógica de conexión robusta. Debe manejar la reconexión automática si el Nodo Líder cambia y serializar mensajes (JSON sobre TCP).  
* **Tarea 5.3: Script de Estrés.** Desarrollar un script que genere y envíe **1000 archivos/peticiones aleatorias** de forma secuencial o paralela para validar que el algoritmo Raft mantiene la consistencia bajo carga alta.

## **3\. Especificaciones Técnicas**

### **3.1 Protocolo de Comunicación (Sockets TCP)**

El formato de intercambio será JSON String finalizado con un salto de línea \\n como delimitador de mensaje.

**A. Petición de Entrenamiento (Cliente \-\> Líder Node):**

{  
  "type": "TRAIN\_REQUEST",  
  "payload": {  
    "data\_content": "base64\_encoded\_or\_csv\_text",  
    "model\_name": "modelo\_grupo5\_v1"  
  }  
}

**B. Petición de Predicción (Cliente \-\> Líder Node):**

{  
  "type": "PREDICT\_REQUEST",  
  "payload": {  
    "model\_id": "modelo\_grupo5\_v1",  
    "input\_vector": \[0.5, 0.1, 0.9, 0.8\]  
  }  
}

**C. Consenso Raft (Node \-\> Node):**

{  
  "type": "APPEND\_ENTRIES",  
  "term": 5,  
  "leaderId": "Node\_A",  
  "prevLogIndex": 4,  
  "prevLogTerm": 4,  
  "entries": \[
    { "command": "STORE\_FILE", "filename": "data\_1.csv", "content": "..." }
  \],  
  "leaderCommit": 4  
}

### **3.2 Estructura de Directorios en el Nodo**

Cada Worker debe mantener esta estructura en su sistema de archivos local:

/node\_project  
  |-- server.js        (Código P1/P2 \- Node.js)  
  |-- core\_ia.jar      (Código P3/P4 \- Java Compilado)  
  |-- /disk            (Almacenamiento Simulado)  
      |-- /logs        (Historial de operaciones Raft)  
      |-- /datasets    (Inputs replicados desde el líder)  
      |-- /models      (Modelos .bin generados por Java)

## **4\. Cronograma de Integración (Pipeline)**

### **✅ Fase 1: Esqueleto de Conectividad (COMPLETADO)**

* **P1/P2:** ✅ 3 procesos Node.js conectados por TCP y canales abiertos.  
* **P3/P4:** ✅ Java lee CSV, ejecuta operaciones matemáticas y guarda archivos.  
* **P5:** ✅ Cliente Python con GUI funcional que envía JSON a Node.js y recibe respuestas.

### **✅ Fase 2: Implementación de Núcleos (COMPLETADO)**

* **P1:** ✅ Elección de líder Raft implementada con timeout y votación.  
* **P2:** ✅ Replicación funcional - archivos se replican en `/disk` de los 3 nodos.  
* **P3/P4:** ✅ Red neuronal con Backpropagation implementada y funcionando.

### **✅ Fase 3: Mejoras de Cliente y Datasets (COMPLETADA - Semana 1)**

**Semana 1: Expansión de Funcionalidades (COMPLETADA)**

* **P5 (Día 1-2):** ✅ Cliente con modo dual: entrada de texto + canvas de dibujo para imágenes.
  * ✅ Implementado canvas 280x280 con conversión a 28x28.
  * ✅ Agregadas dependencias: Pillow y numpy.
  
* **P3/P4 (Día 2-3):** ✅ Integración de datasets estándar:
  * ✅ Agregado MNIST a `/core/datasets/mnist/mnist.csv`
  * ✅ Agregado FashionMNIST a `/core/datasets/fashionmnist/fashionmnist.csv`
  * ✅ Agregado ChineseMNIST a `/core/datasets/chinesemnist/chinese_mnist.csv`
  * ✅ DataLoader con detección y soporte específico para imágenes 28x28 (784 features).
  * ✅ Logs mejorados que indican compatibilidad con MNIST/FashionMNIST/ChineseMNIST.

* **P2 (Día 3-4):** ✅ Mejoras en el orquestador:
  * ✅ `executor.js` con detección y soporte para vectores de 784 elementos.
  * ✅ Timeout de 5 minutos para entrenamientos largos.
  * ✅ Timeout de 30 segundos para predicciones.
  * ✅ Logs de progreso cada 10 segundos durante entrenamiento.
  * ✅ Monitor web con métricas de rendimiento (entrenamientos, predicciones, errores).
  * ✅ Dashboard mejorado con timestamps y tiempos promedio.

### **Fase 4: Integración Final y Pruebas (EN PROGRESO)**

**Día 8-9: Pruebas de Sistema (COMPLETADO)**

* **P5:** ✅ Pruebas de stress test:
  * ✅ Script con 100 peticiones secuenciales + 500 concurrentes.
  * ✅ Pruebas concurrentes con 50 threads simultáneos.
  * ✅ Medición completa de tiempos de respuesta y throughput.
  * ✅ Estadísticas detalladas: promedio, mediana, min, max, desviación estándar.
  * ✅ Generación automática de reportes JSON con timestamp.
  * ✅ Cálculo de tasa de éxito y rendimiento (req/s).

* **P2:** ✅ Monitor web con métricas:
  * ✅ Dashboard con métricas de rendimiento en tiempo real.
  * ✅ Registro de entrenamientos y predicciones completadas.
  * ✅ Timestamps y contadores de operaciones.
  * 🔲 Visualización del estado del clúster Raft (roles y términos).
  * 🔲 Gráficas de rendimiento histórico.

**Día 10-11: Despliegue Multi-Máquina (EN PROGRESO)**

* **Todo el equipo:** 🔄 Configuración distribuida:
  * ✅ Documentación completa creada: `DESPLIEGUE_MULTIMAQUINA.md`
  * ✅ Scripts de automatización creados: `start_node.sh`, `start_node.ps1`
  * ✅ Script de configuración: `setup_distributed.sh`
  * 🔲 Configurar IPs estáticas en 3 máquinas (LAN/WiFi).
  * 🔲 Actualizar `config.js` con IPs reales de los peers.
  * 🔲 Ejecutar sistema completo en red distribuida.
  * 🔲 Validar replicación cross-machine.

**Día 12: Validación Final**

* **P5:** 🔲 Pruebas E2E completas:
  * 🔲 Entrenar modelo MNIST desde GUI.
  * 🔲 Realizar predicciones dibujando dígitos.
  * 🔲 Verificar que las 3 máquinas mantienen estado consistente.
  * 🔲 Simular fallo de nodo líder y verificar continuidad del servicio.

### **📋 Fase 5: Documentación y Presentación (PENDIENTE)**

**Día 13-14: Documentación**

* **P1/P3:** 🔲 Informe técnico PDF:
  * 🔲 Diagrama de arquitectura actualizado.
  * 🔲 Diagrama de flujo del protocolo Raft.
  * 🔲 Descripción de algoritmos matemáticos (Red Neuronal).
  * 🔲 Resultados de pruebas de rendimiento.

* **P2/P5:** 🔲 Manual de usuario:
  * 🔲 Instrucciones de instalación y configuración.
  * 🔲 Guía de uso del cliente GUI.
  * 🔲 Troubleshooting común.

**Día 15: Presentación**

* **Todo el equipo:** 🔲 Preparar presentación:
  * 🔲 Slides ejecutivos (15-20 diapositivas).
  * 🔲 Demo en vivo del sistema funcionando.
  * 🔲 Video de respaldo (por si falla la demo).
  * 🔲 Ensayo de presentación (máx. 20 minutos).

### **📊 Estado Actual del Proyecto**

**Progreso General: ~75% Completado** ⬆️

* ✅ Arquitectura core implementada (100%)
* ✅ Algoritmo Raft funcional (100%)
* ✅ Red neuronal Java operativa (100%)
* ✅ Cliente Python con canvas de dibujo (100%)
* ✅ Datasets estándar integrados (100%)
* ✅ DataLoader con soporte 28x28 (100%)
* ✅ Sistema de timeouts y monitoreo (100%)
* 🔲 Pruebas de estrés completas (30%)
* 🔲 Despliegue multi-máquina (0%)
* 🔲 Documentación final (20%)

## **5\. Entregables Finales**

De acuerdo a lo solicitado en el examen final:

1. **Códigos Fuente:** Organizados en carpetas Client\_Python/, Server\_Node/, Core\_Java/. (Solo código fuente, sin binarios innecesarios ni carpetas node\_modules o .class).  
2. **Informe PDF:** Documento que incluya el diagrama de arquitectura híbrida y el diagrama de flujo del protocolo Raft implementado.  
3. **Presentación PDF:** Resumen ejecutivo para la exposición y defensa del proyecto.
