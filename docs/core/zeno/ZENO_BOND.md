<h1>ZENO: Zero-Coupon External-Market Note Operations System</h1>

<h3>Overview</h3>
<p>ZENO is an SERC-20 utility token intricately linked to USDC that does not pay periodic interest, specifically designed for the acquisition of RAAC bonds. It functions similarly to a zero-coupon bond, fully backed by USDC. ZENO tokens come with a predetermined maturity date, upon which holders can redeem their tokens for the equivalent amount of USDC.</p>

<h3>Acquisition and Auction Process:</h3>
<p>ZENO tokens are primarily acquired through RAAC Auctions. During these auctions, users deposit their USDC in exchange for a certain amount of ZENO bonds until the auction concludes. Detailed information about the auction process can be found [here].</p>

<h3>Purpose and Application:</h3>
<p>The primary objective of ZENO is to generate assets that can be utilized in real-world asset (RWA) yields and investments and contribute to IRL projects. RAAC aims to leverage the Zero-Coupon External-Market Note Operations System to issue ERC-20 zero-coupon bonds, facilitating capital lending to real estate developers or financing RAAC’s own development projects.</p>

<h3>System Design and Transparency:</h3>
<p>The ZENO System is inspired by the no-KYC utility token design of Frax Bonds. At the time of issuance, USDC is transferred to a Circle API account, and ZENO bonds are minted. To ensure there are sufficient funds for redemption before the maturity date, returns accumulated through the Circle API are allocated to the bond contract. Transparency is maintained via a Circle API account balance Oracle, ensuring that funds are available for redemption.</p>

<h3>Auction Mechanism:</h3>
<p>ZENO tokens can be acquired through a series of auctions using a continuous gradual Dutch auction (GDA) system. The RAAC team sets quantity and price limits for each auction. The auction price starts at an initial value and decreases at a steady rate until it reaches a floor limit. The price will not drop below this reserve price.
The acquisition process follows a first-come-first-serve mechanism, where early participants pay a higher price compared to those who join later. The auction concludes in one of two ways: either the total supply of ZENO is fully purchased, or the auction reaches its predetermined end time.</p>

<h3>Redemption:</h3>
<p>As the maturity date approaches, the protocol might use off-chain mechanisms (e.g., notifications) to inform users about the upcoming redemption. The protocol activates the redemption smart contract, which handles the conversion of ZENOs back to USDC.</p>

<h3>Summary:</h3>
<p>ZENO is a trustless, zero-coupon bond token backed by USDC, with a clear maturity date for redemption. It is acquired through RAAC Auctions using a gradual Dutch auction system, ensuring transparent and equitable price discovery. Designed to facilitate real estate development financing, the ZENO system prioritizes transparency and security through the use of Circle API and Oracle systems, aiming to emulate the efficient design of Frax Bonds..</p>

<br/>
<br/>
<br/>

![ZENO-diagram](/zeno-diagram.png)


<br/>
<br/>
<br/>

<h2>$ZENO</h2>

ZENO tokens are integral to the auction process, with minting and burning tied directly to user interactions and the auction lifecycle. Each ZENO bond is associated to a particular Auction.

#### ERC20 Standard Methods

As a standard ERC20 token, ZENO implements the usual methods:

- `balanceOf(address account)`: Returns the balance of a specific account.
- `transfer(address recipient, uint256 amount)`: Transfers a specified amount of tokens to a recipient.
- `transferFrom(address sender, address recipient, uint256 amount)`: Transfers tokens on behalf of another account.
- `approve(address spender, uint256 amount)`: Allows another account to spend a specified amount of tokens.
- `allowance(address owner, address spender)`: Returns the remaining number of tokens that `spender` is allowed to spend on behalf of `owner`.

#### Custom RAAC Methods

These methods are custom implementations for the specific needs of the auction process involving ZENO tokens:

##### Mint

- **Function Signature:** `function mint(uint256 amount) public ownerOnly`
- **Description:** This method is used to mint new ZENO tokens. It can only be called by the owner, typically the Auction contract, when a bidder transfers USDC in exchange for ZENO tokens. This ensures that ZENO tokens are created as a direct result of a user's participation in an auction.
- **Usage Scenario:** When a user places a bid in USDC, the Auction contract calls this method to mint an equivalent amount of ZENO tokens for the user.

##### Redeem all tokens

- **Function Signature:** `function redeemAll()`
- **Description:** This method is used to redeem ZENO tokens for USDC after the bond's maturity date. The ZENO tokens are burnt during this process, effectively removing them from circulation. This function ensures that users can get their USDC back once the bond matures.
- **Usage Scenario:** After the bond matures, users call this method to exchange their ZENO tokens back for USDC. The method would burn the ZENO tokens and transfer the corresponding amount of USDC to the user.

##### Redeem specific amount

- **Function Signature:** `function redeem(uint256 amount)`
- **Description:** This method is used to redeem a specific amount of ZENO tokens for USDC after the bond's maturity date. The ZENO tokens are burnt during this process, effectively removing them from circulation. This function ensures that users can get their USDC back once the bond matures.
- **Usage Scenario:** After the bond matures, users call this method to exchange their ZENO tokens back for USDC. The method would burn the ZENO tokens and transfer the corresponding amount of USDC to the user.

### Auction Process Integration

1. **Bidding Phase:**
   - Users bid in USDC.
   - The Auction contract calls the `mint` method to create ZENO tokens for the bidders.
2. **Post-Maturity Phase:**
   - Users call the `redeem` method to convert their ZENO tokens back into USDC.
   - The ZENO tokens are burnt in this process, ensuring they cannot be used again.

### Ownership and Access Control

The `mint` function is restricted to the contract owner (presumably the Auction contract) via the `ownerOnly` modifier. This ensures that only authorized entities can mint new tokens, preventing unauthorized creation of ZENO tokens.

### Summary

ZENO tokens are dynamically minted and burnt as part of the auction lifecycle. The `mint` method is used during the bidding phase to issue new tokens to users who participate by bidding USDC. Post-maturity, the `redeem` method allows users to get their USDC back by burning the ZENO tokens, thus maintaining the integrity of the token supply.

This design ensures a robust and secure process for handling bids and redemptions within the auction framework, leveraging both standard ERC20 functionality and custom methods tailored to the auction's needs.

<br/>
<br/>
<br/>

<h2>Zeno Factory</h2>

The Zeno Factory is responsible for deploying a new ZENO bond for each auction that is created. The ownership of the bond is then transferred to the auction, enabling it to mint the bonds following user purchases.

#### Factory Address

- **Address:** 0x…

### Methods

#### Deploy a Contract

- **Function Signature:** `function createZENOContract(address _usdcAddress, uint256 _maturityDate)`
- **Description:** This function is responsible for creating a new ZENO bond contract. The primary token used for purchasing these bonds is USDC.
- **Usage Scenario:** When a new auction is initiated, this method is called to deploy a new ZENO bond contract with the specified USDC address and maturity date.

#### Get List of All ZENOs

- **Function Signature:** `function getZENOs()`
- **Description:** This function returns a list of all ZENO bond contracts that have been created by the factory.
- **Usage Scenario:** To retrieve a comprehensive list of all ZENO bonds, which can be useful for tracking and management purposes.

#### Get a ZENO Contract

- **Function Signature:** `function getZeno(uint256 index)`
- **Description:** This function returns the ZENO bond contract at a specified index.
- **Usage Scenario:** To access the details of a specific ZENO bond contract using its index in the list of created bonds.

#### Get the Count of All ZENOs

- **Function Signature:** `function getZENOCount()`
- **Description:** This function returns the total number of ZENO bond contracts created by the factory.
- **Usage Scenario:** To obtain the current count of ZENO bonds, which is useful for audit and verification processes.

#### Transfer the Ownership of the ZENO Contract

- **Function Signature:** `function transferZenoOwnership(uint256 index, address newOwner)`
- **Description:** This function transfers the ownership of a specified ZENO bond contract from the Zeno Factory to a new owner, typically the auction. This is necessary because the ZENO bond contract is created before the auction and needs to be transferred to the auction factory when creating a new auction.
- **Usage Scenario:** During the auction creation process, this method ensures the ZENO bond contract ownership is correctly assigned to the auction.

### Integration with Auction Process

1. **Auction Creation Phase:**
   - The Zeno Factory deploys a new ZENO bond contract using the `createZENOContract` method.
   - The newly created bond contract's ownership is then transferred to the auction using the `transferZenoOwnership` method.
2. **Tracking and Management:**
   - Retrieve the list of all ZENO bonds with `getZENOs` to manage and audit created bonds.
   - Use `getZeno` to access specific bond contracts and `getZENOCount` to track the total number of bonds.

### Summary

The Zeno Factory plays a crucial role in the lifecycle of ZENO bonds, from their creation to transferring ownership to the respective auctions. It leverages custom methods to deploy new bonds, track existing ones, and manage ownership transfers, ensuring a seamless integration with the auction process. This approach ensures efficient and organized handling of ZENO bonds within the auction framework.

<br/>
<br/>
<br/>

<h2>Auction Factory</h2>

The Auction Factory contract is responsible for instantiating new auctions with various parameters and storing information about the current auctions. It is an Ownable contract, ensuring that only the owner has certain privileges, such as creating auctions.

#### Contract Address

- **Address:** 0x

#### Key Methods

##### Create Auction

- **Function Signature:** `function createAuction(address _rcbAddress, address _usdcAddress, address _businessAddress, uint256 _auctionStartTime, uint256 _auctionEndTime, uint256 _startingPrice, uint256 _reservePrice, uint256 _totalRCBAllocated)`
- **Description:** This method is used to create a new auction. Each auction is instantiated with its own parameters including the addresses of the RCB and USDC tokens, the business address, start and end times, starting and reserve prices, and the total amount of RCB tokens allocated.
- **Usage Scenario:** When a new auction is required, this method is called to create an auction with the specified parameters, making it available for participants to place bids.

##### Get Auctions

- **Function Signature:** `function getAuctions()`
- **Description:** Returns the details about all current auctions, both active and inactive.
- **Usage Scenario:** This method is used to fetch a list of all auctions that have been created, providing an overview of both ongoing and past auctions.

##### Get Auction

- **Function Signature:** `function getAuction(uint256 index)`
- **Description:** Returns the details of a specific auction based on the provided index.
- **Usage Scenario:** This method is useful when details of a particular auction are needed, such as its parameters and current status.

##### Get Auction Count

- **Function Signature:** `function getAuctionCount()`
- **Description:** Returns the total number of auctions created to date.
- **Usage Scenario:** This method is used to determine how many auctions have been created so far, providing a simple count of all auctions.

### Auction Lifecycle

1. **Creation Phase:**
   - The owner calls `createAuction` to instantiate a new auction with specific parameters.
2. **Bidding Phase:**
   - Participants place bids in USDC within the auction's start and end times.
3. **Completion Phase:**
   - The auction concludes based on the defined end time or if other termination conditions are met.

### Ownership and Access Control

The `createAuction` and `updateBusinessAddress` methods are restricted to the contract owner, ensuring that only authorized entities can create new auctions or update critical parameters. This ownership model helps maintain the integrity and security of the auction process.

### Summary

The Auction Factory contract facilitates the creation and management of auctions by providing a structured method to instantiate new auctions, retrieve auction details, and update critical parameters. Each auction is a distinct instance with its own set of parameters, ensuring flexibility and customization for each auction event. This design supports a robust auction process, leveraging the flexibility of smart contracts to handle various auction scenarios securely and efficiently.

<br/>
<br/>
<br/>

<h2>Auction</h2>

All the auctions are owned by the Auction Factory. Each auction has a corresponding buy token (ZENO) which can be redeemed after the maturity date. The auction contract manages the bidding process and ensures the correct minting of ZENO tokens in exchange for USDC during the auction period.

#### Key Methods

##### Get Price

- **Function Signature:** `function getPrice()`
- **Description:** Returns the current price of a bond in the auction.
- **Usage Scenario:** Participants can call this method to determine the current price of a bond before placing a bid. This helps them make informed decisions based on the current market rate within the auction.

##### Buy

- **Function Signature:** `function buy(uint256 amount)`
- **Description:** Allows users to bid on the auction by specifying an amount of USDC. An equivalent amount of ZENO tokens is minted and sent to the user in exchange for the provided USDC.
- **Usage Scenario:** When a user wants to participate in the auction, they call this method with the desired amount of USDC they wish to bid. The auction contract then mints the corresponding amount of ZENO tokens and transfers them to the user's address.


##### Check Auction Ended

- **Function Signature:** `function checkAuctionEnded()`
- **Description:** Checks whether the auction has ended.
- **Usage Scenario:** Participants or the auction system itself can call this method to determine if the auction period has concluded. This is important for managing the transition from the bidding phase to the post-auction processes, such as redeeming ZENO tokens.

### Auction Lifecycle

1. **Bidding Phase:**
   - Participants place bids in USDC using the `buy` method.
   - The current price of bonds can be checked using the `getPrice` method.
2. **Auction End Check:**
   - The `checkAuctionEnded` method is called to verify if the auction has concluded.
3. **Post-Auction Phase:**
   - After the auction ends, participants can redeem ZENO tokens for USDC once the maturity date is reached.

### Ownership and Access Control

The `updateBusinessAddress` method is restricted to the contract owner, ensuring that only authorized entities can change critical parameters such as the business address. This access control mechanism helps maintain the integrity and security of the auction process.

### Summary

The Auction contract, managed by the Auction Factory, facilitates the auction process by allowing users to bid with USDC and receive ZENO tokens in return. Key methods such as `getPrice`, `buy`, and `checkAuctionEnded` support the auction's operation from bidding to conclusion. The `updateBusinessAddress` method ensures that the redirection of USDC tokens can be managed securely by the owner. This design enables a seamless and secure auction experience, leveraging smart contract functionalities to handle bids, price determination, and fund management efficiently.

## Implementation Details

- **Issuance Process**: COMPLETED
- **Auction Mechanism**: COMPLETED
- **Redemption Process**: COMPLETED
- **Integration with Other Components**: NOT STARTED

## Risk Management

- **Collateralization**:
- **Liquidation Procedures**:
- **Reserve Requirements**:

## Governance

- **Parameter Adjustments**:
- **Emission Control**:
