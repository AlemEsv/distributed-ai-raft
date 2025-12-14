// java/executor.js
const { spawn } = require('child_process');
const path = require('path');
const config = require('../config');

const JAR_PATH = path.resolve(config.javaJar);
const MODELS_PATH = path.join(__dirname, '../disk/models');

// Timeout para entrenamientos largos (5 minutos)
const TRAIN_TIMEOUT = 5 * 60 * 1000; // 5 minutos
const PREDICT_TIMEOUT = 30 * 1000;    // 30 segundos

// Ejecutar entrenamiento
function trainModel(inputPath, modelId) {
    return new Promise((resolve, reject) => {
        console.log(`[JAVA] Iniciando entrenamiento: ${modelId}`);
        const startTime = Date.now();
        
        const process = spawn('java', [
            '-jar', JAR_PATH,
            'train',
            inputPath,
            modelId
        ], {
            cwd: path.dirname(JAR_PATH)
        });
        
        // Timeout de 5 minutos
        const timeout = setTimeout(() => {
            process.kill('SIGTERM');
            reject(new Error(`Timeout: Entrenamiento excedió ${TRAIN_TIMEOUT/1000}s`));
        }, TRAIN_TIMEOUT);
        
        let stdout = '';
        let stderr = '';
        let lastProgress = Date.now();
        
        process.stdout.on('data', (data) => {
            const output = data.toString();
            stdout += output;
            
            // Mostrar TODOS los logs de Java
            console.log(`[JAVA OUT] ${output.trim()}`);
            
            // Log de progreso cada 10 segundos
            const now = Date.now();
            if (now - lastProgress > 10000) {
                const elapsed = Math.round((now - startTime) / 1000);
                console.log(`[JAVA] Progreso... ${elapsed}s transcurridos`);
                lastProgress = now;
            }
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`[JAVA ERR] ${data.toString().trim()}`);
        });
        
        process.on('close', (code) => {
            clearTimeout(timeout);
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            
            if (code === 0) {
                const modelPath = path.join(path.dirname(JAR_PATH), 'models', `${modelId}.bin`);
                console.log(`[JAVA] Entrenamiento completado en ${elapsed}s`);
                console.log(`[JAVA] Modelo guardado en: ${modelPath}`);
                
                // Verificar si el archivo existe
                const fs = require('fs');
                if (fs.existsSync(modelPath)) {
                    console.log(`[JAVA] Archivo verificado: ${modelPath}`);
                } else {
                    console.error(`[JAVA] ERROR: Archivo NO encontrado en ${modelPath}`);
                }
                
                resolve({
                    success: true,
                    modelId,
                    output: stdout,
                    duration: elapsed,
                    modelPath: modelPath
                });
            } else {
                reject(new Error(`Java terminó con código ${code} después de ${elapsed}s: ${stderr}`));
            }
        });
        
        process.on('error', (err) => {
            reject(new Error(`No se pudo ejecutar Java: ${err.message}`));
        });
    });
}

// Ejecutar predicción
function predict(modelId, inputVector) {
    return new Promise((resolve, reject) => {
        console.log(`[JAVA] Predicción con modelo: ${modelId}`);
        
        const inputStr = Array.isArray(inputVector) 
            ? inputVector.join(',') 
            : inputVector;
        
        const vectorSize = Array.isArray(inputVector) ? inputVector.length : inputStr.split(',').length;
        console.log(`[JAVA] Vector de entrada: ${vectorSize} elementos`);
        
        if (vectorSize === 784) {
            console.log(`[JAVA] Formato de imagen detectado`);
        }
        
        const process = spawn('java', [
            '-jar', JAR_PATH,
            'predict',
            modelId,
            inputStr
        ], {
            cwd: path.dirname(JAR_PATH)
        });
        
        // Timeout de 30 segundos para predicción
        const timeout = setTimeout(() => {
            process.kill('SIGTERM');
            reject(new Error(`Timeout: Predicción excedió ${PREDICT_TIMEOUT/1000}s`));
        }, PREDICT_TIMEOUT);
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`[JAVA ERR] ${data.toString().trim()}`);
        });
        
        process.on('close', (code) => {
            clearTimeout(timeout);
            
            if (code === 0) {
                console.log(`[JAVA] Predicción completada`);
                // Parsear resultado (asumiendo que Java imprime JSON o número)
                try {
                    const result = JSON.parse(stdout.trim());
                    resolve({ success: true, prediction: result });
                } catch {
                    resolve({ success: true, prediction: stdout.trim() });
                }
            } else {
                reject(new Error(`Predicción falló con código ${code}: ${stderr}`));
            }
        });
    });
}

module.exports = { trainModel, predict };