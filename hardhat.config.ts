import "@nomiclabs/hardhat-waffle";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import "solidity-coverage";

import * as dotenv from "dotenv";

dotenv.config();
const PK = [process.env.PRIVATEKEY || "00000000"];

module.exports = {
    networks: {
        hardhat: {
        },
        rinkeby: {
            url: "https://rinkeby.infura.io/v3/" + process.env.INFURA_KEY,
            accounts: PK,
        },
        ropsten: {
            url: "https://ropsten.infura.io/v3/" + process.env.INFURA_KEY,
            accounts: PK,
        },
        mainnet: {
            url: "https://mainnet.infura.io/v3/" + process.env.INFURA_KEY,
            accounts: PK,
        },
    },
    namedAccounts: {
        owner: 0,
        user: 1,
    },
    etherscan: {
        apiKey: "DY4Z86MQ2D9E24C6HB98PTA79EKJ5TQIFX",
    },
    solidity: {
        compilers: [
            {
                version: "0.8.6",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
};
