import { getConfig } from '../utils/contracts.js';

async function getAssets(chainId, signer) {
    const {assets} = getConfig(chainId);
    const responses = {};

    const assetIds = Object.keys(assets);
    const assetPromises = assetIds.map(async (assetId) => {
        const asset = await this.getAsset(chainId, assetId, signer);
        responses[assetId] = {
            ...assets[assetId],
            ...asset,
        };
        return responses[assetId];
    });
    const assetsPromise = await Promise.all(assetPromises);

    const response = {};
    for (const asset of assetsPromise) {
        response[asset.id] = asset;
    }
    return response;
};

export default getAssets;