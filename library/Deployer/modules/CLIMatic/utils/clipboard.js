import { spawn, spawnSync } from 'child_process';

const clipboard = {
    copy: (text) => {
        const proc = spawn('pbcopy');
        proc.stdin.write(text);
        proc.stdin.end();
    },
    paste: () => {
        return new Promise((resolve, reject) => {
            const proc = spawn('pbpaste');
            let output = '';
            
            proc.stdout.on('data', data => output += data);
            proc.on('close', () => resolve(output));
            proc.on('error', reject);
        });
    },
    copySync: (text) => {
        spawnSync('pbcopy', { input: text });
    },
    pasteSync: () => {
        return spawnSync('pbpaste').stdout.toString();
    }
};

export default clipboard;