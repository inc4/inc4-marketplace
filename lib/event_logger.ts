import {ethers} from "ethers";
import {Marketplace} from "./marketplace";
import {TokensCollection} from "./types/mongo";
import {TokenType} from "./types/common";
import {BlockTag, Log} from "@ethersproject/abstract-provider/src.ts/index";
import fetch from "node-fetch";
import {expect} from "chai";



const interfaceId: { [iid: string]: TokenType } = {
  "0xd9b67a26": TokenType.ERC1155,
  "0x80ac58cd": TokenType.ERC721,
  "0x01ffc9a7": TokenType.ERC20,
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/",
  "https://ipfs.io/",
  "https://ipfs.infura.io/",
  "https://ipfs.sloppyta.co/",
  "https://ipfs.2read.net/",
]

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
    // todo on uri change event


    // erc721 (and erc20)
    new Event('Transfer', ['address', 'address', 'uint256'],
      async (log, a) => {
        if (log.topics.length == 4) // erc721  ( 3 in erc20 )
          await this.onTransfer(log, a[0], a[1], a[2].toBigInt(), 1n);
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

  async getEvents(fromBlock?: BlockTag) {
    let newLastBlock = 0;

    for (let e of this.events) {
      const logs = await this.m.contract.provider.getLogs({
        fromBlock: fromBlock ?? (await this.m.dataRead()).lastBlock,
        topics: [e.encode()]
      });
      for (let l of logs)
        await e.onEvent(l)
      newLastBlock = Math.max(logs[logs.length - 1]?.blockNumber ?? 0, newLastBlock);
    }

    await this.m.dataWrite({lastBlock: newLastBlock})

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

    let collection = await TokensCollection.findOne({address: log.address}).exec();
    if (collection === null) {
      if (from !== ZERO_ADDRESS) throw "First contract transfer is not mint."
      const type = await this.getContractType(log.address);

      // owner = first minter of the contract
      // may work wrong with lazy minting contracts
      // todo get contract deployer address
      const owner = await this.getTxFrom(log.transactionHash)

      collection = await new TokensCollection({
        contractAddress: log.address,
        tokenType: type.valueOf(),
        owner: owner
      }).save();
    }

    await this.updateToken(collection, from, tokenId, -value);
    await this.updateToken(collection, to, tokenId, value);
  }

  async updateToken(collection: any, user: string, tokenId: bigint, valueD: bigint) {
    if (user == ZERO_ADDRESS) return;

    console.log(user, tokenId, Number(valueD))
    // todo in one call
    const found = await TokensCollection.findOneAndUpdate(
      {
        contractAddress: collection.contractAddress,
        'tokens.tokenId': tokenId.toString()
      },
      {
        $inc: {[`tokens.$.owners.${user}`]: Number(valueD)},
      }).exec();

    if (found === null) {
      console.log("new token")
      await TokensCollection.updateOne(
        {
          contractAddress: collection.contractAddress
        },
        {
          $push: {
            tokens: {
              tokenId: tokenId.toString(),
              metadata: await this.getMetadata(collection, tokenId),
              owners: {[user]: Number(valueD)},
            }
          }
        }).exec();
    }


  }

  async getContractType(address: string): Promise<TokenType> {
    const contract = await this.m.getContractCaller(address);

    for (let iid in interfaceId)
      if (await contract.supportsInterface(iid))
        return interfaceId[iid];

    throw "Unknown contract type";
  }


  private async getTxFrom(transactionHash: string): Promise<string> {
    const tx = await this.m.contract.provider.getTransaction(transactionHash)
    return tx.from;
  }

  private async getMetadata(collection: any, tokenId: bigint): Promise<object> {
    const contract = this.m.getContractCaller(collection.contractAddress);
    let uri: string;

    if (collection.tokenType == TokenType.ERC721)
      uri = await contract.tokenURI(tokenId)
    else if (collection.tokenType == TokenType.ERC1155)
      uri = (await contract.uri(tokenId)).replace('\{id\}', tokenId)
    else
      throw "Wrong tokenType"

    if (uri.startsWith('ipfs://'))
      uri = uri.replace('ipfs://', IPFS_GATEWAYS[0])  // todo round-robin, retry on error

    try {
      return await fetch(uri)
    } catch (e) {
      console.error(e)
      return {}
    }

  }
}
