// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract nftPublic is ERC1155 {

    address immutable marketplace;

    constructor(address marketplace_, string memory uri) ERC1155(uri) {
        marketplace = marketplace_;
    }

    function isApprovedForAll(address account, address operator) public view virtual override returns (bool) {
        if (operator == marketplace) return true;
        return super.isApprovedForAll(account, operator);
    }

    function mint(address account, uint256 id, uint256 amount, bytes memory data) public {
        _mint(account, id, amount, data);
    }
}
