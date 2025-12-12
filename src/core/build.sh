#!/bin/bash

# Script de compilación para el proyecto Core IA (P4)
# Compila todos los archivos Java y crea el JAR ejecutable

echo "=== Compilando Core IA - P4 ==="
echo "Limpiando archivos anteriores..."

# Crear directorios necesarios
mkdir -p bin
mkdir -p models
mkdir -p datasets
mkdir -p logs

# Limpiar compilaciones anteriores
rm -rf bin/*
rm -f core.jar

echo "Compilando archivos Java..."

# Compilar todos los archivos .java
javac -d bin src/Main.java src/math/*.java src/nn/*.java src/data/*.java src/concurrent/*.java

if [ $? -eq 0 ]; then
    echo "✓ Compilación exitosa"
    
    echo "Creando archivo JAR..."
    
    # Crear el JAR con manifest
    cd bin
    echo "Main-Class: Main" > manifest.txt
    jar cvfm ../core.jar manifest.txt .
    cd ..
    
    if [ $? -eq 0 ]; then
        echo "✓ JAR creado exitosamente: core.jar"
        echo ""
        echo "=== INSTRUCCIONES DE USO ==="
        echo "1. Entrenamiento:"
        echo "   java -jar core.jar train <input_path> <model_id>"
        echo ""
        echo "2. Predicción:"
        echo "   java -jar core.jar predict <model_id> <input_data>"
        echo ""
        echo "3. Información del sistema:"
        echo "   java -jar core.jar info"
        echo ""
        echo "Ejemplo:"
        echo "   java -jar core.jar train datasets/iris.csv modelo_iris"
        echo "   java -jar core.jar predict modelo_iris \"5.1,3.5,1.4,0.2\""
    else
        echo "✗ Error al crear JAR"
        exit 1
    fi
else
    echo "✗ Error en la compilación"
    exit 1
fi

echo ""
echo "=== Estructura de directorios ==="
tree -L 2 -I 'bin'

echo ""
echo "Compilación completada exitosamente"
