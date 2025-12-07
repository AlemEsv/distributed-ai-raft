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
            res.end(JSON.stringify({
                node: config.nodeId,
                raft: raftState,
                replication: getReplicationState()
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
        <h3>📁 Archivos en Disco (${repl.filesOnDisk.length})</h3>
        ${repl.filesOnDisk.map(f => `<div class="log-entry">📄 ${f}</div>`).join('') || '<p>Sin archivos</p>'}
    </div>
    
    <div class="card">
        <h3>📜 Log de Operaciones (${repl.logEntries.length})</h3>
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

module.exports = { createMonitorServer, updateRaftState };