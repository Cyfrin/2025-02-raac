import { ethers } from "ethers";

export async function linkLendingPool(deployer, config, deployment) {

    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mLINK_LENDING_POOL_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();
    const RToken = deployment.contracts['RToken'];  
    const rTokenAddress = RToken?.address || RToken;
    const RAACLendingPool = deployment.contracts['RAACLendingPool'];
    const RAACLendingPoolAddress = RAACLendingPool?.address || RAACLendingPool;
    const RTokenArtifact = await deployer.readArtifactFile("RToken");
    
    const addressDeployer = await wallet.getAddress();
    const rtoken = new ethers.Contract(rTokenAddress, RTokenArtifact.abi, wallet);


    // Are we owner of RToken ?
    const actualRTokenOwner = await rtoken.owner();

    if(actualRTokenOwner == addressDeployer) {
   
        // Ensure RToken reserve pool is set to RAACLendingPool
        const actualRTokenReservePool = await rtoken.getReservePool();
      
        if(actualRTokenReservePool !== RAACLendingPoolAddress) {
            deployer.logger.addLog('LINK_LENDING_POOL_RTOKEN_RESERVE_POOL_MISMATCH', { message: `RToken reserve pool mismatch. Expected ${RAACLendingPoolAddress}, got ${actualRTokenReservePool}` });

            // Perform setReservePool
            const setReservePoolTx = await rtoken.setReservePool(RAACLendingPoolAddress);
            const setReservePoolReceipt = await setReservePoolTx.wait();
            deployer.logger.addLog('LINK_LENDING_POOL_SET_RTOKEN_RESERVE_POOL', { tx: setReservePoolReceipt });
        }
        deployer.logger.addLog('LINK_LENDING_POOL_RTOKEN_RESERVE_POOL', { actualRTokenReservePool, RAACLendingPoolAddress });

        // Ensure RToken minter & burner are set to RAACLendingPool
        const actualRTokenMinter = await rtoken._minter();
        if(actualRTokenMinter !== RAACLendingPoolAddress) {
            deployer.logger.addLog('LINK_LENDING_POOL_RTOKEN_MINTER_MISMATCH', { message: `RToken minter mismatch. Expected ${RAACLendingPoolAddress}, got ${actualRTokenMinter}` });
            const setMinterTx = await rtoken.setMinter(RAACLendingPoolAddress);
            const setMinterReceipt = await setMinterTx.wait();
            deployer.logger.addLog('LINK_LENDING_POOL_SET_RTOKEN_MINTER', { tx: setMinterReceipt });
        }

        const actualRTokenBurner = await rtoken._burner();
        if(actualRTokenBurner !== RAACLendingPoolAddress) {
            deployer.logger.addLog('LINK_LENDING_POOL_RTOKEN_BURNER_MISMATCH', { message: `RToken burner mismatch. Expected ${RAACLendingPoolAddress}, got ${actualRTokenBurner}` });
            const setBurnerTx = await rtoken.setBurner(RAACLendingPoolAddress);
            const setBurnerReceipt = await setBurnerTx.wait();
            deployer.logger.addLog('LINK_LENDING_POOL_SET_RTOKEN_BURNER', { tx: setBurnerReceipt });
        }

        deployer.logger.addLog('LINK_LENDING_POOL_RTOKEN_MINTER_BURNER', { actualRTokenMinter, actualRTokenBurner, RAACLendingPoolAddress });
        // If all is good, we can transfer ownership of RToken to RAACLendingPool
        const transferOwnershipTx = await rtoken.transferOwnership(RAACLendingPoolAddress);
        const transferOwnershipReceipt = await transferOwnershipTx.wait();
        deployer.logger.addLog('LINK_LENDING_POOL_TRANSFER_OWNERSHIP', { tx: transferOwnershipReceipt });
    }

    const debtTokenAddress = deployment.contracts['DebtToken'];
    const DebtTokenArtifact = await deployer.readArtifactFile("DebtToken");
    const debtToken = new ethers.Contract(debtTokenAddress, DebtTokenArtifact.abi, wallet);

    // Are we owner of DebtToken ?
    const actualDebtTokenOwner = await debtToken.owner();
    if(actualDebtTokenOwner == addressDeployer) {
        // Ensure DebtToken reserve pool is set to RAACLendingPool (reserve pool can mint and burn).
        const actualDebtTokenReservePool = await debtToken.getReservePool();
        if(actualDebtTokenReservePool !== RAACLendingPoolAddress) {
            deployer.logger.addLog('LINK_LENDING_POOL_RESERVE_POOL_MISMATCH', { message: `DebtToken reserve pool mismatch. Expected ${RAACLendingPoolAddress}, got ${actualDebtTokenReservePool}` });

            // Perform setReservePool
            const setReservePoolTx = await debtToken.setReservePool(RAACLendingPoolAddress);
            const setReservePoolReceipt = await setReservePoolTx.wait();
            deployer.logger.addLog('LINK_LENDING_POOL_SET_RESERVE_POOL', { tx: setReservePoolReceipt });
        }
        deployer.logger.addLog('LINK_LENDING_POOL_DEBT_TOKEN_RESERVE_POOL', { actualDebtTokenReservePool, RAACLendingPoolAddress });
        const transferOwnershipTx = await debtToken.transferOwnership(RAACLendingPoolAddress);
        const transferOwnershipReceipt = await transferOwnershipTx.wait();
        deployer.logger.addLog('LINK_LENDING_POOL_TRANSFER_OWNERSHIP', { tx: transferOwnershipReceipt });
    }


    // Prime rate setter for LendingPool (new pr). 
    //setPrimeRateOracle()

    return deployment;
}