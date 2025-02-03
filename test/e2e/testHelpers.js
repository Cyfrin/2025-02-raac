import hre from 'hardhat';
const { ethers } = hre;
import chalk from 'chalk';
import Deployer from '../../scripts/primitives/Deployer.js';

export function logBeautified(message, data = null) {
  console.log(chalk.cyan('----------------------------------------'));
  console.log(chalk.yellow(message));
  if (data) {
    if (typeof data === 'object') {
      console.log(chalk.green(JSON.stringify(data, null, 2)));
    } else {
      console.log(chalk.green(data));
    }
  }
  console.log(chalk.cyan('----------------------------------------'));
}

export async function deployContracts(owner) {
  const deployer = new Deployer(hre, owner);
  const contracts = {};

  const interestParams = {
    optimal: ethers.parseEther("0.85"),
    base: 0,
    low: 951293759,
    high: 38051750380,
  };

  // Deploy contracts in the same order as deploy_local.js
  contracts.raachouseprices = await deployer.deploy('RAACHousePrices', [owner.address]);
  contracts.crvusd = await deployer.deploy('crvUSDToken', [owner.address]);
  await contracts.crvusd.setMinter(owner.address);

  contracts.raactoken = await deployer.deploy('RAACToken', [owner.address]);
  contracts.raacnft = await deployer.deploy('RAACNFT', [contracts.crvusd.target, contracts.raachouseprices.target, owner.address]);
  contracts.rcrvusd = await deployer.deploy('RToken', ["RToken", "RToken", owner.address, contracts.crvusd.target]);
  contracts.debttoken = await deployer.deploy('DebtToken', ["DebtToken", "DT", owner.address]);
  contracts.decrvusd = await deployer.deploy('DEToken', ["DEToken", "DEToken", owner.address, contracts.rcrvusd.target]);
 
  const initialPrimeRate = ethers.parseUnits("0.1", 27);
  contracts.lendingpool = await deployer.deploy('LendingPool', [
    contracts.crvusd.target,
    contracts.rcrvusd.target,
    contracts.debttoken.target,
    contracts.raacnft.target,
    contracts.raachouseprices.target,
    initialPrimeRate
  ]);
  contracts.stabilitypool = await deployer.deploy('StabilityPool', [owner.address]);

  contracts.raacminter = await deployer.deploy('RAACMinter', [contracts.raactoken.target, contracts.stabilitypool.target, contracts.lendingpool.target, owner.address])
  await contracts.rcrvusd.setReservePool(contracts.lendingpool.target);
  await contracts.debttoken.setReservePool(contracts.lendingpool.target);

  await contracts.rcrvusd.transferOwnership(contracts.lendingpool.target);
  await contracts.debttoken.transferOwnership(contracts.lendingpool.target);

  await contracts.decrvusd.setStabilityPool(contracts.stabilitypool.target);
  await contracts.decrvusd.transferOwnership(contracts.stabilitypool.target);

  await contracts.lendingpool.setStabilityPool(contracts.stabilitypool.target);
  await contracts.stabilitypool.initialize(
    contracts.rcrvusd.address,
    contracts.decrvusd.address,
    contracts.raactoken.address,
    contracts.raacminter.address,
    contracts.crvusd.address,
    contracts.lendingpool.address
  );
  await contracts.stabilitypool.setRAACMinter(contracts.raacminter.address);
  await contracts.raacminter.setStabilityPool(contracts.stabilitypool.address);
  await contracts.raactoken.setMinter(contracts.raacminter.address);

  // contracts.raacforclosurelane = await deployer.deploy('RAACForclosureLane', [
  //   contracts.raacnft.target,
  //   contracts.crvusd.target,
  //   contracts.stabilitypool.target,
  //   contracts.raachouseprices.target,
  //   owner.address
  // ]);
  // contracts.lendingpool = await deployer.deploy('RAACLendingPool', [
  //   interestParams,
  //   contracts.crvusd.target,
  //   contracts.decrvusd.target,
  //   contracts.rcrvusd.target,
  //   contracts.raacforclosurelane.target,
  //   contracts.raachouseprices.target,
  //   contracts.raacnft.target,
  //   owner.address
  // ]);

  // Add missing contracts
  // contracts.raacminter = await deployer.deploy('RAACMinter', [contracts.raactoken.target, contracts.stabilitypool.target, contracts.lendingpool.target, owner.address]);
  // contracts.veraac = await deployer.deploy('veRAACToken', [contracts.raactoken.target, owner.address]);
  // contracts.marketcreator = await deployer.deploy('MarketCreator', [owner.address, contracts.raactoken.target, contracts.decrvusd.target]);
  // contracts.nftliquidator = await deployer.deploy('NFTLiquidator', [contracts.crvusd.target, contracts.raactoken.target, owner.address]);
  // contracts.veraacdistributor = await deployer.deploy('veRAACDistributor', [contracts.raactoken.target, contracts.veraac.target, owner.address]);
  // contracts.liquiditypool = await deployer.deploy('LiquidityPool', [contracts.raactoken.target, contracts.stabilitypool.target, contracts.veraacdistributor.target]);

  // Set up contract interactions
  // await contracts.rcrvusd.setMinter(contracts.lendingpool.target);
  // await contracts.rcrvusd.setBurner(contracts.lendingpool.target);
  // await contracts.decrvusd.setMinter(contracts.stabilitypool.target);
  // await contracts.raactoken.setMinter(contracts.raacminter.target);
  // await contracts.raactoken.setFeeCollector(contracts.stabilitypool.target);
  // await contracts.stabilitypool.initialize(
  //   contracts.rcrvusd.target,
  //   contracts.decrvusd.target,
  //   contracts.raactoken.target,
  //   contracts.raacminter.target
  // );
  // await contracts.stabilitypool.setRAACMinter(contracts.raacminter.target);
  // await contracts.raacminter.setStabilityPool(contracts.stabilitypool.target);
  // await contracts.veraac.setMinter(contracts.liquiditypool.target);
  // await contracts.stabilitypool.setLiquidityPool(contracts.liquiditypool.target);
  // await contracts.veraac.setMinter(contracts.veraacdistributor.target);
  // await contracts.veraacdistributor.setLiquidityPool(contracts.liquiditypool.target);

  const formattedContracts = {};
  for (const [key, value] of Object.entries(contracts)) {
    formattedContracts[key] = value.target;
  }

  // Update config object to include all deployed contracts
  const config =  {
    chainId: 31337,
    contracts: {
      raachouseprices: { id: 'raachouseprices', name: 'RAAC House Prices', contract: contracts.raachouseprices.address },
      raacminter: { id: 'raacminter', name: 'RAAC Minter', contract: contracts.raacminter.address },
      // raacvault: { id: 'raacvault', name: 'RAAC Vault', contract: await contracts.lendingpool.raacVault() },
      // nftliquidator: { id: 'nftliquidator', name: 'NFT Liquidator', contract: contracts.nftliquidator.address },
      // veraacdistributor: { id: 'veraacdistributor', name: 'VERAAC Distributor', contract: contracts.veraacdistributor.address },
      // raacforclosurelane: { id: 'raacforclosurelane', name: 'RAAC Forclosure Lane', contract: contracts.raacforclosurelane.address },
      // marketcreator: { id: 'marketcreator', name: 'Market Creator', contract: contracts.marketcreator.address },
    },
    pools: {
      stabilitypool: { id: 'stabilitypool', name: 'Stability Pool', contract: contracts.stabilitypool.address },
      lendingpool: { id: 'lendingpool', name: 'Lending Pool', contract: contracts.lendingpool.address },
      // liquiditypool: { id: 'liquiditypool', name: 'Liquidity Pool', contract: contracts.liquiditypool.address },
    },
    nfts: {
      raacnft: { id: 'raacnft', name: 'RAAC NFT', contract: contracts.raacnft.address }
    },
    assets: {
      crvusd: { id: 'crvusd', name: 'CRVUSD', decimals: 18, contract: contracts.crvusd.address },
      rcrvusd: { id: 'rcrvusd', name: 'rCRVUSD', decimals: 18, contract: contracts.rcrvusd.address },
      rtoken: { id: 'rtoken', name: 'RToken', decimals: 18, contract: contracts.rcrvusd.address },
      decrvusd: { id: 'decrvusd', name: 'DECRVUSD', decimals: 18, contract: contracts.decrvusd.address },
      raactoken: { id: 'raactoken', name: 'RAAC', decimals: 18, contract: contracts.raactoken.address },
      // veraac: { id: 'veraac', name: 'veRAAC', decimals: 18, contract: contracts.veraac.address },
    }
  };
  console.log(config);
  return config;
}

export async function approveToken(rpcLibrary, chainId, tokenId, spenderId, amount, signer) {
  const spenderAddress = await rpcLibrary.contracts.getContractAddress(chainId, spenderId);
  await rpcLibrary.wallet.assets.approveAsset(chainId, tokenId, spenderAddress, amount, signer);
}

export async function getContractSnapshot(rpcLibrary, chainId, users) {
  const snapshot = {};

  const promises = users.map(async (user) => {
    const userSnapshot = {
      address: user.address,
      assets: await rpcLibrary.wallet.assets.getAssets(chainId, user.address, user),
      lendingPoolInfo: await rpcLibrary.pools.lendingPool.getLendingPoolInfo(chainId, user.address, user),
      stabilityPoolInfo: await rpcLibrary.pools.stabilityPool.getStabilityPoolInfo(chainId, user.address, user),
    };
    snapshot[user.address] = userSnapshot;
  });

  await Promise.all(promises);

  return snapshot;
}

export function logContractSnapshot(rpcLibrary, chainId, users) {
  return getContractSnapshot(rpcLibrary, chainId, users).then((snapshot) => {
    logBeautified('Contract Snapshot', snapshot);
  });
}
export async function setHousePrice(rpcLibrary, chainId, tokenId, price, owner) {
    try {
      const priceInWei = ethers.parseEther(price.toString());
      // FIXME: we are using house price oracle to update the price. Only the oracle can change the price. See the oracle test.
      await rpcLibrary.contracts.housePrices.setHousePrice(chainId, tokenId, priceInWei, owner);
      console.log(`House price set for token ${tokenId}: ${price} ETH`);
    } catch (error) {
      console.error(`Error setting house price: ${error.message}`);
      throw error;
    }
  }