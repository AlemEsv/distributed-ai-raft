const config = require('../config');
const { broadcastToPeers, sendToPeer } = require('../tcp/peerSocket');
const { updateRaftState } = require('../http/monitor');
const { storeFile, appendToLog, getReplicationState } = require('./replication');

const STATES = {
    FOLLOWER: 'FOLLOWER',
    CANDIDATE: 'CANDIDATE',
    LEADER: 'LEADER'
};

class RaftNode {
    constructor() {
        this.state = STATES.FOLLOWER;
        this.currentTerm = 0;
        this.votedFor = null;
        this.log = []; // { term, command, filename }
        this.commitIndex = 0;
        this.lastApplied = 0;
        this.leaderId = null;
        
        // Timers
        this.electionTimer = null;
        this.heartbeatTimer = null;
        
        // Leader specific
        this.nextIndex = {};
        this.matchIndex = {};
        this.votesReceived = 0;

        // Bindings
        this.startElection = this.startElection.bind(this);
        this.sendHeartbeats = this.sendHeartbeats.bind(this);
        
        // Initialize
        this.resetElectionTimer();
        this.updateMonitor();
    }

    // --- State Management ---

    transitionTo(newState) {
        console.log(`[RAFT] Transition: ${this.state} -> ${newState}`);
        this.state = newState;
        
        if (newState === STATES.FOLLOWER) {
            this.stopHeartbeats();
            this.resetElectionTimer();
        } else if (newState === STATES.CANDIDATE) {
            this.startElection();
        } else if (newState === STATES.LEADER) {
            this.stopElectionTimer();
            this.startHeartbeats();
            this.leaderId = config.nodeId;
            // Initialize leader state
            config.peers.forEach(p => {
                this.nextIndex[p.id] = this.log.length;
                this.matchIndex[p.id] = 0;
            });
        }
        this.updateMonitor();
    }

    updateMonitor() {
        updateRaftState({
            role: this.state,
            term: this.currentTerm,
            leader: this.leaderId,
            votedFor: this.votedFor
        });
    }

    // --- Timers ---

    resetElectionTimer() {
        if (this.electionTimer) clearTimeout(this.electionTimer);
        
        // Random timeout between 150ms and 300ms
        const timeout = Math.floor(Math.random() * 150) + 150;
        
        this.electionTimer = setTimeout(() => {
            console.log('[RAFT] Election timeout!');
            this.transitionTo(STATES.CANDIDATE);
        }, timeout);
    }

    stopElectionTimer() {
        if (this.electionTimer) clearTimeout(this.electionTimer);
    }

    startHeartbeats() {
        this.sendHeartbeats();
        this.heartbeatTimer = setInterval(this.sendHeartbeats, 50); // 50ms heartbeat
    }

    stopHeartbeats() {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    }

    // --- Election Logic ---

    startElection() {
        this.currentTerm++;
        this.votedFor = config.nodeId;
        this.votesReceived = 1; // Vote for self
        this.leaderId = null;
        
        console.log(`[RAFT] Starting election for term ${this.currentTerm}`);
        
        this.resetElectionTimer();
        
        // Send RequestVote to all peers
        broadcastToPeers({
            type: 'REQUEST_VOTE',
            term: this.currentTerm,
            candidateId: config.nodeId,
            lastLogIndex: this.log.length - 1,
            lastLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0
        });
    }

    handleRequestVote(msg) {
        const { term, candidateId, lastLogIndex, lastLogTerm } = msg;
        
        if (term > this.currentTerm) {
            this.currentTerm = term;
            this.votedFor = null;
            this.transitionTo(STATES.FOLLOWER);
        }
        
        let voteGranted = false;
        
        // Basic voting logic
        if (term >= this.currentTerm && 
            (this.votedFor === null || this.votedFor === candidateId)) {
            
            // Check log up-to-date (simplified for now)
            const myLastLogIndex = this.log.length - 1;
            const myLastLogTerm = this.log.length > 0 ? this.log[myLastLogIndex].term : 0;
            
            if (lastLogTerm > myLastLogTerm || 
                (lastLogTerm === myLastLogTerm && lastLogIndex >= myLastLogIndex)) {
                voteGranted = true;
                this.votedFor = candidateId;
                this.resetElectionTimer();
            }
        }
        
        sendToPeer(candidateId, {
            type: 'REQUEST_VOTE_RESPONSE',
            term: this.currentTerm,
            voteGranted
        });
    }

    handleRequestVoteResponse(msg) {
        if (this.state !== STATES.CANDIDATE) return;
        
        if (msg.term > this.currentTerm) {
            this.currentTerm = msg.term;
            this.transitionTo(STATES.FOLLOWER);
            return;
        }
        
        if (msg.voteGranted) {
            this.votesReceived++;
            const quorum = Math.floor((config.peers.length + 1) / 2) + 1;
            
            if (this.votesReceived >= quorum) {
                console.log(`[RAFT] Won election with ${this.votesReceived} votes`);
                this.transitionTo(STATES.LEADER);
            }
        }
    }

    // --- Replication Logic ---

    sendHeartbeats() {
        if (this.state !== STATES.LEADER) return;
        
        broadcastToPeers({
            type: 'APPEND_ENTRIES',
            term: this.currentTerm,
            leaderId: config.nodeId,
            prevLogIndex: this.log.length - 1,
            prevLogTerm: this.log.length > 0 ? this.log[this.log.length - 1].term : 0,
            entries: [], // Empty for heartbeat
            leaderCommit: this.commitIndex
        });
    }

    handleAppendEntries(msg) {
        const { term, leaderId, prevLogIndex, prevLogTerm, entries, leaderCommit, fileContent } = msg;
        
        if (term < this.currentTerm) {
            return { success: false, term: this.currentTerm };
        }
        
        this.currentTerm = term;
        this.leaderId = leaderId;
        this.transitionTo(STATES.FOLLOWER); // Reset timer
        
        // Log consistency check (simplified)
        // In a real implementation, we check prevLogIndex and prevLogTerm
        
        // Append new entries
        if (entries && entries.length > 0) {
            entries.forEach(entry => {
                this.log.push(entry);
                appendToLog(entry); // Persist to disk log
                
                // If there's file content, save it
                if (fileContent) {
                    const contentBuffer = Buffer.from(fileContent, 'base64');
                    storeFile(entry.filename, contentBuffer);
                }
            });
        }
        
        // Update commit index
        if (leaderCommit > this.commitIndex) {
            this.commitIndex = Math.min(leaderCommit, this.log.length - 1);
        }
        
        return { success: true, term: this.currentTerm };
    }

    handleAppendEntriesResponse(msg) {
        if (this.state !== STATES.LEADER) return;
        
        if (msg.term > this.currentTerm) {
            this.currentTerm = msg.term;
            this.transitionTo(STATES.FOLLOWER);
            return;
        }
        
        // In a full implementation, we would update nextIndex and matchIndex here
    }

    // --- Client API ---

    replicateData(filename, content) {
        if (this.state !== STATES.LEADER) {
            throw new Error('Not leader');
        }
        
        const entry = {
            term: this.currentTerm,
            command: 'STORE_FILE',
            filename
        };
        
        this.log.push(entry);
        appendToLog(entry);
        storeFile(filename, content);
        
        // Broadcast to peers with content
        broadcastToPeers({
            type: 'APPEND_ENTRIES',
            term: this.currentTerm,
            leaderId: config.nodeId,
            prevLogIndex: this.log.length - 2,
            prevLogTerm: this.log.length > 1 ? this.log[this.log.length - 2].term : 0,
            entries: [entry],
            leaderCommit: this.commitIndex,
            fileContent: content.toString('base64')
        });
        
        return true; // Optimistic success
    }
}

module.exports = new RaftNode();
