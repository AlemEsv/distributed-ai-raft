// http/monitor.js
const http = require('http');
const config = require('../config');

// Estado compartido
let raftState = {
    role: 'FOLLOWER',
    term: 0,
    leader: null,
    votedFor: null,
    logLength: 0,
    commitIndex: 0
};

let replicationState = {
    logEntries: [],
    filesOnDisk: []
};

function updateRaftState(newState) {
    raftState = { ...raftState, ...newState };
}

function updateReplicationState(newState) {
    replicationState = { ...replicationState, ...newState };
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
                replication: replicationState
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
    const roleColor = {
        'LEADER': '#27ae60',
        'CANDIDATE': '#f39c12',
        'FOLLOWER': '#3498db'
    };
    
    const roleIcon = {
        'LEADER': '👑',
        'CANDIDATE': '🗳️',
        'FOLLOWER': '👤'
    };
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Monitor - ${config.nodeId}</title>
    <meta http-equiv="refresh" content="2">
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            padding: 20px; 
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee;
            min-height: 100vh;
            margin: 0;
        }
        .container { max-width: 900px; margin: 0 auto; }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .header h1 { margin: 0; font-size: 28px; }
        .role { 
            padding: 12px 24px; 
            border-radius: 25px; 
            background: ${roleColor[raftState.role] || '#666'};
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .card { 
            background: rgba(255,255,255,0.05); 
            padding: 20px; 
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .card h3 { 
            margin: 0 0 15px 0; 
            color: #3498db;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 10px;
        }
        .stat { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .stat:last-child { border-bottom: none; }
        .stat-value { font-weight: bold; color: #3498db; }
        .log-entry { 
            padding: 10px; 
            margin: 8px 0; 
            background: rgba(52, 152, 219, 0.1); 
            border-radius: 6px;
            border-left: 3px solid #3498db;
            font-size: 14px;
        }
        .file-entry {
            padding: 8px 12px;
            margin: 5px 0;
            background: rgba(39, 174, 96, 0.1);
            border-radius: 6px;
            border-left: 3px solid #27ae60;
        }
        .empty { color: #666; font-style: italic; }
        .leader-badge { 
            display: inline-block;
            background: #f39c12;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .refresh-info { 
            text-align: center; 
            color: #666; 
            font-size: 12px; 
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🖥️ ${config.nodeId} ${raftState.role === 'LEADER' ? '<span class="leader-badge">LÍDER ACTIVO</span>' : ''}</h1>
            <span class="role">${roleIcon[raftState.role] || '?'} ${raftState.role}</span>
        </div>
        
        <div class="cards">
            <div class="card">
                <h3>⚡ Estado RAFT</h3>
                <div class="stat">
                    <span>Término Actual</span>
                    <span class="stat-value">${raftState.term}</span>
                </div>
                <div class="stat">
                    <span>Líder Conocido</span>
                    <span class="stat-value">${raftState.leader || 'Ninguno'}</span>
                </div>
                <div class="stat">
                    <span>Votó Por</span>
                    <span class="stat-value">${raftState.votedFor || '-'}</span>
                </div>
                <div class="stat">
                    <span>Entradas en Log</span>
                    <span class="stat-value">${raftState.logLength || 0}</span>
                </div>
                <div class="stat">
                    <span>Commit Index</span>
                    <span class="stat-value">${raftState.commitIndex || 0}</span>
                </div>
            </div>
            
            <div class="card">
                <h3>📁 Archivos Replicados (${replicationState.filesOnDisk?.length || 0})</h3>
                ${(replicationState.filesOnDisk?.length > 0) 
                    ? replicationState.filesOnDisk.map(f => `<div class="file-entry">📄 ${f}</div>`).join('')
                    : '<p class="empty">Sin archivos replicados</p>'
                }
            </div>
            
            <div class="card" style="grid-column: 1 / -1;">
                <h3>📜 Log de Operaciones (últimas 10)</h3>
                ${(replicationState.logEntries?.length > 0)
                    ? replicationState.logEntries.slice(-10).reverse().map(e => `
                        <div class="log-entry">
                            <strong>[${e.index}]</strong> 
                            <span style="color: #f39c12;">Term ${e.term}</span> - 
                            ${e.command?.type || e.command || 'N/A'}
                            ${e.command?.filename ? `<br><small>📄 ${e.command.filename}</small>` : ''}
                        </div>
                    `).join('')
                    : '<p class="empty">Log vacío - esperando operaciones</p>'
                }
            </div>
        </div>
        
        <p class="refresh-info">🔄 Auto-refresh cada 2 segundos | Puertos: TCP ${config.clientPort} | Peer ${config.peerPort}</p>
    </div>
</body>
</html>`;
}

module.exports = { createMonitorServer, updateRaftState, updateReplicationState };