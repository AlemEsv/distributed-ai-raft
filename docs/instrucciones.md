# Guía de Despliegue

## Prerrequisitos

- Java JDK 8+
- Node.js
- Python 3.x (con flask, numpy, torchvision instalados)
- Make (Windows)

## Ejecución

```bash
python datasets.py # Genera los datasets
make core # Compila el núcleo Java
make server-nodes # Inicia el clúster de 3 nodos
make client # Inicia el cliente web (puerto 5005)
make clean # Limpia binarios y archivos temporales
```
