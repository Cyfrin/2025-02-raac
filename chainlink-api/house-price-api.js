/**
 * The script is used by Chainlink nodes to execute the external adapter logic.
 *
 * It will call the pricing API and return the price of a house.
 *
 * API requirements:
 * - API key
 */

if (!secrets.apiKey) {
  throw new Error("HOUSING PRICE API KEY is required to access the API data. Please provide one.")
}

if (args.length !== 1) {
  throw new Error("House ID is required.")
}

// To make an HTTP request, use the Functions.makeHttpRequest function
// Functions.makeHttpRequest function parameters:
// - url
// - method (optional, defaults to 'GET')
// - headers: headers supplied as an object (optional)
// - params: URL query parameters supplied as an object (optional)
// - data: request body supplied as an object (optional)
// - timeout: maximum request duration in ms (optional, defaults to 10000ms)
// - responseType: expected response type (optional, defaults to 'json')

// TODO: Should we use an API KEY or a Public/Private Key pair?

const houseId = args[0]

const API_URL = `http://34.226.139.10:3000/v1/houses/${houseId}`

const housePriceRequest = await Functions.makeHttpRequest({
  url: API_URL,
  headers: { Authorization: `Bearer ${secrets.apiKey}` },
})

if (!housePriceRequest.data) {
  console.log(housePriceRequest)
  throw new Error("Failed to fetch house price data from the API.")
}

// The response from the API is expected to be in JSON format
const housePrice = housePriceRequest.data.price

// Multiply by 100 to convert the price to an integer
return Functions.encodeUint256(housePrice * 100)
