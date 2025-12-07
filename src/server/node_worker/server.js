// server.js
const config = require('./config');
const { createClientServer, sendResponse } = require('./tcp/tcpServer');
const { createPeerServer, connectToAllPeers, sendToPeer } = require('./tcp/peerSocket');
const { replicateEntry, handleAppendEntries, getReplicationState } = require('./raft/replication');
const { createMonitorServer, updateRaftState } = require('./http/monitor');
const { trainModel, predict } = require('./java/executor');
const path = require('path');

console.log(`\n========== NODO ${config.nodeId} ==========\n`);

// Variable compartida para rol actual (P1 la actualizará)
let isLeader = false;

// Manejar mensajes de clientes
function handleClientMessage(socket, message) {
    console.log(`[CLIENT] Recibido: ${message.type}`);
    
    switch (message.type) {
        case 'TRAIN_REQUEST':
            if (!isLeader) {
                sendResponse(socket, { 
                    success: false, 
                    error: 'No soy el líder',
                    leader: null // P1 debe proveer esto
                });
                return;
            }
            
            handleTrainRequest(socket, message.payload);
            break;
            
        case 'PREDICT_REQUEST':
            handlePredictRequest(socket, message.payload);
            break;
            
        default:
            sendResponse(socket, { error: 'Tipo de mensaje desconocido' });
    }
}

// Procesar solicitud de entrenamiento
async function handleTrainRequest(socket, payload) {
    const { data_content, model_name } = payload;
    const filename = `${model_name}_${Date.now()}.csv`;
    const inputPath = path.join(__dirname, 'disk/datasets', filename);
    
    try {
        // 1. Replicar datos a todos los nodos
        replicateEntry(
            { command: 'STORE_FILE', filename },
            Buffer.from(data_content, 'base64')
        );
        
        // 2. Esperar confirmación de mayoría (simplificado)
        // En producción, P1 maneja el quorum
        
        // 3. Ejecutar entrenamiento en Java
        const result = await trainModel(inputPath, model_name);
        
        sendResponse(socket, {
            success: true,
            message: 'Entrenamiento completado',
            modelId: result.modelId
        });
        
    } catch (error) {
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
        sendResponse(socket, result);
    } catch (error) {
        sendResponse(socket, {
            success: false,
            error: error.message
        });
    }
}

// Manejar mensajes de otros nodos
function handlePeerMessage(socket, message) {
    console.log(`[PEER] Recibido: ${message.type}`);
    
    switch (message.type) {
        case 'IDENTIFY':
            console.log(`[PEER] Nodo identificado: ${message.nodeId}`);
            break;
            
        case 'APPEND_ENTRIES':
            const result = handleAppendEntries(message);
            socket.write(JSON.stringify({
                type: 'APPEND_ENTRIES_RESPONSE',
                ...result,
                nodeId: config.nodeId
            }) + '\n');
            break;
            
        // P1 agregará más tipos: REQUEST_VOTE, HEARTBEAT, etc.
    }
}

// Función para que P1 actualice el estado
function setLeaderStatus(status, raftInfo) {
    isLeader = status;
    updateRaftState(raftInfo);
}

// Iniciar todo
createClientServer(handleClientMessage);
createPeerServer(handlePeerMessage);
createMonitorServer();

// Conectar a peers después de un delay
setTimeout(connectToAllPeers, 2000);

// Exportar para que P1 pueda integrarse
module.exports = { setLeaderStatus };