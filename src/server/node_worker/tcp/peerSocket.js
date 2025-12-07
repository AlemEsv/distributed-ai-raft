// tcp/peerSocket.js
const net = require('net');
const config = require('../config');

const peerConnections = new Map();
const peerBuffers = new Map();

// Servidor para recibir conexiones de otros nodos
function createPeerServer(messageHandler) {
    const server = net.createServer((socket) => {
        const peerId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[PEER] Nodo conectado: ${peerId}`);
        
        peerBuffers.set(peerId, '');
        
        socket.on('data', (data) => {
            let buffer = peerBuffers.get(peerId) + data.toString();
            
            let idx;
            while ((idx = buffer.indexOf('\n')) !== -1) {
                const raw = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                
                try {
                    const msg = JSON.parse(raw);
                    messageHandler(socket, msg);
                } catch (e) {
                    console.error('[PEER] Parse error');
                }
            }
            peerBuffers.set(peerId, buffer);
        });
        
        socket.on('close', () => peerBuffers.delete(peerId));
    });
    
    server.listen(config.peerPort, () => {
        console.log(`[PEER] Servidor nodos en puerto ${config.peerPort}`);
    });
    
    return server;
}

// Conectar a un peer específico
function connectToPeer(peer) {
    if (peerConnections.has(peer.id)) return;
    
    const socket = new net.Socket();
    
    socket.connect(peer.port, peer.host, () => {
        console.log(`[PEER] Conectado a ${peer.id}`);
        peerConnections.set(peer.id, socket);
        
        // Identificarse
        sendToPeer(peer.id, {
            type: 'IDENTIFY',
            nodeId: config.nodeId
        });
    });
    
    socket.on('error', () => {
        console.log(`[PEER] No se pudo conectar a ${peer.id}, reintentando...`);
        peerConnections.delete(peer.id);
        setTimeout(() => connectToPeer(peer), 3000);
    });
    
    socket.on('close', () => {
        peerConnections.delete(peer.id);
        setTimeout(() => connectToPeer(peer), 3000);
    });
}

// Enviar mensaje a un peer
function sendToPeer(peerId, message) {
    const socket = peerConnections.get(peerId);
    if (socket) {
        socket.write(JSON.stringify(message) + '\n');
    }
}

// Broadcast a todos los peers
function broadcastToPeers(message) {
    for (const [peerId, socket] of peerConnections) {
        socket.write(JSON.stringify(message) + '\n');
    }
}

// Iniciar conexiones a todos los peers
function connectToAllPeers() {
    config.peers.forEach(peer => connectToPeer(peer));
}

module.exports = {
    createPeerServer,
    connectToAllPeers,
    sendToPeer,
    broadcastToPeers,
    peerConnections
};