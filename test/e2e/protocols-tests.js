import { expect } from 'chai';
import hre from "hardhat";
const { ethers } = hre;
import RPCLibrary from '../../library/RPCLibrary/RPCLibrary.js';
import { logBeautified, deployContracts, approveToken, getContractSnapshot, logContractSnapshot, setHousePrice } from './testHelpers.js';

describe('Protocol E2E Tests', function () {
  let rpcLibrary;
  let owner, user1, user2;
  let chainId;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    chainId = 31337;
    // chainId = (await ethers.provider.getNetwork()).chainId;
    rpcLibrary = new RPCLibrary();

    const config = await deployContracts(owner);
    rpcLibrary.setChainConfig(chainId, config);

    // Set house price for token 1021000
    const tokenId = '1021000';
    const price = '10';
    // FIXME: @deprecated - This function is not used in the current version of the codebase
    await rpcLibrary.contracts.housePrices.setHousePrice(chainId, tokenId, price, owner);
  });

  describe('LendingPool and StabilityPool Interaction', function () {
    it('should allow deposit, borrow, repay, and withdraw operations', async function () {
      try {
        // Mint crvUSD to users
        await rpcLibrary.wallet.assets.mintAsset(chainId, 'crvusd', '1000', user1.address, owner);
        await rpcLibrary.wallet.assets.mintAsset(chainId, 'crvusd', '1000', user2.address, owner);

        // User1 deposits crvUSD to LendingPool
        await approveToken(rpcLibrary, chainId, 'crvusd', 'lendingpool', '500', user1);
        await rpcLibrary.pools.depositToLendingPool(chainId, '500', user1);

        // User2 mints RAAC NFT
        await approveToken(rpcLibrary, chainId, 'crvusd', 'raacnft', '100', user2);
        await rpcLibrary.nfts.mint(chainId, '1021000', '1', user2);

        // User2 stakes NFT and borrows from LendingPool
        await rpcLibrary.pools.lendingPool.depositNFTToLendingPool(chainId, '1021000', user2);
        await rpcLibrary.pools.lendingPool.borrowFromLendingPool(chainId, '1021000', '5', user2);

        // User1 deposits rcrvUSD to StabilityPool
        await approveToken(rpcLibrary, chainId, 'rcrvusd', 'stabilitypool', '250', user1);
        await rpcLibrary.pools.depositToStabilityPool(chainId, '250', user1);

        await logContractSnapshot(rpcLibrary, chainId, [user1, user2]);

        // User2 repays loan
        await approveToken(rpcLibrary, chainId, 'crvusd', 'lendingpool', '5', user2);
        await rpcLibrary.pools.lendingPool.repayToLendingPool(chainId, '1021000', '5', user2);

        // User1 withdraws from StabilityPool
        await rpcLibrary.pools.withdrawFromStabilityPool(chainId, '100', user1);

        // User1 withdraws from LendingPool
        await approveToken(rpcLibrary, chainId, 'rcrvusd', 'lendingpool', '200', user1);
        await rpcLibrary.pools.withdrawFromLendingPool(chainId, '200', user1);

        await logContractSnapshot(rpcLibrary, chainId, [user1, user2]);

        logBeautified('Contract interaction test completed successfully');
      } catch (error) {
        logBeautified('Error in contract interaction test', error.message);
        throw error;
      }
    });
  });
});