import ParaLogger from './ParaLogger.js';

async function measureDifficulty(difficulty, samples = 3) {
    const logger = new ParaLogger(difficulty);
    const times = [];
    
    console.log(`\nTesting difficulty: ${difficulty}`);
    
    for(let i = 0; i < samples; i++) {
        const start = Date.now();
        await logger.addLog('TEST', { sample: i });
        const duration = Date.now() - start;
        times.push(duration);
        console.log(`Sample ${i + 1}: ${duration}ms`);
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
        difficulty,
        averageMs: avg,
        minMs: min,
        maxMs: max
    };
}

async function calibrate() {
    console.log('Starting ParaLogger calibration...');
    
    const results = [];
    // Test difficulties from 5 to 7 in 0.25 increments
    for(let diff = 5; diff <= 7; diff += 0.25) {
        const result = await measureDifficulty(diff);
        results.push(result);
    }
    
    console.log('\nCalibration Results:');
    console.table(results);
    
    const timeTargets = [100, 500, 1000, 5000];
    console.log('\nRecommended difficulties:');
    
    for(const target of timeTargets) {
        const closest = results.reduce((prev, curr) => {
            return Math.abs(curr.averageMs - target) < Math.abs(prev.averageMs - target) ? curr : prev;
        });
        
        console.log(`For ~${target}ms: difficulty ${closest.difficulty} (actual: ${closest.averageMs.toFixed(0)}ms)`);
    }
}

calibrate().catch(console.error);