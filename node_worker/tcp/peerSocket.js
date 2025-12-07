// tcp/peerSocket.js
const net = require('net');
const config = require('../config');

const peerConnections = new Map();
const peerBuffers = new Map();
const identifiedPeers = new Map(); // socket -> peerId

let messageHandler = null;

// Servidor para recibir conexiones de otros nodos
function createPeerServer(handler) {
    messageHandler = handler;
    
    const server = net.createServer((socket) => {
        const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[PEER] Conexión entrante: ${socketId}`);
        
        peerBuffers.set(socketId, '');
        
        socket.on('data', (data) => {
            let buffer = peerBuffers.get(socketId) + data.toString();
            
            let idx;
            while ((idx = buffer.indexOf('\n')) !== -1) {
                const raw = buffer.slice(0, idx);
                buffer = buffer.slice(idx + 1);
                
                try {
                    const msg = JSON.parse(raw);
                    
                    // Si es identificación, mapear socket a peerId
                    if (msg.type === 'IDENTIFY') {
                        identifiedPeers.set(socketId, msg.nodeId);
                        peerConnections.set(msg.nodeId, socket);
                        console.log(`[PEER] Nodo identificado: ${msg.nodeId}`);
                    }
                    
                    if (messageHandler) {
                        messageHandler(socket, msg);
                    }
                } catch (e) {
                    console.error('[PEER] Parse error:', e.message);
                }
            }
            peerBuffers.set(socketId, buffer);
        });
        
        socket.on('close', () => {
            const peerId = identifiedPeers.get(socketId);
            if (peerId) {
                peerConnections.delete(peerId);
                identifiedPeers.delete(socketId);
                console.log(`[PEER] Nodo desconectado: ${peerId}`);
            }
            peerBuffers.delete(socketId);
        });
        
        socket.on('error', (err) => {
            console.error(`[PEER] Error socket: ${err.message}`);
        });
    });
    
    server.listen(config.peerPort, () => {
        console.log(`[PEER] Servidor nodos en puerto ${config.peerPort}`);
    });
    
    return server;
}

// Conectar a un peer específico
function connectToPeer(peer, handler) {
    if (peerConnections.has(peer.id)) return;
    
    const socket = new net.Socket();
    
    socket.connect(peer.port, peer.host, () => {
        console.log(`[PEER] Conectado a ${peer.id}`);
        peerConnections.set(peer.id, socket);
        
        // Buffer para este socket
        const socketId = `outgoing_${peer.id}`;
        peerBuffers.set(socketId, '');
        
        // Identificarse
        sendToPeer(peer.id, {
            type: 'IDENTIFY',
            nodeId: config.nodeId
        });
    });
    
    socket.on('data', (data) => {
        const socketId = `outgoing_${peer.id}`;
        let buffer = (peerBuffers.get(socketId) || '') + data.toString();
        
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            
            try {
                const msg = JSON.parse(raw);
                if (handler) {
                    handler(socket, msg);
                } else if (messageHandler) {
                    messageHandler(socket, msg);
                }
            } catch (e) {
                console.error('[PEER] Parse error:', e.message);
            }
        }
        peerBuffers.set(socketId, buffer);
    });
    
    socket.on('error', (err) => {
        console.log(`[PEER] Error con ${peer.id}: ${err.message}`);
        peerConnections.delete(peer.id);
        setTimeout(() => connectToPeer(peer, handler), 3000);
    });
    
    socket.on('close', () => {
        console.log(`[PEER] Conexión cerrada con ${peer.id}`);
        peerConnections.delete(peer.id);
        setTimeout(() => connectToPeer(peer, handler), 3000);
    });
}

// Enviar mensaje a un peer específico
function sendToPeer(peerId, message) {
    const socket = peerConnections.get(peerId);
    if (socket && !socket.destroyed) {
        socket.write(JSON.stringify(message) + '\n');
        return true;
    }
    return false;
}

// Broadcast a todos los peers conectados
function broadcastToPeers(message) {
    let sent = 0;
    for (const [peerId, socket] of peerConnections) {
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify(message) + '\n');
            sent++;
        }
    }
    return sent;
}

// Iniciar conexiones a todos los peers
function connectToAllPeers(handler) {
    config.peers.forEach(peer => connectToPeer(peer, handler));
}

function getPeerConnections() {
    return peerConnections;
}

module.exports = {
    createPeerServer,
    connectToAllPeers,
    sendToPeer,
    broadcastToPeers,
    getPeerConnections
};