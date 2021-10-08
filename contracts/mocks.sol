// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/token/ERC721/presets/ERC721PresetMinterPauserAutoId.sol";
import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract mockERC721 is ERC721PresetMinterPauserAutoId {

    constructor() ERC721PresetMinterPauserAutoId("A", "B", "C") {
    }
}

contract mockERC20 is ERC20PresetMinterPauser {

    constructor() ERC20PresetMinterPauser("A", "B") {
    }
}
