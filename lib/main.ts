import {Marketplace} from "./marketplace";
import {ethers} from "ethers";
import deployment from "../deployments/rinkeby/marketplace.json"
import * as dotenv from "dotenv";
import {start} from "./api/api";

async function main() {
  dotenv.config();

  const provider = new ethers.providers.InfuraProvider('rinkeby', process.env.INFURA_KEY)
  const signer = new ethers.Wallet(process.env.PRIVATEKEY || "", provider)
  const contract = ethers.ContractFactory.getContract(deployment.address, deployment.abi, signer)
  const marketplace = new Marketplace(contract);
  await start(marketplace);


}

main().then(r => {})
