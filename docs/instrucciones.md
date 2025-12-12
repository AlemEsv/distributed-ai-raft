# Guía de Despliegue Rápido

## Prerrequisitos

- Java JDK 8+
- Node.js
- Python 3.x (con flask instalado)
- Make (Windows)

## Ejecución

```bash
make core # Compila el núcleo Java
make server-nodes # Inicia el clúster de 3 nodos
make client # Inicia la interfaz gráfica
make client-web # Inicia el cliente web (puerto 5005)
make clean # Limpia binarios y archivos temporales
```
