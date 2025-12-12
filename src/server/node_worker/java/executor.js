// java/executor.js
const { spawn } = require('child_process');
const path = require('path');
const config = require('../config');

const JAR_PATH = path.resolve(config.javaJar);
const MODELS_PATH = path.join(__dirname, '../disk/models');

// Ejecutar entrenamiento
function trainModel(inputPath, modelId) {
    return new Promise((resolve, reject) => {
        console.log(`[JAVA] Iniciando entrenamiento: ${modelId}`);
        
        const process = spawn('java', [
            '-jar', JAR_PATH,
            'train',
            inputPath,
            modelId
        ], {
            cwd: path.dirname(JAR_PATH)
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log(`[JAVA OUT] ${data.toString().trim()}`);
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`[JAVA ERR] ${data.toString().trim()}`);
        });
        
        process.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    modelId,
                    output: stdout,
                    modelPath: path.join(path.dirname(JAR_PATH), 'models', `${modelId}.bin`)
                });
            } else {
                reject(new Error(`Java terminó con código ${code}: ${stderr}`));
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
        
        const process = spawn('java', [
            '-jar', JAR_PATH,
            'predict',
            modelId,
            inputStr
        ], {
            cwd: path.dirname(JAR_PATH)
        });
        
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
            if (code === 0) {
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