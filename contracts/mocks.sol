// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC1155/presets/ERC1155PresetMinterPauser.sol";
import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract mockERC1155 is ERC1155PresetMinterPauser {

    constructor() ERC1155PresetMinterPauser("A") {
    }
}

contract mockERC721 is ERC721PresetMinterPauserAutoId {

    constructor() ERC721PresetMinterPauserAutoId("A", "B", "C") {
    }
}

contract mockERC20 is ERC20PresetMinterPauser {

    constructor() ERC20PresetMinterPauser("A", "B") {
    }
}
