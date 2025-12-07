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
function replicateEntry(entry, fileContent) {
    // Guardar localmente primero
    storeFile(entry.filename, fileContent);
    appendToLog(entry);
    
    // Enviar a todos los peers
    broadcastToPeers({
        type: 'APPEND_ENTRIES',
        term: entry.term || 1,
        leaderId: require('../config').nodeId,
        entries: [entry],
        fileContent: fileContent.toString('base64')
    });
}

// Follower: manejar AppendEntries del líder
function handleAppendEntries(message) {
    const { entries, fileContent, term, leaderId } = message;
    
    entries.forEach(entry => {
        // Decodificar y guardar archivo
        const content = Buffer.from(fileContent, 'base64');
        storeFile(entry.filename, content);
        appendToLog(entry);
    });
    
    console.log(`[RAFT] Replicado desde ${leaderId}, term ${term}`);
    
    return { success: true, term };
}

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
    replicateEntry,
    handleAppendEntries,
    getReplicationState
};