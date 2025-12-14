// server.js
const config = require('./config');
const { createClientServer, sendResponse } = require('./tcp/tcpServer');
const { createPeerServer, connectToAllPeers, sendToPeer } = require('./tcp/peerSocket');
const RaftNode = require('./raft/RaftNode');
const { createMonitorServer, updateMetrics } = require('./http/monitor');
const { trainModel, predict } = require('./java/executor');
const path = require('path');

console.log(`\nNODO ${config.nodeId}\n`);

// Manejar mensajes de clientes
function handleClientMessage(socket, message) {
    console.log(`[CLIENT] Recibido: ${message.type}`);
    
    switch (message.type) {
        case 'TRAIN_REQUEST':
            if (RaftNode.state !== 'LEADER') {
                sendResponse(socket, { 
                    success: false, 
                    error: 'No soy el líder',
                    leader: RaftNode.leaderId
                });
                return;
            }
            
            handleTrainRequest(socket, message.payload);
            break;
            
        case 'PREDICT_REQUEST':
            handlePredictRequest(socket, message.payload);
            break;
            
        case 'LIST_MODELS':
            handleListModels(socket);
            break;
            
        default:
            sendResponse(socket, { error: 'Tipo de mensaje desconocido' });
    }
}

// Listar modelos disponibles
function handleListModels(socket) {
    const fs = require('fs');
    const modelsDir = path.resolve(__dirname, '../../core/models');
    
    try {
        if (!fs.existsSync(modelsDir)) {
            sendResponse(socket, { success: true, models: [] });
            return;
        }
        
        const files = fs.readdirSync(modelsDir);
        const modelFiles = files.filter(f => f.endsWith('.bin'));
        
        const models = modelFiles.map(f => {
            const id = f.replace('.bin', '');
            const metaPath = path.join(modelsDir, `${id}.json`);
            let meta = { id, dataset: 'Desconocido', date: '-', status: 'Disponible', accuracy: '-' };
            
            if (fs.existsSync(metaPath)) {
                try {
                    const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                    meta = { ...meta, ...data };
                } catch(e) {}
            } else {
                // Intentar obtener fecha del archivo
                try {
                    const stats = fs.statSync(path.join(modelsDir, f));
                    meta.date = stats.mtime.toISOString().split('T')[0];
                } catch(e) {}
            }
            return meta;
        });
        
        sendResponse(socket, { success: true, models });
    } catch (error) {
        sendResponse(socket, { success: false, error: error.message });
    }
}

// Procesar solicitud de entrenamiento
async function handleTrainRequest(socket, payload) {
    const { dataset, model_name } = payload;
    
    // Usar dataset predefinido en lugar de subir archivo
    const datasetPaths = {
        'mnist': path.resolve(__dirname, '../../core/datasets/mnist.csv'),
        'fashionmnist': path.resolve(__dirname, '../../core/datasets/fashionmnist.csv')
    };
    
    const inputPath = datasetPaths[dataset];
    if (!inputPath) {
        sendResponse(socket, { success: false, error: 'Dataset no válido' });
        return;
    }
    
    try {
        // Ejecutar entrenamiento y esperar resultado
        console.log(`[TRAIN] Modelo: ${model_name}, Dataset: ${dataset}`);
        const result = await trainModel(inputPath, model_name);
        
        // Guardar metadatos del modelo
        const fs = require('fs');
        const metaPath = path.resolve(__dirname, '../../core/models', `${model_name}.json`);
        const metadata = {
            id: model_name,
            dataset: dataset,
            date: new Date().toISOString().split('T')[0],
            status: 'Disponible',
            accuracy: result.accuracy || 'N/A'
        };
        try {
            fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
        } catch(e) {
            console.error("Error guardando metadatos:", e);
        }

        // Responder solo cuando termine
        updateMetrics('train', result.duration);
        console.log(`[TRAIN] Completado: ${model_name} en ${result.duration}s`);
        
        sendResponse(socket, {
            success: true,
            message: 'Entrenamiento completado exitosamente',
            modelId: model_name,
            duration: result.duration
        });
        
    } catch (error) {
        updateMetrics('error');
        sendResponse(socket, {
            success: false,
            error: error.message
        });
    }
}

// Procesar solicitud de predicción
async function handlePredictRequest(socket, payload) {
    const { model_id, input_vector } = payload;
    
    try {
        const result = await predict(model_id, input_vector);
        
        // Actualizar métricas
        updateMetrics('predict');
        
        sendResponse(socket, result);
    } catch (error) {
        updateMetrics('error');
        sendResponse(socket, {
            success: false,
            error: error.message
        });
    }
}

// Manejar mensajes de otros nodos
function handlePeerMessage(socket, message) {
    // Filtrar heartbeats para no saturar consola
    if (message.type !== 'APPEND_ENTRIES' || message.entries?.length > 0) {
        // console.log(`[PEER] Recibido: ${message.type}`);
    }
    
    switch (message.type) {
        case 'IDENTIFY':
            console.log(`[PEER] Nodo identificado: ${message.nodeId}`);
            break;
            
        case 'REQUEST_VOTE':
            RaftNode.handleRequestVote(message);
            break;
            
        case 'REQUEST_VOTE_RESPONSE':
            RaftNode.handleRequestVoteResponse(message);
            break;
            
        case 'APPEND_ENTRIES':
            const result = RaftNode.handleAppendEntries(message);
            sendToPeer(message.leaderId, {
                type: 'APPEND_ENTRIES_RESPONSE',
                term: RaftNode.currentTerm,
                success: result.success,
                nodeId: config.nodeId
            });
            break;
            
        case 'APPEND_ENTRIES_RESPONSE':
            RaftNode.handleAppendEntriesResponse(message);
            break;
    }
}

// Iniciar todo
createClientServer(handleClientMessage);
createPeerServer(handlePeerMessage);
createMonitorServer();

// Conectar a peers después de un delay
setTimeout(connectToAllPeers, 2000);
