import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  // todo check network == 'hardhat'

  const {owner} = await hre.getNamedAccounts();

  await hre.deployments.deploy("mockERC721", {
    from: owner,
    log: true,
  });

  await hre.deployments.deploy("mockERC20", {
    from: owner,
    log: true,
  });

};

export default func;
func.tags = ["mocks"];
