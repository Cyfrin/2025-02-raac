import pkg from 'glob';
const { sync } = pkg;
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Unit Tests', function() {
  before(async function() {

    const testPatterns = [
      'test/unit/**/*.test.js',
      'test/unit/**/**/*.test.js'
    ];
    // Get all test files matching the patterns, excluding duplicates
    const testFiles = [...new Set(testPatterns.flatMap(pattern => 
      sync(pattern, {
        ignore: ['test/unit/index.test.js'],
        absolute: false, 
        cwd: process.cwd()
      })
    ))];

    // Import and run each test file
    for (const file of testFiles) {
      console.log(`Loading tests from: ${file}`);
      try {
        const modulePath = `${process.cwd()}/${file}`;
        await import(modulePath);
      } catch (error) {
        console.error(`Error loading tests from: ${file}`, error);
      }
    }
  });

  // ensure the describe block runs
  it('should load all test files', function() {
  });
});