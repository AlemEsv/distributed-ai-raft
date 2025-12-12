#!/bin/bash

# Script de Pruebas Completas para Core IA - P4
# Valida todas las funcionalidades del módulo

echo "========================================="
echo "  SUITE DE PRUEBAS - CORE IA (P4)"
echo "========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de pruebas
TESTS_PASSED=0
TESTS_FAILED=0

# Función para ejecutar una prueba
run_test() {
    local test_name=$1
    local command=$2
    
    echo -e "${YELLOW}[TEST]${NC} $test_name"
    
    if eval "$command" > /tmp/test_output.log 2>&1; then
        echo -e "${GREEN}[PASS]${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}[FAIL]${NC} $test_name"
        cat /tmp/test_output.log
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "=== PREPARACIÓN ==="
echo "1. Verificando estructura de directorios..."
mkdir -p datasets models logs bin

echo "2. Compilando DataGenerator..."
javac -d bin src/DataGenerator.java

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: No se pudo compilar DataGenerator${NC}"
    exit 1
fi

echo "3. Verificando existencia de core.jar..."
if [ ! -f "core.jar" ]; then
    echo -e "${YELLOW}WARNING: core.jar no existe. Ejecutando build.sh...${NC}"
    ./build.sh
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}ERROR: Compilación fallida${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Preparación completada${NC}"
echo ""

# ============================================
# SUITE 1: Generación de Datos
# ============================================
echo "========================================="
echo "  SUITE 1: GENERACIÓN DE DATOS"
echo "========================================="

run_test "Generar dataset XOR" \
    "java -cp bin DataGenerator xor && test -f datasets/xor.csv"

run_test "Generar dataset Linear" \
    "java -cp bin DataGenerator linear && test -f datasets/linear.csv"

run_test "Generar dataset Circles" \
    "java -cp bin DataGenerator circles && test -f datasets/circles.csv"

echo ""

# ============================================
# SUITE 2: Comando Info
# ============================================
echo "========================================="
echo "  SUITE 2: INFORMACIÓN DEL SISTEMA"
echo "========================================="

run_test "Comando info - Verificar ejecución" \
    "java -jar core.jar info | grep 'Java Version'"

run_test "Comando info - Verificar núcleos" \
    "java -jar core.jar info | grep 'Núcleos disponibles'"

echo ""

# ============================================
# SUITE 3: Entrenamiento
# ============================================
echo "========================================="
echo "  SUITE 3: ENTRENAMIENTO DE MODELOS"
echo "========================================="

run_test "Entrenar modelo XOR" \
    "java -jar core.jar train datasets/xor.csv test_xor 2>&1 | grep 'Status: SUCCESS'"

run_test "Verificar modelo XOR guardado" \
    "test -f models/test_xor.bin"

run_test "Entrenar modelo Linear" \
    "java -jar core.jar train datasets/linear.csv test_linear 2>&1 | grep 'Status: SUCCESS'"

run_test "Verificar multi-threading activado" \
    "java -jar core.jar train datasets/circles.csv test_circles 2>&1 | grep -E 'Threads: [0-9]+'"

echo ""

# ============================================
# SUITE 4: Predicción
# ============================================
echo "========================================="
echo "  SUITE 4: PREDICCIÓN CON MODELOS"
echo "========================================="

# Primero asegurar que existe un modelo
java -jar core.jar train datasets/xor.csv test_predict > /dev/null 2>&1

run_test "Predecir con formato simple" \
    "java -jar core.jar predict test_predict '0,0' 2>&1 | grep 'OUTPUT:'"

run_test "Predecir con formato corchetes" \
    "java -jar core.jar predict test_predict '[0,1]' 2>&1 | grep 'OUTPUT:'"

run_test "Predecir con espacios" \
    "java -jar core.jar predict test_predict '[1, 0]' 2>&1 | grep 'OUTPUT:'"

run_test "Verificar status SUCCESS en predicción" \
    "java -jar core.jar predict test_predict '1,1' 2>&1 | grep 'Status: SUCCESS'"

echo ""

# ============================================
# SUITE 5: Manejo de Errores
# ============================================
echo "========================================="
echo "  SUITE 5: MANEJO DE ERRORES"
echo "========================================="

run_test "Error: archivo no existe" \
    "! java -jar core.jar train datasets/noexiste.csv modelo_test 2>&1"

run_test "Error: modelo no existe" \
    "! java -jar core.jar predict modelo_inexistente '0,0' 2>&1"

run_test "Error: comando inválido" \
    "! java -jar core.jar invalid_command 2>&1"

run_test "Error: argumentos insuficientes" \
    "! java -jar core.jar train 2>&1"

echo ""

# ============================================
# SUITE 6: Performance y Concurrencia
# ============================================
echo "========================================="
echo "  SUITE 6: PERFORMANCE Y CONCURRENCIA"
echo "========================================="

echo "Generando dataset grande para pruebas de estrés..."
java -cp bin DataGenerator large > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Iniciando prueba de estrés (esto puede tomar 1-2 minutos)..."
    
    START_TIME=$(date +%s)
    java -jar core.jar train datasets/large_dataset.csv stress_test > /tmp/stress_test.log 2>&1
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    
    if grep -q "Status: SUCCESS" /tmp/stress_test.log; then
        echo -e "${GREEN}[PASS]${NC} Entrenamiento de dataset grande (10000 ejemplos) - ${ELAPSED}s"
        ((TESTS_PASSED++))
        
        # Verificar que se usaron múltiples threads
        THREADS=$(grep "Threads:" /tmp/stress_test.log | awk '{print $2}')
        echo "  → Threads utilizados: $THREADS"
        
        # Verificar tiempo razonable (debe ser < 180s con multi-threading)
        if [ $ELAPSED -lt 180 ]; then
            echo -e "  ${GREEN}→ Tiempo aceptable${NC}"
        else
            echo -e "  ${YELLOW}→ WARNING: Tiempo mayor al esperado${NC}"
        fi
    else
        echo -e "${RED}[FAIL]${NC} Entrenamiento de dataset grande"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}[SKIP]${NC} Prueba de estrés (no se pudo generar dataset)"
fi

echo ""

# ============================================
# SUITE 7: Integración CSV
# ============================================
echo "========================================="
echo "  SUITE 7: FORMATOS CSV"
echo "========================================="

# Crear CSV con header
cat > datasets/test_header.csv << EOF
x1,x2,y
0.1,0.2,0
0.3,0.4,1
0.5,0.6,0
EOF

run_test "Procesar CSV con header" \
    "java -jar core.jar train datasets/test_header.csv test_header 2>&1 | grep 'Status: SUCCESS'"

# Crear CSV sin header
cat > datasets/test_no_header.csv << EOF
0.1,0.2,0
0.3,0.4,1
0.5,0.6,0
EOF

run_test "Procesar CSV sin header" \
    "java -jar core.jar train datasets/test_no_header.csv test_no_header 2>&1 | grep 'Status: SUCCESS'"

echo ""

# ============================================
# REPORTE FINAL
# ============================================
echo "========================================="
echo "  REPORTE FINAL"
echo "========================================="
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo "Total de pruebas ejecutadas: $TOTAL_TESTS"
echo -e "${GREEN}Pruebas exitosas: $TESTS_PASSED${NC}"

if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Pruebas fallidas: $TESTS_FAILED${NC}"
else
    echo -e "${GREEN}Pruebas fallidas: $TESTS_FAILED${NC}"
fi

echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  ✓ TODAS LAS PRUEBAS PASARON${NC}"
    echo -e "${GREEN}=========================================${NC}"
    exit 0
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  ✗ ALGUNAS PRUEBAS FALLARON${NC}"
    echo -e "${RED}=========================================${NC}"
    exit 1
fi
