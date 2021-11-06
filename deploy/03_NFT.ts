import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";
import {ethers} from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {owner} = await hre.getNamedAccounts();

  const marketplace = await ethers.getContract("marketplace");

  await hre.deployments.deploy("nftPublic", {
    from: owner,
    args: [marketplace.address, ""],
    log: true,
  });

};

export default func;
func.tags = ["nft"];
