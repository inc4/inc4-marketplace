// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";


// todo do we need ERC1155 safeBatchTransferFrom on acceptOrder?


// todo transfer interface for all supported erc (instead of 3 imports of openzeppelin, save some deploy gas)

//interface IERC420 {
//    // erc20
//    function transferFrom(
//        address sender,
//        address recipient,
//        uint256 amount
//    ) external returns (bool);
//
//    // erc721
//    function safeTransferFrom(
//        address from,
//        address to,
//        uint256 tokenId
//    ) external;
//
//    // erc1155
//    function safeTransferFrom(
//        address from,
//        address to,
//        uint256 id,
//        uint256 amount,
//        bytes calldata data
//    ) external;
//}
//

contract marketplace {
    event Transfer(address tokenContractAddress, uint256 tokenId, uint256 quantity, address from, address to);

    address immutable backend;
    mapping(bytes32 => bool) cancelledOrFinalized;  // todo add nonce to Order. (otherwise transaction like this banned forever)

    enum TokenType {ETH, ERC20, ERC721, ERC1155}
    struct Order {
        OrderPart left;
        OrderPart right;
        uint256 nonce;
        Sig sig;
    }

    struct OrderPart {
        TokenType tokenType;
        address contractAddress;
        address user;
        uint256 tokenId;
        uint256 quantity;
        uint256 endTime;
    }

    struct Sig {
        bytes32 r;
        bytes32 s;
        uint8 v;
    }



    constructor(address backend_)  {
        backend = backend_;
    }


    function acceptOrder(Order calldata o) public payable {
        _markFinalized(o);
        _transfer(o.left, o.right.user);
        _transfer(o.right, o.left.user);
    }

    function cancelOrder(Order calldata o) public {
        _markFinalized(o);
    }


    function _markFinalized(Order calldata o) internal {
        require(o.left.endTime > block.timestamp, "Left order burn out");
        require(o.right.endTime > block.timestamp, "Right order burn out");

        // also check right.user == msg.sender here
        bytes32 message = keccak256(abi.encodePacked(
                o.left.tokenType, o.left.contractAddress, o.left.user, o.left.tokenId, o.left.quantity, o.left.endTime,
                o.right.tokenType, o.right.contractAddress, msg.sender, o.right.tokenId, o.right.quantity, o.right.endTime,
                o.nonce
            ));
        require(cancelledOrFinalized[message] == false, "Already filled");

        require(_recover(message, o.sig) == o.left.user, "Fail to verify");


        cancelledOrFinalized[message] = true;
    }

    function _transfer(OrderPart calldata sender, address receiver) internal {
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


    function _recover(bytes32 message, Sig calldata sig) internal pure returns (address) {
        return ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message)),
            sig.v, sig.r, sig.s
        );
    }

}
