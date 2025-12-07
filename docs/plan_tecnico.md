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

### **Fase 1: Esqueleto de Conectividad (Días 1-2)**

* **P1/P2:** Lograr que 3 procesos Node.js se conecten por TCP entre sí y mantengan canales abiertos.  
* **P3/P4:** Lograr que Java lea un CSV local, ejecute una operación matemática simple y guarde un archivo de salida.  
* **P5:** Crear ventana Python básica que envíe un string JSON a Node.js y reciba un "ACK".

### **Fase 2: Implementación de Núcleos (Días 3-4)**

* **P1:** Implementar elección de líder. Prueba: Matar el proceso líder y verificar que otro asume el mando en \<1 segundo.  
* **P2:** Implementar replicación. Si el cliente envía un archivo al líder, este debe aparecer físicamente en la carpeta /disk de los 3 nodos.  
* **P3/P4:** Implementar la red neuronal real (Backpropagation) y validar convergencia (reducción de error).

### **Fase 3: Integración Híbrida (Día 5\)**

* **P2:** Conectar Node con Java. Cuando Raft confirme ("commit") un archivo, Node lanza spawn('java', ...) automáticamente.  
* **P2:** Node debe capturar el stdout de Java y, si es una respuesta de predicción, enrutarla de vuelta al socket del Cliente Python.

### **Fase 4: Pruebas y Despliegue (Día 6\)**

* **Despliegue:** Configurar IPs estáticas en 3 laptops conectadas a la misma red LAN/WiFi.  
* **Estrés (P5):** Ejecutar el script de 1000 archivos.  
* **Verificación:** Observar en los monitores Web (HTML) de P2 que los logs crecen sincronizados en las 3 laptops y no hay divergencias.

## **5\. Entregables Finales**

De acuerdo a lo solicitado en el examen final:

1. **Códigos Fuente:** Organizados en carpetas Client\_Python/, Server\_Node/, Core\_Java/. (Solo código fuente, sin binarios innecesarios ni carpetas node\_modules o .class).  
2. **Informe PDF:** Documento que incluya el diagrama de arquitectura híbrida y el diagrama de flujo del protocolo Raft implementado.  
3. **Presentación PDF:** Resumen ejecutivo para la exposición y defensa del proyecto.
