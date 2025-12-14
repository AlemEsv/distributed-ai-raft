# Funciones del Proyecto

## 1. Core (Motor de IA - Java)

* **Entrenamiento Concurrente**: Divide el dataset en lotes y entrena en paralelo utilizando todos los núcleos disponibles de la CPU (`MultiThreadTrainer`).
* **Red Neuronal**: Implementación nativa de Perceptrón Multicapa con algoritmos de Forward y Backward Propagation.
* **Procesamiento de Datos**:
  * Carga y parseo de archivos CSV (MNIST, FashionMNIST).
  * Detección automática de tipo de dataset (Imágenes vs Tabular).
  * Normalización de entradas (Escalado de píxeles o Min-Max).
  * Codificación de etiquetas (One-Hot Encoding).
* **Inferencia**: Cálculo de predicciones y porcentaje de confianza (Accuracy).
* **Persistencia**: Serialización y deserialización de modelos en formato binario (`.bin`).

## 2. Servidor Distribuido (Node.js)

* **Consenso Raft**: Algoritmo distribuido para elección de líder y replicación de estados entre nodos.
* **Orquestación de Procesos**: Ejecución controlada del motor Java (`child_process`), gestión de timeouts y captura de logs en tiempo real.
* **Comunicación Híbrida**:
  * **TCP**: Comunicación de baja latencia entre nodos y con el cliente.
  * **HTTP**: Endpoints para monitoreo de estado.
* **Gestión de Metadatos**: Creación de archivos JSON asociados a los modelos con estadísticas (precisión, fecha, dataset).
* **Balanceo y Failover**: Redirección de peticiones si el nodo contactado no es el líder.

## 3. Cliente Web (Python/Flask + JavaScript)

* **Interfaz de Usuario (SPA)**:
  * **Entrenar**: Configuración de parámetros (nombre, dataset) e inicio de tareas remotas.
  * **Predecir**: Canvas HTML5 para dibujo a mano alzada con preprocesamiento (downsampling 10x10) y soporte para entrada de texto/CSV.
  * **Probar**: Panel de pruebas de carga.
* **Cliente TCP Robusto**: Lógica de conexión con reintentos automáticos y manejo de errores de red.
* **Pruebas de Estrés (Stress Test)**:
  * **Modo Secuencial**: Medición de latencia petición por petición.
  * **Modo Concurrente**: Simulación de carga masiva utilizando múltiples hilos (`threading`) para medir throughput y estabilidad.
