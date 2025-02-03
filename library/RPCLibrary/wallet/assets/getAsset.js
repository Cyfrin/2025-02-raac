import { getConfig } from '../../utils/contracts.js';

async function getAsset(chainId, assetId, address, signer) {
    const {assets} = getConfig(chainId);
    const asset = assets[assetId];
    let response = {
        ...asset,
        balance: 0,
    };

    const owner = address;

    try {
        const balance = await this.getBalance(chainId, assetId, owner, signer);
        response.balance = (parseFloat(balance)).toString();
    } catch (error) {
        console.log(`Error getting balance: ${error}`);
    }
   
    return response;
};

export default getAsset;