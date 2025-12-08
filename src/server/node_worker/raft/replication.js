// raft/replication.js
const fs = require('fs');
const path = require('path');
const { broadcastToPeers } = require('../tcp/peerSocket');

const DISK_PATH = path.join(__dirname, '../disk');
const LOGS_PATH = path.join(DISK_PATH, 'logs');
const DATASETS_PATH = path.join(DISK_PATH, 'datasets');

// Asegurar que existan las carpetas
[DISK_PATH, LOGS_PATH, DATASETS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Log de operaciones (en memoria + disco)
let logEntries = [];
let commitIndex = 0;

// Guardar archivo en disco local
function storeFile(filename, content) {
    const filePath = path.join(DATASETS_PATH, filename);
    fs.writeFileSync(filePath, content);
    console.log(`[DISK] Archivo guardado: ${filename}`);
}

// Agregar entrada al log
function appendToLog(entry) {
    logEntries.push({
        index: logEntries.length,
        term: entry.term || 1,
        command: entry.command,
        filename: entry.filename,
        timestamp: Date.now()
    });
    
    // Persistir log
    fs.writeFileSync(
        path.join(LOGS_PATH, 'raft_log.json'),
        JSON.stringify(logEntries, null, 2)
    );
}

// Líder: replicar a followers
// (Movido a RaftNode.js)

// Follower: manejar AppendEntries del líder
// (Movido a RaftNode.js)

// Obtener estado actual para monitor
function getReplicationState() {
    return {
        logEntries,
        commitIndex,
        filesOnDisk: fs.readdirSync(DATASETS_PATH)
    };
}

module.exports = {
    storeFile,
    appendToLog,
    getReplicationState
};