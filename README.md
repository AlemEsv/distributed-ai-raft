# Sistema Distribuido de Entrenamiento IA

Sistema híbrido (Python, Node.js, Java) para el entrenamiento distribuido de redes neuronales utilizando el algoritmo de consenso Raft.

## Arquitectura

* **Cliente (Python):** Interfaz gráfica (Tkinter) para usuarios y scripts de pruebas de estrés. Comunicación robusta vía TCP.
* **Servidor (Node.js):** Implementación del algoritmo **Raft** para elección de líder y replicación de logs. Actúa como orquestador y servidor de monitoreo HTTP.
* **Core (Java):** Motor de IA implementado desde cero (sin frameworks). Utiliza **multi-threading** para operaciones matriciales intensivas.

## Estructura del Proyecto

* `client`: GUI, cliente TCP y scripts de estrés.
* `server`: Lógica de Raft, servidores TCP/HTTP y gestión de subprocesos.
* `score`: Código fuente Java de la Red Neuronal, scripts de compilación (`build.sh`).

## Requisitos

* Python 3.x
* Node.js (v14+)
* Java JDK 8+

## Ejecución Básica

1. **Compilar Core Java:**

    ```bash
    cd src/core
    ./build.sh
    ```

2. **Iniciar Nodos (Ejemplo):**

    ```bash
    node src/server/node_worker/server.js
    ```

3. **Iniciar Cliente:**

    ```bash
    python src/client/gui_app.py
    ```
