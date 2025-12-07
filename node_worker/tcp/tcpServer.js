// tcp/tcpServer.js
const net = require('net');
const config = require('../config');

// Buffer para manejar mensajes fragmentados
const clientBuffers = new Map();

function createClientServer(messageHandler) {
    const server = net.createServer((socket) => {
        const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
        console.log(`[TCP] Cliente conectado: ${clientId}`);
        
        clientBuffers.set(clientId, '');
        
        socket.on('data', (data) => {
            // Acumular datos en buffer
            let buffer = clientBuffers.get(clientId) + data.toString();
            
            // Procesar mensajes completos (delimitador \n)
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const rawMessage = buffer.slice(0, newlineIndex);
                buffer = buffer.slice(newlineIndex + 1);
                
                try {
                    const message = JSON.parse(rawMessage);
                    messageHandler(socket, message);
                } catch (err) {
                    console.error('[TCP] JSON inválido:', rawMessage);
                }
            }
            
            clientBuffers.set(clientId, buffer);
        });
        
        socket.on('close', () => {
            console.log(`[TCP] Cliente desconectado: ${clientId}`);
            clientBuffers.delete(clientId);
        });
        
        socket.on('error', (err) => {
            console.error(`[TCP] Error: ${err.message}`);
        });
    });
    
    server.listen(config.clientPort, () => {
        console.log(`[TCP] Servidor clientes en puerto ${config.clientPort}`);
    });
    
    return server;
}

// Enviar respuesta al cliente
function sendResponse(socket, response) {
    socket.write(JSON.stringify(response) + '\n');
}

module.exports = { createClientServer, sendResponse };