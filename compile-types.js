/**
 * Take the artifacts and generate types.
 */
import fs from "fs";
import path from "path";
import glob from "glob";
import { exec } from "child_process";
import { fileURLToPath } from "url";

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the base folder path
const baseFolderPath = path.resolve(__dirname, "./artifacts");

// Find all .json files in the folder (and subfolders), excluding .dbg.json and build-info
const abiFiles = glob.sync(`${baseFolderPath}/**/*.json`, {
	ignore: [
		`${baseFolderPath}/**/*.dbg.json`, // Exclude debug files
		`${path.resolve(__dirname, "./artifacts/build-info")}/**/*.json`, // Exclude build-info folder
	],
});

// If no valid files are found, exit
if (abiFiles.length === 0) {
	console.error("No valid ABI files found.");
	process.exit(1);
}

// Prepare the TypeChain command for all valid files
const typechainCmd = `npx typechain --target ethers-v6 --out-dir typechain-types ${abiFiles.join(
	" "
)}`;

// Run the command
exec(typechainCmd, (error, stdout, stderr) => {
	if (error) {
		console.error(`Error: ${error.message}`);
		return;
	}
	if (stderr) {
		console.error(`Stderr: ${stderr}`);
		return;
	}
	console.log(stdout);
});
