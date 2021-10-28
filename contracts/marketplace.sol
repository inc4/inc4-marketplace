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
    mapping(bytes32 => bool) cancelledOrFinalized;

    // actualPrice = price * fee_reverse / 1e10    => floor pay to user
    // fee_to_marketplace = price - actualPrice    => ceil fee
    uint256 constant fee_reverse = (100 - 2.5) * 1e8;  // 2.5% fee

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


    function acceptOrder(Order memory o) public payable {
        _markFinalized(o);
        _transfer(o.left, o.right.user);
        _transfer(o.right, o.left.user);
    }

    function cancelOrder(Order memory o) public {
        _markFinalized(o);
    }


    function _markFinalized(Order memory o) internal {
        require(o.left.endTime > block.timestamp, "Left order burn out");
        require(o.right.endTime > block.timestamp, "Right order burn out");
        bytes32 message = keccak256(abi.encodePacked(
                o.left.tokenType, o.left.contractAddress, o.left.user, o.left.tokenId, o.left.quantity, o.left.endTime,
                o.right.tokenType, o.right.contractAddress, o.right.user, o.right.tokenId, o.right.quantity, o.right.endTime,
                o.nonce
            ));
        require(cancelledOrFinalized[message] == false, "Already filled");
        require(_recover(message, o.sig) == o.left.user, "Fail to verify");

        if (o.right.user != address(0))
            require(o.right.user == msg.sender, "It's not for you");
        else
            o.right.user = msg.sender;  // set o.right.user to use it in _transfer later

        cancelledOrFinalized[message] = true;
    }

    function _transfer(OrderPart memory sender, address receiver) internal {
        if (sender.tokenType == TokenType.ETH) {
            require(msg.value == sender.quantity, "Wrong eth value");
            uint256 actualPrice = sender.quantity * fee_reverse / 1e10;
            payable(receiver).transfer(actualPrice);

        } else if (sender.tokenType == TokenType.ERC20) {
            uint256 actualPrice = sender.quantity * fee_reverse / 1e10;
            require(IERC20(sender.contractAddress).transferFrom(sender.user, receiver, actualPrice), "Fail transfer coins");
            require(IERC20(sender.contractAddress).transferFrom(sender.user, address(this), sender.quantity - actualPrice), "Fail transfer coins");

        } else if (sender.tokenType == TokenType.ERC721) {
            IERC721(sender.contractAddress).safeTransferFrom(sender.user, receiver, sender.tokenId);

        } else if (sender.tokenType == TokenType.ERC1155) {
            IERC1155(sender.contractAddress).safeTransferFrom(sender.user, receiver, sender.tokenId, sender.quantity, "");

        } else {
            revert("Wrong tokenType");
        }
        emit Transfer(sender.contractAddress, sender.tokenId, sender.quantity, sender.user, receiver);
    }


    function _recover(bytes32 message, Sig memory sig) internal pure returns (address) {
        return ecrecover(
            keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message)),
            sig.v, sig.r, sig.s
        );
    }

}
