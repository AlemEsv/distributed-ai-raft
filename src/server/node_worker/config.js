// config.js
const nodeId = process.argv[2] || 'Node_A';

// Calcular offset para puertos únicos por nodo
const nodeOffsets = {
    'Node_A': 0,
    'Node_B': 1,
    'Node_C': 2
};
const offset = nodeOffsets[nodeId] || 0;

// Configuración de todos los nodos (para peers)
const allNodes = {
    'Node_A': { host: '127.0.0.1', clientPort: 5000, peerPort: 6000, httpPort: 8080 },
    'Node_B': { host: '127.0.0.1', clientPort: 5001, peerPort: 6001, httpPort: 8081 },
    'Node_C': { host: '127.0.0.1', clientPort: 5002, peerPort: 6002, httpPort: 8082 }
};

// Obtener peers (todos menos yo)
const peers = Object.entries(allNodes)
    .filter(([id]) => id !== nodeId)
    .map(([id, config]) => ({
        id,
        host: config.host,
        port: config.peerPort
    }));

module.exports = {
    nodeId,
    clientPort: allNodes[nodeId].clientPort,
    peerPort: allNodes[nodeId].peerPort,
    httpPort: allNodes[nodeId].httpPort,
    peers,
    javaJar: './core_ia.jar'
};