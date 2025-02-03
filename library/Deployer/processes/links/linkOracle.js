import { ethers } from "ethers";

export async function linkOracle(deployer, config, deployment) {
    const processResult = {
        timeStart: +new Date(),
    };
    deployer.logger.addLog('\x1b[36mLINK_ORACLE_START\x1b[0m', { config, timeStart: processResult.timeStart });

    const wallet = deployment.getWallet();
    const addressDeployer = await wallet.getAddress();

    // House Prices Oracle Setup
    const housePrices = deployment.contracts['RAACHousePrices'];
    const housePricesAddress = housePrices?.address || housePrices;
    const housePricesArtifact = await deployer.readArtifactFile("RAACHousePrices");
    const housePricesContract = new ethers.Contract(housePricesAddress, housePricesArtifact.abi, wallet);

    // Check if we are owner of house prices contract
    const housePricesOwner = await housePricesContract.owner();
    if(housePricesOwner === addressDeployer) {
        const RAACHousePriceOracleAddress = deployment.dependencies?.RAACHousePriceOracle?.address;
        const currentOracle = await housePricesContract.oracle();
        if(RAACHousePriceOracleAddress && currentOracle !== RAACHousePriceOracleAddress) {
            deployer.logger.addLog('LINK_ORACLE_HOUSE_PRICES_MISMATCH', { 
                message: `House prices oracle mismatch. Expected ${RAACHousePriceOracleAddress}, got ${currentOracle}` 
            });
            const setOracleTx = await housePricesContract.setOracle(RAACHousePriceOracleAddress);
            const setOracleReceipt = await setOracleTx.wait();
            deployer.logger.addLog('LINK_ORACLE_SET_HOUSE_PRICES', { tx: setOracleReceipt });
        }
    } else {
        deployer.logger.addLog('LINK_ORACLE_HOUSE_PRICES_MISMATCH', { 
            message: `House prices owner mismatch. Expected ${addressDeployer}, got ${housePricesOwner}` 
        });
    }

    // Lending Pool Prime Rate Oracle Setup
    const lendingPool = deployment.contracts['RAACLendingPool'];
    const lendingPoolAddress = lendingPool?.address || lendingPool;
    const lendingPoolArtifact = await deployer.readArtifactFile("LendingPool");
    const lendingPoolContract = new ethers.Contract(lendingPoolAddress, lendingPoolArtifact.abi, wallet);

    // Check if we are owner of lending pool contract
    const lendingPoolOwner = await lendingPoolContract.owner();
    if(lendingPoolOwner === addressDeployer) {
        const RAACPrimeRateOracleAddress = deployment.dependencies?.RAACPrimeRateOracle?.address;
        const currentPrimeRateOracle = await lendingPoolContract.primeRateOracle();
        if(RAACPrimeRateOracleAddress && currentPrimeRateOracle !== RAACPrimeRateOracleAddress) {
            deployer.logger.addLog('LINK_ORACLE_PRIME_RATE_MISMATCH', { 
                message: `Prime rate oracle mismatch. Expected ${RAACPrimeRateOracleAddress}, got ${currentPrimeRateOracle}` 
            });
            
            const setPrimeRateOracleTx = await lendingPoolContract.setPrimeRateOracle(RAACPrimeRateOracleAddress);
            const setPrimeRateOracleReceipt = await setPrimeRateOracleTx.wait();
            deployer.logger.addLog('LINK_ORACLE_SET_PRIME_RATE', { tx: setPrimeRateOracleReceipt });
        } 
    } else {
        deployer.logger.addLog('LINK_ORACLE_PRIME_RATE_MISMATCH', { 
            message: `Lending pool owner mismatch. Expected ${addressDeployer}, got ${lendingPoolOwner}` 
        });
    }

    processResult.timeEnd = +new Date();
    processResult.timeTaken = processResult.timeEnd - processResult.timeStart;
    processResult.logger = deployer.logger.export();
    deployment.processes.linkOracle = processResult;

    return deployment;
}