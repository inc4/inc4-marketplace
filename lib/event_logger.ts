import {ethers} from "ethers";
import {Marketplace} from "./marketplace";
import {TokensCollection} from "./types/mongo";
import {TokenType} from "./types/common";
import {BlockTag, Log} from "@ethersproject/abstract-provider/src.ts/index";
import fetch from "node-fetch";
import {events} from "./abi"


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
  eventAbi: any
  callback: (log: Log, result: ReadonlyMap<string, any>) => Promise<void>
  args: { [k: string]: any[] } = {it: [], in: [], ut: [], un: []}  // indexed/unindexed * type/name

  static abiCoder = new ethers.utils.AbiCoder;

  constructor(eventAbi: any, callback: (log: Log, args: Readonly<any>) => Promise<void>) {
    this.eventAbi = eventAbi;
    this.callback = callback;
    for (let i of eventAbi.inputs) {
      this.args[i.indexed ? 'in' : 'un'].push(i.name)
      this.args[i.indexed ? 'it' : 'ut'].push(i.type)
    }
  }

  encode() {
    const args = this.eventAbi.inputs.map((i: any) => i.type)
    return ethers.utils.id(`${this.eventAbi.name}(${args})`)
  }

  async onEvent(log: Log) {
    if (log.topics.length - 1 != this.args.in.length) return;  // same event name and types but different indexes (ex: erc20 and erc721 Transfer(address, address, uint256) )
    const parse = (names: string[], types: string[], values: any[]) => Event.abiCoder.decode(types, ethers.utils.hexConcat(values)).map((v, i) => result[names[i]] = v)
    const result: any = {};
    parse(this.args.in, this.args.it, log.topics.slice(1))
    parse(this.args.un, this.args.ut, [log.data])

    console.log("event", this.eventAbi.name, result)
    await this.callback(log, result)
  }
}


export class EventLogger {

  m: Marketplace

  constructor(marketplace: Marketplace) {
    this.m = marketplace;
  }

  events = [
    // erc721
    new Event(events.Transfer, async (log, result) => {
      await this.onTransfer(log, result.from, result.to, result.tokenId.toBigInt(), 1n);
    }),

    // erc1155
    new Event(events.TransferSingle, async (log, result) => {
      await this.onTransfer(log, result.from, result.to, result.id.toBigInt(), result.value.toBigInt());
    }),
    new Event(events.TransferBatch, async (log, result) => {
      for (let i = 0; i < result.ids.length; i++)
        await this.onTransfer(log, result.from, result.to, result.ids[i].toBigInt(), result.values[i].toBigInt());
    }),

    // erc1155 change uri
    new Event(events.URI, async (log, result) => {
      await this.updateMetadataUri(log.address, result.id.toString(), result.value);
    }),

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


  async onTransfer(log: Log, from: string, to: string, tokenId: string, value: bigint) {
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

  async updateToken(collection: any, user: string, tokenId: string, valueD: bigint) {
    if (user == ZERO_ADDRESS) return;

    // todo in one call
    const found = await TokensCollection.findOneAndUpdate({
      contractAddress: collection.contractAddress,
      'tokens.tokenId': tokenId.toString()
    }, {
      $inc: {[`tokens.$.owners.${user}`]: Number(valueD)},
    }).exec();

    if (found === null) {
      console.log("new token")
      const metadata_uri = await this.getMetadataUri(collection, tokenId)
      await TokensCollection.updateOne({
        contractAddress: collection.contractAddress
      }, {
        $push: {
          tokens: {
            tokenId: tokenId.toString(),
            metadata_uri: metadata_uri,
            metadata: await fetchMetadata(metadata_uri),
            owners: {[user]: Number(valueD)},
          }
        }
      }).exec();
    }
  }


  async updateMetadataUri(contractAddress: string, tokenId: string, newUri: string) {
    newUri = newUri.replace('\{id\}', tokenId);
    await TokensCollection.updateOne({
      contractAddress: contractAddress,
      'tokens.tokenId': tokenId
    }, {
      $set: {
        'tokens.$.metadata_uri': newUri,
        'tokens.$.metadata': await fetchMetadata(newUri),
      }
    }).exec();
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

  private async getMetadataUri(collection: any, tokenId: string): Promise<string> {
    const contract = this.m.getContractCaller(collection.contractAddress);
    if (collection.tokenType == TokenType.ERC721)
      return await contract.tokenURI(tokenId)
    if (collection.tokenType == TokenType.ERC1155)
      return (await contract.uri(tokenId)).replace('\{id\}', tokenId)

    throw "Wrong tokenType"
  }

}


async function fetchMetadata(uri: string): Promise<object> {

  if (uri.startsWith('ipfs://'))
    uri = uri.replace('ipfs://', IPFS_GATEWAYS[0])  // todo round-robin, retry on error

  try {
    return parseMetadata(await (await fetch(uri)).json())
  } catch (e) {
    console.log(uri)
    console.error(e)
  }
  return {}
}

async function parseMetadata(metadata: any) {
  // opensea violates its own standard
  if (metadata.external_link && !metadata.external_url)
    metadata.external_url = metadata.pop('external_link')

  return metadata
}
