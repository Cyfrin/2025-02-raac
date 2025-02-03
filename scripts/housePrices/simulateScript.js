
import {simulateScript, decodeResult} from "@chainlink/functions-toolkit"
import config from "./oracle-config.js"

/**
 * Simulates a JavaScript source code execution locally based on the provided config path.
 * 
 * @param {string} configPath - Path to the Functions request config file.
 */
async function simulateScriptLocally(config) {
  try {

    // Simulate the JavaScript execution locally
    const { responseBytesHexstring, errorString, capturedTerminalOutput } = await simulateScript(config);

    console.log(`${capturedTerminalOutput}\n`);
    if (responseBytesHexstring) {
      console.log(
        `Response returned by script during local simulation: ${decodeResult(
          responseBytesHexstring,
          config.expectedReturnType
        ).toString()}\n`
      );
    }
    if (errorString) {
      console.error(`Error returned by simulated script:\n${errorString}\n`);
    }
  } catch (error) {
    console.error("An error occurred while simulating the script:", error);
  }
}

simulateScriptLocally(config)
  .then(() => console.log("Script simulation complete."))
  .catch((error) => console.error("Script simulation failed:", error));