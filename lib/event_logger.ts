import {Contract, ethers} from "ethers";
import {Log} from "hardhat-deploy/dist/types";
import {Marketplace} from "./marketplace";
import {TokenContract} from "./types/mongo";
import {TokenType} from "./types/common";
import {BlockTag} from "@ethersproject/abstract-provider/src.ts/index";


const interfaceId: { [iid: string]: TokenType } = {
  "0xd9b67a26": TokenType.ERC1155,
  "0x80ac58cd": TokenType.ERC721,
  "0x01ffc9a7": TokenType.ERC20,
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"



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



export class EventLogger {

  m: Marketplace

  constructor(marketplace: Marketplace) {
    this.m = marketplace;
  }

  events = [
    // erc20 and erc721
    new Event('Transfer', ['address', 'address', 'uint256'],
      async (log, a) => {
        if (log.topics.length == 3) // erc20
          return await this.onTransfer(log, a[0], a[1], 0n, a[2].toBigInt());
        if (log.topics.length == 4) // erc721
          return await this.onTransfer(log, a[0], a[1], a[2].toBigInt(), 1n);
        console.error(log.topics, "length not in (3, 4)")
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

  async getEvents(fromBlock: BlockTag) {
      for (let e of this.events) {
        const logs = await this.m.contract.provider.getLogs({
          fromBlock: fromBlock,  // todo last processed block
          topics: [e.encode()]
        });
        for (let l of logs)
          await e.onEvent(l)
      }
  }

  async listenEvents() {
      for (let e of this.events)
        this.m.contract.provider.on([e.encode()], l => e.onEvent(l))
  }

  removeListeners() {
      this.m.contract.provider.removeAllListeners();
  }


  async onTransfer(log: Log, from: string, to: string, tokenId: bigint, value: bigint) {
    console.log(log.address, from, to, tokenId, value)
    const contract = await this.updateContract(log.address)

    await this.updateToken(contract, from, tokenId, -value);
    await this.updateToken(contract, to, tokenId, value);

  }

  async updateToken(contract: any, user: string, tokenId: bigint, valueD: bigint) {
    if (user == ZERO_ADDRESS) return;


    console.log(user, tokenId, Number(valueD))
    // todo in one call
    const found = await TokenContract.findOneAndUpdate(
      {
        address: contract.address,
        'tokens.tokenId': tokenId.toString(),
        'tokens.owner': user
      },
      {
        $inc: {'tokens.$.quantity': Number(valueD)},
      }).exec();

    if (found === null) {
      console.log("new token owner")
      await TokenContract.updateOne(
        {
          address: contract.address
        },
        {
          $push: {
            tokens: {
              tokenId: tokenId.toString(),
              owner: user,
              quantity: Number(valueD),
            }
          }
        }).exec();
    }


  }


  async updateContract(address: string): Promise<typeof TokenContract> {
    let tokenContract = await TokenContract.findOne({address}).exec();
    if (tokenContract !== null) return tokenContract;

    const contract = await this.m.getContractCaller(address);
    const type = await this.getContractType(contract);
    if (type === undefined) throw "Unknown contract type";

    // todo
    const name = type == TokenType.ERC721 ? "todo get name from contract" : "";

    tokenContract = new TokenContract({
      tokenType: type.valueOf(),
      address: address,
      name: name
    });
    await tokenContract.save();
    return tokenContract;
  }

  async getContractType(contract: Contract): Promise<TokenType | undefined> {
    for (let iid in interfaceId)
      if (await contract.supportsInterface(iid))
        return interfaceId[iid];
  }





}
