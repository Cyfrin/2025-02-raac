import getSupply from './getSupply.js';
import { getConfig } from '../utils/contracts.js';

async function getAsset(chainId, assetId, provider) {
    try {
        const {assets} = getConfig(chainId);
        const asset = Object.values(assets).find(asset => asset.id === assetId);
        if (!asset) {
            throw new Error(`Asset ${assetId} not found on chain ${chainId}`);
        }
        asset.supply = await getSupply(chainId, assetId, provider);
        return asset;
    } catch (error) {
        console.error(`Error getting asset ${assetId}:`, error);
        return 0;
    }
}

export default getAsset;