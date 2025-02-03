
## Token Economics

### RAAC Token
- **Distribution**: Minted by RAACMinter at a fixed rate of 1 RAAC per block (to be modified for dynamic minting - See Governance).
- **Swap Tax**: 0.5% tax on transfers, collected by a designated fee collector
- **Utility**:
  - Governance participation (when locked as veRAAC)
  - veRAAC Bonding
  - Liquidity provision incentives

### veRAAC Token
- **Acquisition**: Users lock RAAC tokens to receive veRAAC
- **Utility**:
  - Voting rights in governance
  - Gauge weight control

## Token Allocation

- 58% community-oriented (including public sale and emissions)
- 42% team, advisors, and investors
  - 22% Team
  - 10% Advisors
  - 10% Sale (VC/DeFi).

## Revenue Distribution
- 80% of platform fees directed to token holders
- 20% to treasury

## Treasury and Real Estate Backing
- Use real estate yield to acquire more treasury assets initially
- Implement RWA gauge when emissions can no longer support real estate alone


### Swap Tax Mechanism
- **Purpose**: To generate revenue for the protocol and discourage short-term trading.
- **Implementation**:
  - A 2% tax is applied on all RAAC token transfers.
  - The tax is calculated and deducted from the transfer amount.
  - The deducted amount is sent to a designated fee collector address.
- **Usage of collected taxes**: 
  - Collected taxes are sent to a fee collector address, which can be used for:
    1. Protocol development and maintenance
    2. Providing liquidity to the StabilityPool
    3. Funding governance initiatives
    4. Buyback and burn of RAAC tokens to reduce supply

### RAAC ZENO Bond
- **Purpose**: To provide additional stability and liquidity to the ecosystem
- **Implementation**:
  - Users can purchase bonds using crvUSD or other approved assets
  - Bonds are redeemable for RAAC tokens after a specified vesting period
  - Bond prices and redemption rates are dynamically adjusted based on market conditions
- **Key Features**:
  - Helps maintain peg of DEcrvUSD to crvUSD through arbitrage mechanisms
  - Provides an additional revenue stream for the protocol
  - Allows for flexible monetary policy adjustments
