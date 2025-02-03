// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../../interfaces/core/oracles/IRAACHousePrices.sol";
import "../../interfaces/core/tokens/IRAACNFT.sol";

contract RAACNFT is ERC721, ERC721Enumerable, Ownable, IRAACNFT {
    using SafeERC20 for IERC20;

    IERC20 public token;
    IRAACHousePrices public raac_hp;

    uint256 public currentBatchSize = 3;

    string public baseURI = "ipfs://QmZzEbTnUWs5JDzrLKQ9yGk1kvszdnwdMaVw9vNgjCFLo2/";

    constructor(address _token, address _housePrices, address initialOwner) ERC721("RAAC NFT", "RAACNFT") Ownable(initialOwner) {
        if (_token == address(0) || _housePrices == address(0) || initialOwner == address(0)) revert RAACNFT__InvalidAddress();
        token = IERC20(_token);
        raac_hp = IRAACHousePrices(_housePrices);
    }

    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    function mint(uint256 _tokenId, uint256 _amount) public override {
        uint256 price = raac_hp.tokenToHousePrice(_tokenId);
        if(price == 0) { revert RAACNFT__HousePrice(); }
        if(price > _amount) { revert RAACNFT__InsufficientFundsMint(); }

        // transfer erc20 from user to contract - requires pre-approval from user
        token.safeTransferFrom(msg.sender, address(this), _amount);

        // mint tokenId to user
        _safeMint(msg.sender, _tokenId);

         // If user approved more than necessary, refund the difference
        if (_amount > price) {
            uint256 refundAmount = _amount - price;
            token.safeTransfer(msg.sender, refundAmount);
        }

        emit NFTMinted(msg.sender, _tokenId, price);
    }

    function getHousePrice(uint256 _tokenId) public view override returns(uint256) {
        return raac_hp.tokenToHousePrice(_tokenId);
    }

    function addNewBatch(uint256 _batchSize) public override onlyOwner {
        if (_batchSize == 0) revert RAACNFT__BatchSize();
        currentBatchSize += _batchSize;
    }

    function setBaseUri(string memory _uri) external override onlyOwner {
        baseURI = _uri;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, IERC165) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        if (account == address(0)) revert RAACNFT__InvalidAddress();
        super._increaseBalance(account, value);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        if (to == address(0)) revert RAACNFT__InvalidAddress();
        return super._update(to, tokenId, auth);
    }
}