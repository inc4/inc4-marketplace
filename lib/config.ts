import {ethers, providers} from "ethers";
import {ethers as hethers} from "hardhat";


export const chains: { [chainId: number]: providers.JsonRpcProvider } = {
  // 1: new ethers.providers.InfuraProvider("mainnet", {
  //   projectId: "01117e8ede8e4f36801a6a838b24f36c",
  //   projectSecret: "34d8e83fca265e9ab5bcc1094fa64e98692375bf8980d066a9edcf4953f0f2f5"
  // }),

  42: hethers.provider
}
