// server.js
const config = require('./config');
const { createClientServer, sendResponse } = require('./tcp/tcpServer');
const { createPeerServer, connectToAllPeers, sendToPeer } = require('./tcp/peerSocket');
const RaftNode = require('./raft/RaftNode');
const { createMonitorServer } = require('./http/monitor');
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
        // 1. Replicar datos a todos los nodos (Consenso Raft)
        RaftNode.replicateData(filename, Buffer.from(data_content, 'base64'));
        
        // 2. Ejecutar entrenamiento en Java
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
