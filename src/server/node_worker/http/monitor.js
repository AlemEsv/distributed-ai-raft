// http/monitor.js
const http = require('http');
const config = require('../config');
const { getReplicationState } = require('../raft/replication');

// Estado compartido con P1 (RAFT)
let raftState = {
    role: 'FOLLOWER',
    term: 0,
    leader: null,
    votedFor: null
};

// Métricas de rendimiento
let metrics = {
    trainings: 0,
    predictions: 0,
    lastTraining: null,
    lastPrediction: null,
    trainingTimes: [],
    errors: 0
};

function updateMetrics(type, duration = null) {
    const now = new Date().toISOString();
    if (type === 'train') {
        metrics.trainings++;
        metrics.lastTraining = now;
        if (duration) metrics.trainingTimes.push(duration);
    } else if (type === 'predict') {
        metrics.predictions++;
        metrics.lastPrediction = now;
    } else if (type === 'error') {
        metrics.errors++;
    }
}

function updateRaftState(newState) {
    raftState = { ...raftState, ...newState };
}

function createMonitorServer() {
    const server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/status') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(generateHTML());
        } else if (req.url === '/api/status') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            const avgTrainingTime = metrics.trainingTimes.length > 0 
                ? Math.round(metrics.trainingTimes.reduce((a,b) => a+b, 0) / metrics.trainingTimes.length)
                : 0;
            res.end(JSON.stringify({
                node: config.nodeId,
                raft: raftState,
                replication: getReplicationState(),
                metrics: {
                    ...metrics,
                    avgTrainingTime
                }
            }));
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    });
    
    server.listen(config.httpPort, () => {
        console.log(`[HTTP] Monitor en http://localhost:${config.httpPort}`);
    });
    
    return server;
}

function generateHTML() {
    const repl = getReplicationState();
    const roleColor = {
        'LEADER': '#27ae60',
        'CANDIDATE': '#f39c12',
        'FOLLOWER': '#3498db'
    };
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Monitor - ${config.nodeId}</title>
    <meta http-equiv="refresh" content="2">
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #1a1a2e; color: #eee; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .role { 
            padding: 10px 20px; 
            border-radius: 5px; 
            background: ${roleColor[raftState.role] || '#666'};
            font-weight: bold;
        }
        .card { background: #16213e; padding: 15px; margin: 10px 0; border-radius: 8px; }
        .log-entry { padding: 8px; margin: 5px 0; background: #0f3460; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🖥️ ${config.nodeId}</h1>
        <span class="role">${raftState.role}</span>
    </div>
    
    <div class="card">
        <h3>Estado RAFT</h3>
        <table>
            <tr><td>Término Actual</td><td><strong>${raftState.term}</strong></td></tr>
            <tr><td>Líder Conocido</td><td>${raftState.leader || 'Ninguno'}</td></tr>
            <tr><td>Votó Por</td><td>${raftState.votedFor || '-'}</td></tr>
        </table>
    </div>
    
    <div class="card">
        <h3>Métricas de Rendimiento</h3>
        <table>
            <tr><td>Entrenamientos Completados</td><td><strong>${metrics.trainings}</strong></td></tr>
            <tr><td>Predicciones Realizadas</td><td><strong>${metrics.predictions}</strong></td></tr>
            <tr><td>Errores</td><td style="color: ${metrics.errors > 0 ? '#e74c3c' : '#27ae60'}">${metrics.errors}</td></tr>
            <tr><td>Último Entrenamiento</td><td>${metrics.lastTraining || 'N/A'}</td></tr>
            <tr><td>Última Predicción</td><td>${metrics.lastPrediction || 'N/A'}</td></tr>
        </table>
    </div>
    
    <div class="card">
        <h3>Archivos en Disco (${repl.filesOnDisk.length})</h3>
        ${repl.filesOnDisk.map(f => `<div class="log-entry">${f}</div>`).join('') || '<p style="color:#666">Sin archivos replicados</p>'}
    </div>
    
    <div class="card">
        <h3>Log de Operaciones (${repl.logEntries.length})</h3>
        ${repl.logEntries.slice(-10).reverse().map(e => `
            <div class="log-entry">
                <strong>[${e.index}]</strong> ${e.command} - ${e.filename} 
                <small>(term ${e.term})</small>
            </div>
        `).join('') || '<p>Log vacío</p>'}
    </div>
    
    <p style="color:#666; font-size:12px;">Auto-refresh cada 2 segundos</p>
</body>
</html>`;
}

module.exports = { createMonitorServer, updateRaftState, updateMetrics };