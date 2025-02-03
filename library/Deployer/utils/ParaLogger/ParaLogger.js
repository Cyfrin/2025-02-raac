import crypto from 'crypto';
import { EventEmitter } from 'events';

class ParaLogger extends EventEmitter {
    constructor(difficulty = 4) {
        super();
        this.logs = [];
        this.lastHash = '';
        this.difficulty = difficulty; // Number of leading zeros required in hash
        this.target = '0'.repeat(difficulty); // Target string for proof of work
    }

    findNonce(data, previousHash) {
        let nonce = 0;
        let start = Date.now();
        let hash;
        
        while (true) {
            const entry = {
                ...this.prepareBigIntForJSON(data),
                previousHash,
                nonce
            };
            
            hash = crypto.createHash('sha256')
                .update(JSON.stringify(entry))
                .digest('hex');
            
            if (hash.startsWith(this.target)) {
                return { hash, nonce };
            }
            
            nonce++;
        }
    }

    prepareBigIntForJSON(obj) {
        if(!obj) return obj;
        return JSON.parse(JSON.stringify(obj, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        ));
    }

    addLog(type, data) {
        const timestamp = Date.now();
        const logData = {
            timestamp,
            type,
            data: this.prepareBigIntForJSON(data)
        };

        const { hash, nonce } = this.findNonce(logData, this.lastHash);
        
        const entry = {
            ...logData,
            previousHash: this.lastHash,
            nonce,
            hash
        };
        
        this.lastHash = hash;
        this.logs.push(entry);
        this.emit('ADD_LOG', entry);
        return entry;
    }

    export(options = { excludeHashes: false }) {
        return {
            logs: options.excludeHashes ? 
                this.logs.map(({hash, previousHash, nonce, ...log}) => log) : 
                this.logs,
            finalHash: this.lastHash,
            difficulty: this.difficulty
        };
    }

    verify() {
        let prevHash = '';
        
        for (const log of this.logs) {
            const {hash, previousHash, nonce, ...data} = log;
            
            // Verify hash chain
            if (previousHash !== prevHash) {
                return false;
            }
            
            // Verify proof of work
            const computedHash = crypto.createHash('sha256')
                .update(JSON.stringify({...data, previousHash, nonce}))
                .digest('hex');
                
            if (!computedHash.startsWith(this.target)) {
                return false;
            }
            
            if (computedHash !== hash) {
                return false;
            }
            
            prevHash = hash;
        }
        return true;
    }

    getDifficulty() {
        return this.difficulty;
    }

    setDifficulty(newDifficulty) {
        if (this.logs.length > 0) {
            throw new Error('Cannot change difficulty after logs have been added');
        }
        this.difficulty = newDifficulty;
        this.target = '0'.repeat(newDifficulty);
    }

    getStats() {
        return {
            logCount: this.logs.length,
            difficulty: this.difficulty,
            lastHash: this.lastHash,
            isValid: this.verify()
        };
    }
}

export default ParaLogger;