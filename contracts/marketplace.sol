// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";


// todo transfer interface for all supported erc

contract marketplace {
    address immutable backend;

    enum TokenType {ETH, ERC20, ERC721, ERC1155}


    struct OrderData {
        TokenType tokenType;
        address contractAddress;
        address user;
        uint256 tokenId;
        uint256 quantity;
        uint256 endTime;
    }

    event Transfer(address tokenContractAddress, uint256 tokenId, uint256 quantity, address from, address to);


    constructor(address backend_)  {
        backend = backend_;
    }


    function acceptOffer(OrderData calldata left, OrderData calldata right, bytes memory signature) public payable {
        require(_recover(keccak256(abi.encodePacked(
                left.tokenType, left.contractAddress, left.user, left.tokenId,left.quantity, left.endTime,
                right.tokenType, right.contractAddress, msg.sender, right.tokenId, right.quantity, right.endTime
            )), signature) == left.user, "Fail to verify");

        _transfer(left, right.user);
        _transfer(right, left.user);

    }

    function _transfer(OrderData calldata sender, address receiver) internal {
        if (sender.tokenType == TokenType.ETH) {
            require(msg.value == sender.quantity, "Wrong eth value");
            payable(receiver).transfer(sender.quantity);
        } else if (sender.tokenType == TokenType.ERC20) {
            require(IERC20(sender.contractAddress).transferFrom(sender.user, receiver, sender.quantity), "Fail transfer coins");
        } else if (sender.tokenType == TokenType.ERC721) {
            IERC721(sender.contractAddress).safeTransferFrom(sender.user, receiver, sender.tokenId);
        } else if (sender.tokenType == TokenType.ERC1155) {
            IERC1155(sender.contractAddress).safeTransferFrom(sender.user, receiver, sender.tokenId, sender.quantity, "");
        } else {
            revert("Wrong tokenType");
        }
        emit Transfer(sender.contractAddress, sender.tokenId, sender.quantity, sender.user, receiver);
    }


    function _recover(bytes32 message, bytes memory signature) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        return ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message
            )), v, r, s);
    }

}
