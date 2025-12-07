// server.js - Entry Point con RAFT integrado
const config = require('./config');
const { createClientServer, sendResponse } = require('./tcp/tcpServer');
const { createPeerServer, connectToAllPeers, sendToPeer, broadcastToPeers } = require('./tcp/peerSocket');
const { storeFile, appendToLog, getReplicationState } = require('./raft/replication');
const { createMonitorServer, updateRaftState, updateReplicationState } = require('./http/monitor');
const { trainModel, predict } = require('./java/executor');
const { RaftNode } = require('./raft/raftNode');
const path = require('path');
const fs = require('fs');

console.log(`
╔══════════════════════════════════════════╗
║         NODO ${config.nodeId.padEnd(10)}               ║
║   Sistema Distribuido con RAFT           ║
╚══════════════════════════════════════════╝
`);

// ==================== INICIALIZAR RAFT ====================

const raft = new RaftNode(config.nodeId, config.peers);

// Conectar funciones de red al módulo RAFT
raft.sendToPeer = sendToPeer;
raft.broadcastToPeers = broadcastToPeers;

// Escuchar cambios de estado RAFT
raft.on('stateChange', (state) => {
    console.log(`[STATE] ${state.role} | Term: ${state.term} | Líder: ${state.leader || 'N/A'}`);
    updateRaftState(state);
});

// Escuchar entradas confirmadas (para replicación de archivos)
raft.on('entryCommitted', (entry) => {
    console.log(`[COMMIT] Entrada aplicada:`, entry.command);
    
    // Si es un archivo, guardarlo
    if (entry.command && entry.command.type === 'STORE_FILE' && entry.command.content) {
        const content = Buffer.from(entry.command.content, 'base64');
        storeFile(entry.command.filename, content);
    }
});

// ==================== MANEJAR MENSAJES DE CLIENTES ====================

function handleClientMessage(socket, message) {
    console.log(`[CLIENT] Recibido: ${message.type}`);
    
    switch (message.type) {
        case 'TRAIN_REQUEST':
            handleTrainRequest(socket, message.payload);
            break;
            
        case 'PREDICT_REQUEST':
            handlePredictRequest(socket, message.payload);
            break;
            
        case 'GET_STATUS':
            sendResponse(socket, {
                success: true,
                node: config.nodeId,
                isLeader: raft.isLeader(),
                leader: raft.getLeaderId(),
                state: raft.getState()
            });
            break;
            
        case 'GET_LEADER':
            sendResponse(socket, {
                success: true,
                leader: raft.getLeaderId(),
                isLeader: raft.isLeader()
            });
            break;
            
        default:
            sendResponse(socket, { success: false, error: 'Tipo de mensaje desconocido' });
    }
}

// Procesar solicitud de entrenamiento
async function handleTrainRequest(socket, payload) {
    // Verificar si soy el líder
    if (!raft.isLeader()) {
        sendResponse(socket, { 
            success: false, 
            error: 'No soy el líder',
            leader: raft.getLeaderId()
        });
        return;
    }
    
    const { data_content, model_name } = payload;
    const filename = `${model_name}_${Date.now()}.csv`;
    const inputPath = path.join(__dirname, 'disk/datasets', filename);
    
    try {
        // 1. Agregar al log de RAFT (esto replica a followers)
        const result = raft.appendEntry({
            type: 'STORE_FILE',
            filename: filename,
            content: data_content // base64
        });
        
        if (!result.success) {
            sendResponse(socket, result);
            return;
        }
        
        // 2. Guardar localmente
        const content = Buffer.from(data_content, 'base64');
        storeFile(filename, content);
        
        // 3. Ejecutar entrenamiento en Java
        const trainResult = await trainModel(inputPath, model_name);
        
        // 4. Replicar modelo entrenado
        const modelPath = path.join(__dirname, 'disk/models', `${model_name}.bin`);
        if (fs.existsSync(modelPath)) {
            const modelContent = fs.readFileSync(modelPath);
            raft.appendEntry({
                type: 'STORE_MODEL',
                filename: `${model_name}.bin`,
                content: modelContent.toString('base64')
            });
        }
        
        sendResponse(socket, {
            success: true,
            message: 'Entrenamiento completado y replicado',
            modelId: model_name,
            logIndex: result.index
        });
        
    } catch (error) {
        console.error('[ERROR] Train request failed:', error);
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

// ==================== MANEJAR MENSAJES DE PEERS (RAFT) ====================

function handlePeerMessage(socket, message) {
    // console.log(`[PEER] Tipo: ${message.type}`);
    
    let response = null;
    
    switch (message.type) {
        case 'IDENTIFY':
            console.log(`[PEER] Nodo identificado: ${message.nodeId}`);
            break;
            
        case 'REQUEST_VOTE':
            response = raft.handleRequestVote(message);
            if (response) {
                socket.write(JSON.stringify(response) + '\n');
            }
            break;
            
        case 'REQUEST_VOTE_RESPONSE':
            raft.handleRequestVoteResponse(message);
            break;
            
        case 'APPEND_ENTRIES':
            response = raft.handleAppendEntries(message);
            if (response) {
                socket.write(JSON.stringify(response) + '\n');
            }
            
            // Actualizar estado de replicación para el monitor
            updateReplicationState(getReplicationState());
            break;
            
        case 'APPEND_ENTRIES_RESPONSE':
            raft.handleAppendEntriesResponse(message);
            break;
            
        default:
            console.log(`[PEER] Mensaje desconocido: ${message.type}`);
    }
}

// ==================== ACTUALIZAR MONITOR PERIÓDICAMENTE ====================

setInterval(() => {
    updateRaftState(raft.getState());
    updateReplicationState(getReplicationState());
}, 1000);

// ==================== INICIAR SERVIDORES ====================

createClientServer(handleClientMessage);
createPeerServer(handlePeerMessage);
createMonitorServer();

// Conectar a peers después de un delay
setTimeout(() => {
    connectToAllPeers(handlePeerMessage);
    
    // Iniciar RAFT después de conectar
    setTimeout(() => {
        raft.start();
    }, 2000);
}, 2000);

// ==================== MANEJO DE CIERRE ====================

process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] Cerrando nodo...');
    process.exit(0);
});

console.log('[INIT] Iniciando servicios...');