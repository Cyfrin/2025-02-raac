import crvUSDTokenArtifact from '../artifacts/Tokens/crvUSDToken.sol/crvUSDToken.json' assert { type: "json" };
import veRAACTokenArtifact from '../artifacts/Tokens/veRAACToken.sol/veRAACToken.json' assert { type: "json" };
import rcrvUSDTokenArtifact from '../artifacts/Tokens/rCRVUSDToken.sol/rCRVUSDToken.json' assert { type: "json" };
import RAACLendingPoolArtifact from '../artifacts/LendingPool/RAACLendingPool.sol/RAACLendingPool.json' assert { type: "json" };
import RAACStabilityPoolArtifact from '../artifacts/StabilityPool/StabilityPool.sol/StabilityPool.json' assert { type: "json" };
import LiquidityPoolArtifact from '../artifacts/LiquidityPool/LiquidityPool.sol/LiquidityPool.json' assert { type: "json" };
import RAACNFTArtifact from '../artifacts/Tokens/RAACNFT.sol/RAACNFT.json' assert { type: "json" };
import DECRVUSDArtifact from '../artifacts/Tokens/DEcrvUSDToken.sol/DEcrvUSDToken.json' assert { type: "json" };
import RAACTokenArtifact from '../artifacts/Tokens/RAACToken.sol/RAACToken.json' assert { type: "json" };
import RAACMinterArtifact from '../artifacts/RAACMinter/RAACMinter.sol/RAACMinter.json' assert { type: "json" };
import RAACHousePricesArtifact from '../artifacts/primitives/RAACHousePrices.sol/RAACHousePrices.json' assert { type: "json" };
import RAACVaultArtifact from '../artifacts/primitives/RAACVault.sol/RAACVault.json' assert { type: "json" };
import AuctionFactoryArtifact from '../artifacts/zeno/AuctionFactory.sol/AuctionFactory.json' assert { type: "json" };
import AuctionArtifact from '../artifacts/zeno/Auction.sol/Auction.json' assert { type: "json" };
import ZenoFactoryArtifact from '../artifacts/zeno/ZenoFactory.sol/ZenoFactory.json' assert { type: "json" };
import ZenoArtifact from '../artifacts/zeno/Zeno.sol/Zeno.json' assert { type: "json" };
const CRVUSD_ABI = crvUSDTokenArtifact.abi;


import RTokenArtifact from '../artifacts/Tokens/RToken.sol/RToken.json' assert { type: "json" };
const RTOKEN_ABI = RTokenArtifact.abi;
const VERAAC_ABI = veRAACTokenArtifact.abi;
const RCRVUSD_ABI = rcrvUSDTokenArtifact.abi;
const DECRVUSD_ABI = DECRVUSDArtifact.abi;

const RAACLENDINGPOOL_ABI = RAACLendingPoolArtifact.abi;
const RAACSTABILITYPOOL_ABI = RAACStabilityPoolArtifact.abi;
const LIQUIDITYPOOL_ABI = LiquidityPoolArtifact.abi;
const RAACMINTER_ABI = RAACMinterArtifact.abi;
const RAACNFT_ABI = RAACNFTArtifact.abi;
const RAACToken_ABI = RAACTokenArtifact.abi;
const RAACHOUSEPRICES_ABI = RAACHousePricesArtifact.abi;
const RAACVAULT_ABI = RAACVaultArtifact.abi;
const ABIS = {
    // Tokens
    'crvusd': CRVUSD_ABI,

    // RAAC
    'raacnft': RAACNFT_ABI,
    'raactoken': RAACToken_ABI,
    'veraac': VERAAC_ABI,
    // Pools tokens
    'rcrvusd': RCRVUSD_ABI,
    "rtoken": RTOKEN_ABI,
    'decrvusd': DECRVUSD_ABI,
    // Pools
    'lendingpool': RAACLENDINGPOOL_ABI,
    'stabilitypool': RAACSTABILITYPOOL_ABI,
    'liquiditypool': LIQUIDITYPOOL_ABI,
    'raacminter': RAACMINTER_ABI,
    'raacvault': RAACVAULT_ABI,
    // contracts
    // contracts#raacHousePrices
    'raachouseprices': RAACHOUSEPRICES_ABI,
    // contracts#auction
    'auction': AuctionArtifact.abi,
    'auctionfactory': AuctionFactoryArtifact.abi,
    'zeno': ZenoArtifact.abi,
    'zenofactory': ZenoFactoryArtifact.abi,
};

const getABI = (name) => {
    return ABIS[name];
};

export { getABI, ABIS };