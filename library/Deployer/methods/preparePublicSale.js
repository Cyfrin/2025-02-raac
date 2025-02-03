export default async function preparePublicSale(config) {
    const { logger } = this;
    
    logger.addLog('PREPARE_PUBLIC_SALE_START', { config });

    // Extract public sale wallets
    const publicSaleWallets = config.wallets.filter(w => 
        w.type === 'public' || w.type === 'private'
    );
    
    // Calculate allocations
    const publicSaleConfig = {
        // Sale parameters
        tokenPrice: "1.00", // Price in USD
        minPurchase: "100", // Minimum purchase in USD
        maxPurchase: "100000", // Maximum purchase in USD
        
        // Time windows
        privateStart: Math.min(...publicSaleWallets
            .filter(w => w.type === 'private')
            .map(w => new Date(w.schedules[0].start).getTime() / 1000)),
        privateEnd: Math.max(...publicSaleWallets
            .filter(w => w.type === 'private')
            .map(w => new Date(w.schedules[0].end).getTime() / 1000)),
        publicStart: Math.min(...publicSaleWallets
            .filter(w => w.type === 'public')
            .map(w => new Date(w.schedules[0].start).getTime() / 1000)),
        publicEnd: Math.max(...publicSaleWallets
            .filter(w => w.type === 'public')
            .map(w => new Date(w.schedules[0].end).getTime() / 1000)),

        // Allocations
        privateAllocation: publicSaleWallets
            .filter(w => w.type === 'private')
            .reduce((sum, w) => sum + Number(w.amount), 0),
        publicAllocation: publicSaleWallets
            .filter(w => w.type === 'public')
            .reduce((sum, w) => sum + Number(w.amount), 0),

        // Whitelist for private sale
        whitelist: publicSaleWallets
            .filter(w => w.type === 'private')
            .map(wallet => ({
                address: wallet.address,
                allocation: wallet.amount.toString(),
                vestingStart: Math.floor(new Date(wallet.schedules[0].start).getTime() / 1000),
                vestingEnd: Math.floor(new Date(wallet.schedules[0].end).getTime() / 1000)
            }))
    };

    logger.addLog('PREPARE_PUBLIC_SALE_SUCCESS', { publicSaleConfig });
    
    return publicSaleConfig;
} 