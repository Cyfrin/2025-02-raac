import { ethers } from "ethers";
export default function prepareConstructorArgs(deployerAddress) {
    return {
        crvUSDToken: [deployerAddress],
        RAACHousePrices: [
            // initial owner
            deployerAddress,
        ],
        RAACHousePriceOracle: [
            "{{CHAINLINK_ROUTER}}",
            // bytes32 _donId,
            "{{DON_ID}}",
            // address housePricesAddress
            "{{RAACHousePrices}}",
        ],
        RAACPrimeRateOracle: [
            "{{CHAINLINK_ROUTER}}",
            // bytes32 _donId,
            "{{DON_ID}}",
            // address lendingPoolAddress
            "{{RAACLendingPool}}",
        ],
        RAACToken: [
            deployerAddress,
            100n, // initial swap tax rate (1%)
            50n, // initial burn tax rate (0.5%)
        ],
        RAACReleaseOrchestrator: [
            // Holder for RAACToken
            "{{RAACToken}}",
        ],
        RAACMinter: [
            // Holder for RAACToken
            "{{RAACToken}}",
            // holder for stabilityPool
            "{{StabilityPool}}",
            // holder for lending pool
            "{{RAACLendingPool}}",
            // holder for initial owner
            deployerAddress,
        ],
        RAACNFT: [
            // holder for token
            "{{RAACToken}}",
            // holder for house prices
            "{{RAACHousePrices}}",
            // initial owner
            deployerAddress,
        ],
        RToken: [
            // name
            "RAAC Reserve Token",
            // symbol
            "rRAAC",
            // initial owner
            deployerAddress,
            // asset address (crvusd)
            "{{crvUSDToken}}",
        ],
        DebtToken: [
            // name
            "RAAC Debt Token",
            // symbol
            "dRAAC",
            // initial owner
            deployerAddress,
        ],
        DEToken: [
            // name
            "RAAC Debitum Emptor Token",
            // symbol
            "deRAAC",
            // initial owner
            deployerAddress,
            // rToken address
            "{{RToken}}",
        ],
        // TO be used in link instead of StabilityPool
        // StabilityPool: [
        //     // rToken
        //     '{{RToken}}',
        //     // deToken
        //     '{{DEToken}}',
        //     // raacToken
        //     '{{RAACToken}}',
        //     // raacMinter
        //     '{{RAACMinter|ZERO_ADDRESS}}',
        //     // crvUSDToken
        //     '{{crvUSDToken}}',
        //     // lendingPool
        //     '{{RAACLendingPool}}',
        // ],
        StabilityPool: [
            // initial owner
            deployerAddress,
        ],
        LendingPool: [
            // holder for reserve asset token (crvusd)
            "{{crvUSDToken}}",
            // holder for RToken
            "{{RToken}}",
            // Holder for DebtToken
            "{{DebtToken}}",
            // holder for RAACNFT
            "{{RAACNFT}}",
            // holder for PriceOracle
            "{{RAACHousePrices}}",
            // initial prime rate (10%)
            ethers.parseUnits("0.1", 27),
        ],
        RepairFund: [
            // initial owner
            deployerAddress,
        ],
        Treasury: [
            // initial owner
            deployerAddress,
        ],
        veRAACToken: ["{{RAACToken}}"],
        FeeCollector: [
            // RAACToken
            "{{RAACToken}}",
            // veRAACToken
            "{{veRAACToken}}",
            // Treasury
            "{{Treasury}}",
            // repair fund
            "{{RepairFund}}",
            // initial owner
            deployerAddress,
        ],
    }
}