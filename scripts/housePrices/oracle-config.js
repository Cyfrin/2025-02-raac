import { Location, ReturnType, CodeLanguage } from "@chainlink/functions-toolkit"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, "house-price-api.js");

const requestConfig = {
  source: fs.readFileSync(filePath).toString(),
  codeLocation: Location.Inline,
  // Optional
  secrets: { apiKey: process.env.RAAC_HOUSING_API_KEY ?? "" },
  // Optional
  secretsLocation: Location.DONHosted,
  args: ["1"],
  codeLanguage: CodeLanguage.JavaScript,
  expectedReturnType: ReturnType.uint256,
}

export default requestConfig
