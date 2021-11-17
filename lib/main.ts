import {Marketplace} from "./marketplace";
import {ethers} from "ethers";
import deployment from "../deployments/rinkeby/marketplace.json"
import * as dotenv from "dotenv";
import {start} from "./api/api";
import amongus from "mongoose";

async function main() {
  dotenv.config();

  if (!process.env.PRIVATEKEY) throw "No PRIVATEKEY env var"
  if (!process.env.INFURA_KEY) throw "No INFURA_KEY env var"

  const provider = new ethers.providers.InfuraProvider('mainnet', process.env.INFURA_KEY)
  const signer = new ethers.Wallet(process.env.PRIVATEKEY, provider)
  const contract = ethers.ContractFactory.getContract(deployment.address, deployment.abi, signer)
  const marketplace = new Marketplace(contract);

  await amongus.connect('mongodb://root:example@localhost:27017/admin');

  // await marketplace.eventLogger.getFullHistory()

  await start(marketplace);


}

main().then(r => {})
