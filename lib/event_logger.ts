import {ethers} from "hardhat";
import {Contract} from "ethers";
import {Log} from "hardhat-deploy/dist/types";
import {TokenContract, TokenType} from "./types";
import {Marketplace} from "./marketplace";


const interfaceId: { [iid: string]: TokenType } = {
  "0xd9b67a26": TokenType.ERC1155,
  "0x80ac58cd": TokenType.ERC721,
  "0x01ffc9a7": TokenType.ERC20,
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"


export class EventLogger {

  m: Marketplace

  constructor(marketplace: Marketplace) {
    this.m = marketplace;
  }


  async events() {

    const events = [
      // erc20 and erc721
      // note:  erc20  3th arg is quantity
      //        erc721 3th arg is tokenId
      new Event('Transfer', ['address', 'address', 'uint256'], async (log, a) => {
        await this.onTransfer(log, a[0], a[1], a[2].toBigInt(), a[2].toBigInt());
      }),

      // erc1155
      new Event('TransferSingle', ['address', 'address', 'address', 'uint256', 'uint256',],
        async (log, a) => {
          await this.onTransfer(log, a[1], a[2], a[3].toBigInt(), a[4].toBigInt());
        }
      ),
      new Event('TransferBatch', ['address', 'address', 'address', 'uint256[]', 'uint256[]',],
        async (log, a) => {
          for (let i = 0; i < a[3]; i++) {
            await this.onTransfer(log, a[1], a[2], a[3][i].toBigInt(), a[4][i].toBigInt());
          }
        })

    ]

    for (let e of events) {
      const logs = await this.m.contract.provider.getLogs({
        fromBlock: 'earliest',
        topics: [e.encode()]
      });
      for (let l of logs)
        await e.onEvent(l)
    }

  }

  async onTransfer(log: Log, from: string, to: string, tokenId: bigint, value: bigint) {
    const contract = await this.updateContract(log.address)
    if (contract.tokenType == TokenType.ERC20) tokenId = 0n;
    if (contract.tokenType == TokenType.ERC721) value = 1n;

    this.updateToken(contract, from, tokenId, value);
    this.updateToken(contract, to, tokenId, value);

    console.log(from, to, tokenId, value)
  }

  updateToken(contract: TokenContract, user: string, tokenId: bigint, valueD: bigint) {
    if (user == ZERO_ADDRESS) return;
    this.m.db.updateToken(contract, user, tokenId, valueD)
  }


  async updateContract(address: string): Promise<TokenContract> {
    let tokenContract = this.m.db.getContract(address);
    if (tokenContract !== undefined) return tokenContract;

    const contract = await this.m.getContract(address);
    const type = await this.getContractType(contract);
    if (type === undefined) throw "Unknown contract type";

    tokenContract = new TokenContract(type, address, "todo name not in erc");
    this.m.db.setContract(tokenContract)
    return tokenContract;
  }

  async getContractType(contract: Contract): Promise<TokenType | undefined> {
    for (let iid in interfaceId)
      if (await contract.supportsInterface(iid))
        return interfaceId[iid];
  }


}


class Event {
  name: string
  args: string[]
  callback: (log: Log, args: ReadonlyArray<any>) => Promise<void>


  constructor(name: string, args: string[], callback: (log: Log, args: ReadonlyArray<any>) => Promise<void>) {
    this.name = name;
    this.args = args;
    this.callback = callback;
  }

  encode() {
    return ethers.utils.id(`${this.name}(${this.args.join(',')})`)
  }

  decode(values: any[], data: string): ReadonlyArray<any> {
    const abiCoder = new ethers.utils.AbiCoder;
    values = values.slice(1);
    values.push(data)
    return abiCoder.decode(this.args, ethers.utils.hexConcat(values));
  }

  async onEvent(log: Log) {
    await this.callback(log, this.decode(log.topics, log.data))
  }
}
