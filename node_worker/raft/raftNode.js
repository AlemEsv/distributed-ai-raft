// raft/raftNode.js
const EventEmitter = require('events');

// Estados posibles del nodo
const State = {
    FOLLOWER: 'FOLLOWER',
    CANDIDATE: 'CANDIDATE',
    LEADER: 'LEADER'
};

class RaftNode extends EventEmitter {
    constructor(nodeId, peers) {
        super();
        this.nodeId = nodeId;
        this.peers = peers; // Lista de peers [{id, host, port}]
        
        // Estado persistente
        this.currentTerm = 0;
        this.votedFor = null;
        this.log = [];
        
        // Estado volátil
        this.state = State.FOLLOWER;
        this.leaderId = null;
        this.commitIndex = 0;
        this.lastApplied = 0;
        
        // Estado del líder (solo cuando es líder)
        this.nextIndex = {};  // Para cada peer
        this.matchIndex = {}; // Para cada peer
        
        // Votos recibidos en elección actual
        this.votesReceived = new Set();
        
        // Timers
        this.electionTimer = null;
        this.heartbeatTimer = null;
        
        // Configuración de tiempos (ms)
        this.electionTimeoutMin = 1500;  // 1.5 segundos
        this.electionTimeoutMax = 3000;  // 3 segundos
        this.heartbeatInterval = 500;    // 500ms
        
        // Callbacks para comunicación (se setean desde afuera)
        this.sendToPeer = null;
        this.broadcastToPeers = null;
        
        console.log(`[RAFT] Nodo ${nodeId} inicializado como FOLLOWER`);
    }

    // ==================== INICIALIZACIÓN ====================
    
    start() {
        this.resetElectionTimer();
        console.log(`[RAFT] Nodo iniciado, esperando heartbeat o timeout...`);
    }

    // ==================== TIMERS ====================
    
    getRandomElectionTimeout() {
        return Math.floor(
            Math.random() * (this.electionTimeoutMax - this.electionTimeoutMin) 
            + this.electionTimeoutMin
        );
    }

    resetElectionTimer() {
        if (this.electionTimer) clearTimeout(this.electionTimer);
        
        const timeout = this.getRandomElectionTimeout();
        this.electionTimer = setTimeout(() => {
            this.onElectionTimeout();
        }, timeout);
    }

    stopElectionTimer() {
        if (this.electionTimer) {
            clearTimeout(this.electionTimer);
            this.electionTimer = null;
        }
    }

    startHeartbeatTimer() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        
        this.heartbeatTimer = setInterval(() => {
            this.sendHeartbeats();
        }, this.heartbeatInterval);
    }

    stopHeartbeatTimer() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    // ==================== TRANSICIONES DE ESTADO ====================
    
    becomeFollower(term, leaderId = null) {
        console.log(`[RAFT] Transición a FOLLOWER (term ${term})`);
        this.state = State.FOLLOWER;
        this.currentTerm = term;
        this.votedFor = null;
        this.leaderId = leaderId;
        this.votesReceived.clear();
        
        this.stopHeartbeatTimer();
        this.resetElectionTimer();
        
        this.emitStateChange();
    }

    becomeCandidate() {
        this.state = State.CANDIDATE;
        this.currentTerm++;
        this.votedFor = this.nodeId;
        this.votesReceived.clear();
        this.votesReceived.add(this.nodeId); // Votar por sí mismo
        this.leaderId = null;
        
        console.log(`[RAFT] Transición a CANDIDATE (term ${this.currentTerm})`);
        
        this.resetElectionTimer();
        this.requestVotes();
        
        this.emitStateChange();
    }

    becomeLeader() {
        console.log(`[RAFT] ¡SOY EL LÍDER! (term ${this.currentTerm})`);
        this.state = State.LEADER;
        this.leaderId = this.nodeId;
        
        // Inicializar índices para cada peer
        const lastLogIndex = this.log.length;
        this.peers.forEach(peer => {
            this.nextIndex[peer.id] = lastLogIndex + 1;
            this.matchIndex[peer.id] = 0;
        });
        
        this.stopElectionTimer();
        this.sendHeartbeats(); // Enviar inmediatamente
        this.startHeartbeatTimer();
        
        this.emitStateChange();
    }

    emitStateChange() {
        this.emit('stateChange', {
            role: this.state,
            term: this.currentTerm,
            leader: this.leaderId,
            votedFor: this.votedFor
        });
    }

    // ==================== ELECCIÓN ====================
    
    onElectionTimeout() {
        if (this.state === State.LEADER) return;
        
        console.log(`[RAFT] Election timeout! Iniciando elección...`);
        this.becomeCandidate();
    }

    requestVotes() {
        const lastLogIndex = this.log.length - 1;
        const lastLogTerm = lastLogIndex >= 0 ? this.log[lastLogIndex].term : 0;
        
        const request = {
            type: 'REQUEST_VOTE',
            term: this.currentTerm,
            candidateId: this.nodeId,
            lastLogIndex: lastLogIndex,
            lastLogTerm: lastLogTerm
        };
        
        console.log(`[RAFT] Solicitando votos para term ${this.currentTerm}`);
        
        if (this.broadcastToPeers) {
            this.broadcastToPeers(request);
        }
        
        // Verificar si ya ganó (caso de cluster de 1 nodo)
        this.checkElectionWon();
    }

    handleRequestVote(request) {
        const { term, candidateId, lastLogIndex, lastLogTerm } = request;
        
        let voteGranted = false;
        
        // Si el término es mayor, convertirse en follower
        if (term > this.currentTerm) {
            this.becomeFollower(term);
        }
        
        // Condiciones para otorgar voto
        const termOk = term >= this.currentTerm;
        const notVotedOrSameCandidate = this.votedFor === null || this.votedFor === candidateId;
        const logOk = this.isLogUpToDate(lastLogIndex, lastLogTerm);
        
        if (termOk && notVotedOrSameCandidate && logOk) {
            voteGranted = true;
            this.votedFor = candidateId;
            this.resetElectionTimer(); // Reset timer al votar
            console.log(`[RAFT] Voto otorgado a ${candidateId}`);
        } else {
            console.log(`[RAFT] Voto denegado a ${candidateId}`);
        }
        
        return {
            type: 'REQUEST_VOTE_RESPONSE',
            term: this.currentTerm,
            voteGranted: voteGranted,
            voterId: this.nodeId
        };
    }

    handleRequestVoteResponse(response) {
        const { term, voteGranted, voterId } = response;
        
        // Si recibimos un término mayor, volver a follower
        if (term > this.currentTerm) {
            this.becomeFollower(term);
            return;
        }
        
        // Ignorar si ya no somos candidatos o el término no coincide
        if (this.state !== State.CANDIDATE || term !== this.currentTerm) {
            return;
        }
        
        if (voteGranted) {
            this.votesReceived.add(voterId);
            console.log(`[RAFT] Voto recibido de ${voterId} (${this.votesReceived.size}/${this.getMajority()})`);
            this.checkElectionWon();
        }
    }

    checkElectionWon() {
        if (this.state !== State.CANDIDATE) return;
        
        const majority = this.getMajority();
        if (this.votesReceived.size >= majority) {
            console.log(`[RAFT] ¡Elección ganada con ${this.votesReceived.size} votos!`);
            this.becomeLeader();
        }
    }

    isLogUpToDate(lastLogIndex, lastLogTerm) {
        const myLastIndex = this.log.length - 1;
        const myLastTerm = myLastIndex >= 0 ? this.log[myLastIndex].term : 0;
        
        if (lastLogTerm !== myLastTerm) {
            return lastLogTerm >= myLastTerm;
        }
        return lastLogIndex >= myLastIndex;
    }

    getMajority() {
        const totalNodes = this.peers.length + 1; // peers + yo
        return Math.floor(totalNodes / 2) + 1;
    }

    // ==================== HEARTBEATS / APPEND ENTRIES ====================
    
    sendHeartbeats() {
        if (this.state !== State.LEADER) return;
        
        const request = {
            type: 'APPEND_ENTRIES',
            term: this.currentTerm,
            leaderId: this.nodeId,
            prevLogIndex: this.log.length - 1,
            prevLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0,
            entries: [], // Heartbeat vacío
            leaderCommit: this.commitIndex
        };
        
        if (this.broadcastToPeers) {
            this.broadcastToPeers(request);
        }
    }

    handleAppendEntries(request) {
        const { term, leaderId, prevLogIndex, prevLogTerm, entries, leaderCommit } = request;
        
        let success = false;
        
        // Si el término es menor, rechazar
        if (term < this.currentTerm) {
            return {
                type: 'APPEND_ENTRIES_RESPONSE',
                term: this.currentTerm,
                success: false,
                nodeId: this.nodeId
            };
        }
        
        // Si el término es mayor o igual, reconocer al líder
        if (term >= this.currentTerm) {
            this.becomeFollower(term, leaderId);
        }
        
        this.resetElectionTimer(); // Recibimos heartbeat válido
        
        // Verificar log consistency
        if (prevLogIndex === -1 || 
            (prevLogIndex < this.log.length && 
             (prevLogIndex === -1 || this.log[prevLogIndex].term === prevLogTerm))) {
            success = true;
            
            // Agregar nuevas entradas
            if (entries && entries.length > 0) {
                // Eliminar entradas conflictivas y agregar nuevas
                this.log = this.log.slice(0, prevLogIndex + 1);
                this.log.push(...entries);
                console.log(`[RAFT] Log actualizado, ${entries.length} entradas agregadas`);
                
                // Emitir evento para replicar archivos
                entries.forEach(entry => {
                    this.emit('entryCommitted', entry);
                });
            }
            
            // Actualizar commitIndex
            if (leaderCommit > this.commitIndex) {
                this.commitIndex = Math.min(leaderCommit, this.log.length - 1);
            }
        }
        
        return {
            type: 'APPEND_ENTRIES_RESPONSE',
            term: this.currentTerm,
            success: success,
            nodeId: this.nodeId,
            matchIndex: this.log.length - 1
        };
    }

    handleAppendEntriesResponse(response) {
        const { term, success, nodeId, matchIndex } = response;
        
        if (term > this.currentTerm) {
            this.becomeFollower(term);
            return;
        }
        
        if (this.state !== State.LEADER) return;
        
        if (success) {
            if (matchIndex !== undefined) {
                this.matchIndex[nodeId] = matchIndex;
                this.nextIndex[nodeId] = matchIndex + 1;
            }
        } else {
            // Decrementar nextIndex y reintentar
            if (this.nextIndex[nodeId] > 0) {
                this.nextIndex[nodeId]--;
            }
        }
    }

    // ==================== REPLICACIÓN DE COMANDOS ====================
    
    appendEntry(command) {
        if (this.state !== State.LEADER) {
            return { success: false, error: 'No soy el líder', leader: this.leaderId };
        }
        
        const entry = {
            term: this.currentTerm,
            index: this.log.length,
            command: command,
            timestamp: Date.now()
        };
        
        this.log.push(entry);
        console.log(`[RAFT] Nueva entrada en log: ${JSON.stringify(command)}`);
        
        // Replicar a todos los peers
        this.replicateToFollowers();
        
        return { success: true, index: entry.index };
    }

    replicateToFollowers() {
        if (this.state !== State.LEADER) return;
        
        this.peers.forEach(peer => {
            const nextIdx = this.nextIndex[peer.id] || 0;
            const prevLogIndex = nextIdx - 1;
            const prevLogTerm = prevLogIndex >= 0 ? this.log[prevLogIndex].term : 0;
            const entries = this.log.slice(nextIdx);
            
            if (entries.length > 0) {
                const request = {
                    type: 'APPEND_ENTRIES',
                    term: this.currentTerm,
                    leaderId: this.nodeId,
                    prevLogIndex: prevLogIndex,
                    prevLogTerm: prevLogTerm,
                    entries: entries,
                    leaderCommit: this.commitIndex
                };
                
                if (this.sendToPeer) {
                    this.sendToPeer(peer.id, request);
                }
            }
        });
    }

    // ==================== GETTERS ====================
    
    getState() {
        return {
            nodeId: this.nodeId,
            role: this.state,
            term: this.currentTerm,
            leader: this.leaderId,
            votedFor: this.votedFor,
            logLength: this.log.length,
            commitIndex: this.commitIndex
        };
    }

    isLeader() {
        return this.state === State.LEADER;
    }

    getLeaderId() {
        return this.leaderId;
    }
}

module.exports = { RaftNode, State };