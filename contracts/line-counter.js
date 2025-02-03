import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SolidityLineCounter {
    constructor() {
        // Regex patterns
        this.patterns = {
            import: /^\s*import\s+.*$/,
            singleLineComment: /^\s*(\/\/.*$|\/\*.*\*\/$)/,
            multilineCommentStart: /\/\*/,
            multilineCommentEnd: /\*\//,
            contract: /^\s*(contract|interface|library|abstract contract)\s+\w+/,
            emptyLine: /^\s*$/,
            pragma: /^\s*pragma\s+.*$/,
            event: /^\s*event\s+\w+/,
            error: /^\s*error\s+\w+/,
            function: /^\s*function\s+\w+/,
            modifier: /^\s*modifier\s+\w+/,
            struct: /^\s*struct\s+\w+/,
            enum: /^\s*enum\s+\w+/
        };
    }

    countLines(filePath) {
        const stats = {
            total_lines: 0,
            code_lines: 0,
            comment_lines: 0,
            empty_lines: 0,
            import_lines: 0,
            pragma_lines: 0,
            contract_definitions: 0,
            event_definitions: 0,
            error_definitions: 0,
            function_definitions: 0,
            modifier_definitions: 0,
            struct_definitions: 0,
            enum_definitions: 0
        };

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            let inMultilineComment = false;

            lines.forEach(line => {
                stats.total_lines++;

                // Handle multiline comments
                if (inMultilineComment) {
                    stats.comment_lines++;
                    if (this.patterns.multilineCommentEnd.test(line)) {
                        inMultilineComment = false;
                    }
                    return;
                }

                // Check for multiline comment start
                if (this.patterns.multilineCommentStart.test(line)) {
                    if (!this.patterns.multilineCommentEnd.test(line)) {
                        inMultilineComment = true;
                    }
                    stats.comment_lines++;
                    return;
                }

                // Check empty lines
                if (this.patterns.emptyLine.test(line)) {
                    stats.empty_lines++;
                    return;
                }

                // Check single-line comments
                if (this.patterns.singleLineComment.test(line)) {
                    stats.comment_lines++;
                    return;
                }

                // Check imports
                if (this.patterns.import.test(line)) {
                    stats.import_lines++;
                    return;
                }

                // Check pragma
                if (this.patterns.pragma.test(line)) {
                    stats.pragma_lines++;
                    return;
                }

                // Check definitions
                if (this.patterns.contract.test(line)) stats.contract_definitions++;
                if (this.patterns.event.test(line)) stats.event_definitions++;
                if (this.patterns.error.test(line)) stats.error_definitions++;
                if (this.patterns.function.test(line)) stats.function_definitions++;
                if (this.patterns.modifier.test(line)) stats.modifier_definitions++;
                if (this.patterns.struct.test(line)) stats.struct_definitions++;
                if (this.patterns.enum.test(line)) stats.enum_definitions++;

                // If we get here, it's a code line
                stats.code_lines++;
            });

            return stats;
        } catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            return stats;
        }
    }
}

function analyzeDirectory(directoryPath) {
    const counter = new SolidityLineCounter();
    const results = [];
    const totalStats = {
        total_lines: 0,
        code_lines: 0,
        comment_lines: 0,
        empty_lines: 0,
        import_lines: 0,
        pragma_lines: 0,
        contract_definitions: 0,
        event_definitions: 0,
        error_definitions: 0,
        function_definitions: 0,
        modifier_definitions: 0,
        struct_definitions: 0,
        enum_definitions: 0
    };

    function processDirectory(dir) {
        const files = fs.readdirSync(dir);
        
        files.forEach(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                processDirectory(filePath);
            } else if (path.extname(file) === '.sol') {
                const stats = counter.countLines(filePath);
                const relativePath = path.relative(directoryPath, filePath);
                
                // Add to totals
                Object.keys(totalStats).forEach(key => {
                    totalStats[key] += stats[key];
                });

                results.push({
                    file: relativePath,
                    stats: stats
                });
            }
        });
    }

    processDirectory(directoryPath);
    return { results, totalStats };
}

function printResults(results, totalStats) {
    console.log('\n=== Individual File Statistics ===');
    results.forEach(result => {
        console.log(`\nFile: ${result.file}`);
        console.log('  Statistics:');
        Object.entries(result.stats).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
        });
    });

    console.log('\n=== Total Statistics ===');
    console.log(`Total Files: ${results.length}`);
    Object.entries(totalStats).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
    });

    // Calculate and print percentages
    const totalLines = totalStats.total_lines;
    console.log('\n=== Percentages ===');
    Object.entries(totalStats).forEach(([key, value]) => {
        if (key !== 'total_lines') {
            const percentage = ((value / totalLines) * 100).toFixed(2);
            console.log(`${key}: ${percentage}%`);
        }
    });

    // Generate CSV
    generateCSV(results, totalStats);
}

function generateCSV(results, totalStats) {
    // Get all possible stat keys from the first result
    const statKeys = Object.keys(results[0].stats);
    
    // Create CSV header
    const header = ['File', ...statKeys].join(',');
    
    // Create CSV rows for each file
    const fileRows = results.map(result => {
        const stats = statKeys.map(key => result.stats[key]);
        return [result.file, ...stats].join(',');
    });
    
    // Create totals row
    const totalsRow = ['TOTALS', ...statKeys.map(key => totalStats[key])].join(',');
    
    // Create percentages row
    const percentagesRow = ['PERCENTAGES', ...statKeys.map(key => {
        if (key === 'total_lines') return '';
        return ((totalStats[key] / totalStats.total_lines) * 100).toFixed(2) + '%';
    })].join(',');
    
    // Combine all rows
    const csvContent = [
        header,
        ...fileRows,
        '',  // Empty line before totals
        totalsRow,
        percentagesRow
    ].join('\n');
    
    // Write to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFileName = `solidity-metrics-${timestamp}.csv`;
    fs.writeFileSync(csvFileName, csvContent);
    console.log(`\nCSV file generated: ${csvFileName}`);
}

// Main execution
const librariesPath = path.join(path.dirname(__filename), 'libraries');
const { results, totalStats } = analyzeDirectory(librariesPath);
printResults(results, totalStats);
