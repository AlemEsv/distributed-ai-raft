# Guía de Ejecución

Este documento detalla los pasos para levantar el clúster de servidores (Node.js + Raft) y conectar los clientes (Python).

## Prerrequisitos

1. **Node.js** (v14 o superior)
2. **Python** (v3.8 o superior)
3. **Java Runtime Environment (JRE)** (v8 o superior) - Para el motor de IA.

---

## 1Configuración del Servidor (Cluster Raft)

El clúster consta de 3 nodos (`Node_A`, `Node_B`, `Node_C`) que se comunican entre sí.

### Pasos

1. Abre **3 terminales** diferentes (una para cada nodo).
2. Navega a la raíz del proyecto en todas ellas.
3. Ejecuta los siguientes comandos (uno en cada terminal):

**Terminal 1 (Nodo A):**

```powershell
node src/server/node_worker/server.js Node_A
```

**Terminal 2 (Nodo B):**

```powershell
node src/server/node_worker/server.js Node_B
```

**Terminal 3 (Nodo C):**

```powershell
node src/server/node_worker/server.js Node_C
```

> **Nota:** Verás logs indicando que los nodos se conectan entre sí, inician elecciones y uno se convierte en `LEADER`.
> Puedes ver el estado de cada nodo en el navegador:
>
> * Node A: [http://localhost:8080](http://localhost:8080)
> * Node B: [http://localhost:8081](http://localhost:8081)
> * Node C: [http://localhost:8082](http://localhost:8082)

---

## Configuración del Motor de IA (Java)

El servidor Node.js intenta ejecutar un archivo JAR para el entrenamiento.
Asegúrate de que el archivo `core_ia.jar` exista en la ruta `src/server/node_worker/core_ia.jar`.

---

## Ejecución del Cliente (Python)

El cliente permite enviar trabajos de entrenamiento y predicción al clúster.

### Instalación de Dependencias

```powershell
pip install -r src/client/requirements.txt
```

### Opción A: Cliente Web (Recomendado)

Interfaz moderna basada en navegador.

1. Ejecuta el servidor web:

    ```powershell
    python src/client/web_app.py
    ```

2. Abre [http://localhost:5000](http://localhost:5000) en tu navegador.

### Opción B: Cliente de Escritorio (GUI)

Interfaz nativa con Tkinter.

```powershell
python src/client/gui_app.py
```

### Opción C: Prueba de Estrés

Para verificar la robustez del algoritmo Raft bajo carga.

```powershell
python src/client/stress_test.py
```

---

## Flujo de Prueba Sugerido

1. Levanta los 3 nodos del servidor.
2. Verifica en los monitores web (puertos 8080-8082) quién es el **LÍDER**.
3. Inicia el **Cliente Web**.
4. Sube un archivo CSV de prueba en la sección "Entrenamiento".
5. Observa en los logs de las terminales Node.js cómo:
    * El Líder recibe la petición.
    * Replica el archivo a los Followers (verás logs de `APPEND_ENTRIES`).
    * Confirma el guardado en disco (`src/server/node_worker/disk/datasets`).
6. Mata el proceso del nodo Líder (Ctrl+C).
7. Observa cómo uno de los nodos restantes detecta la caída y gana la nueva elección.
8. Intenta hacer una predicción desde el cliente; este debería reconectarse automáticamente al nuevo líder.
