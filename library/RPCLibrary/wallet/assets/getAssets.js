import { getConfig } from '../../utils/contracts.js';

async function getAssets(chainId, address, signer) {
    const {assets} = getConfig(chainId);
    const responses = {};

    const assetIds = Object.keys(assets);
    const assetPromises = assetIds.map(async (assetId) => {
        const asset = await this.getAsset(chainId, assetId, address, signer);
        responses[assetId] = {
            ...assets[assetId],
            ...asset,
        };
        return responses[assetId];
    });
    const assetResponses = await Promise.all(assetPromises);
    const response = {};
    assetResponses.forEach((asset) => {
        response[asset.id] = asset;
    });

    return response;
};

export default getAssets;