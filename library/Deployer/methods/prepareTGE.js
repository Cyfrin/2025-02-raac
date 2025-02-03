import parseTextReadableAmount from '../utils/parseTextReadableAmount.js';
    
export default async function prepareTGE(config) {
    const { logger } = this;

    logger.addLog('PREPARE_TGE', { config });

    console.log('Preparing TGE...');
    console.log(config);
    // config: identifier, type, address, amount, schedules

    let totalLockedSupply = 0;

    for(const wallet of config.wallets) {
        totalLockedSupply += parseTextReadableAmount(wallet.amount);
    }


    const wallets = [];

    for(const wallet of config.wallets) {
        if(!wallet.schedules) {
            wallets.push({
                address: wallet.address,
                amount: parseTextReadableAmount(wallet.amount),
                type: wallet.type,
            });
            continue;
        }
        if(wallet?.schedules?.length > 1) {
            throw new Error('Multiple schedules are not supported yet');
        }

        const schedule = wallet?.schedules?.[0];
        wallets.push({
            address: wallet.address,
            amount: parseTextReadableAmount(wallet.amount),
            type: schedule.type,
            start: schedule.start,
            end: schedule.end,
        });
    }

    const tge = {
        totalSupply: totalLockedSupply,
        wallets,
    }

    logger.addLog('PREPARE_TGE_SUCCESS', { tge });

    return tge;
}