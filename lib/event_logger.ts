import {ethers} from "ethers";
import {Marketplace} from "./marketplace";
import {TokensCollection} from "./types/mongo";
import {TokenType} from "./types/common";
import {Log} from "@ethersproject/abstract-provider/src.ts/index";
import fetch from "node-fetch";
import {events} from "./abi"
import {removeFromQueue} from "./ipfs";


const interfaceId: { [key in TokenType]?: string } = {
  [TokenType.ERC1155]: "0xd9b67a26",
  [TokenType.ERC721]: "0x80ac58cd",
}

const ZERO_ADDRESS = ethers.constants.AddressZero;
const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://ipfs.infura.io/ipfs/",
  "https://ipfs.sloppyta.co/ipfs/",
  "https://ipfs.2read.net/ipfs/",
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

    console.log("event", this.eventAbi.name, log.address, result)
    await this.callback(log, result)
  }
}


export class EventLogger {

  m: Marketplace

  events = [
    // erc721
    new Event(events.Transfer, async (log, result) => {
      await this.onTransfer(log, TokenType.ERC721, result.from, result.to, result.tokenId.toString(), 1);
    }),

    // erc1155
    new Event(events.TransferSingle, async (log, result) => {
      await this.onTransfer(log, TokenType.ERC1155, result.from, result.to, result.id.toNumber(), result.value.toNumber());
    }),
    new Event(events.TransferBatch, async (log, result) => {
      for (let i = 0; i < result.ids.length; i++)
        await this.onTransfer(log, TokenType.ERC1155, result.from, result.to, result.ids[i].toNumber(), result.values[i].toNumber());
    }),

    // erc1155 change uri
    new Event(events.URI, async (log, result) => {
      await this.updateMetadataUri(log.address, result.id.toString(), result.value);
    }),

    // our public marketplace token minted
    new Event(events.MintWithIpfsCid, async (log, result) => {
      await removeFromQueue(result.cid);
    }),

  ]
  eventsByHash: { [topic: string]: Event } = {}

  blocksTimestampCache: { [blockHash: string]: any } = {}


  constructor(marketplace: Marketplace) {
    this.m = marketplace;
    for (let e of this.events) this.eventsByHash[e.encode()] = e
  }


  async getFullHistory() {
    console.log('parsing events')
    const lastBlock = await this.m.contract.provider.getBlockNumber()
    let fromBlock = undefined;  // undefined => start from last block saved in db
    let blocksRange = 10000;  // start parse with huge range.
    while (true) {
      [fromBlock, blocksRange] = await this.getEvents(fromBlock, blocksRange)
      // blocksRange decreases until infura can process the request
      console.log('parsed blocks up to', fromBlock, ' blockRange =', blocksRange);
      blocksRange *= 2;       // gradually increase blocksRange back

      if (fromBlock >= lastBlock) {
        // _getEvents() save fromBlock as lastBlock, but fromBlock >= lastBlock and we can miss some events
        await this.m.dataWrite({lastBlock: lastBlock})
        break;
      }
    }


    console.log('parsed')
  }


  async getEvents(fromBlock?: number, blocks: number = 100): Promise<[number, number]> {
    const fromBlock_ = fromBlock ?? (await this.m.dataRead())?.lastBlock ?? 0;

    for (let i = 0; i < 10; i++)
      try {
        const res = await this._getEvents(fromBlock_, fromBlock_ + blocks)
        return [res, blocks]
      } catch (e: any) {
        if (e?.error?.code == -32005) blocks = Math.floor(blocks / 3);  // result too big
        else if (e.message === "Cannot read properties of null (reading 'forEach')") continue;
        else
          throw e;
      }

    return [await this._getEvents(fromBlock_, blocks), blocks]
  }


  private async _getEvents(fromBlock: number, toBlock: number): Promise<number> {
    const logs = await this.m.contract.provider.getLogs({fromBlock, toBlock, topics: [Object.keys(this.eventsByHash)]});

    for (let l of logs) {
      // todo do this in db transaction (restore changed data if event processing fail)
      await this.eventsByHash[l.topics[0]].onEvent(l)
      await this.m.dataWrite({lastBlock: l.blockNumber})
    }
    await this.m.dataWrite({lastBlock: toBlock})
    return toBlock
  }

  async listenEvents() {
    this.m.contract.provider.on([Object.keys(this.eventsByHash)],
      async (l) => {
        await this.eventsByHash[l.topics[0]].onEvent(l);
        await this.m.dataWrite({lastBlock: l.blockNumber});
      });
  }

  removeListeners() {
    this.m.contract.provider.removeAllListeners();
  }


  private async onTransfer(log: Log, tokenType: TokenType, from: string, to: string, tokenId: string, quantity: number) {
    let collection = await TokensCollection.findOne({contractAddress: log.address}).exec();

    if (collection === null) {
      if (!await this.isTokenTypeEq(log.address, tokenType)) {
        // save with tokenType == undefined to skip this contract check in future
        await new TokensCollection({contractAddress: log.address, tokenType: undefined}).save();
        return;
      }

      if (from !== ZERO_ADDRESS) {
        console.error("First contract transfer is not mint.")
        return;
      }

      // owner = first minter of the contract
      // may work wrong with lazy minting contracts
      // todo get contract deployer address
      const owner = await this.getTxFrom(log.transactionHash)

      collection = await new TokensCollection({
        contractAddress: log.address,
        tokenType: tokenType.valueOf(),
        owner: owner
      }).save();
    }
    if (collection.tokenType === undefined) {
      console.log("skip", log.address, "coz tokenType == undefined ")
      return;
    }


    const timestamp = await this.getBlockTimestamp(log.blockHash);
    const transferEvent = {from, to, quantity, timestamp, txHash: log.transactionHash};

    const found = await TokensCollection.findOneAndUpdate({
      contractAddress: collection.contractAddress,
      'tokens.tokenId': tokenId
    }, {
      $inc: {
        [`tokens.$.owners.${from}`]: -quantity,
        [`tokens.$.owners.${to}`]: quantity,
      },
      $set: {'tokens.$.last_update': timestamp},
      $push: {'tokens.$.events': transferEvent},
    }).exec();

    if (found === null) {

      if (from !== ZERO_ADDRESS) {
        console.error("First token transfer is not mint.")
        return;
      }

      console.log("new token")
      const metadata_uri = await this.getMetadataUri(collection, tokenId)
      await TokensCollection.updateOne({
        contractAddress: collection.contractAddress
      }, {
        $push: {
          tokens: {
            tokenId: tokenId,
            metadata_uri: metadata_uri,
            metadata: await fetchMetadata(metadata_uri),
            last_update: timestamp,
            owners: {
              [from]: -quantity,
              [to]: quantity,
            },
            events: [transferEvent],
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


  private async isTokenTypeEq(address: string, tokenType: TokenType): Promise<boolean> {
    const contract = this.m.getContractCaller(address);
    try {
      return await contract.supportsInterface(interfaceId[tokenType]);
    } catch (e: any) {
      console.warn("supportsInterface() call failed on", address, e.reason ?? e);
    }
    try {
      if (tokenType == TokenType.ERC721) {
        // await contract.estimateGas['safeTransferFrom(address,address,uint256)'](ZERO_ADDRESS, ZERO_ADDRESS, 0);
        await contract.tokenURI(0);
        await contract.getApproved(0);
      } else if (tokenType == TokenType.ERC1155) {
        // await contract.estimateGas['safeTransferFrom(address,address,uint256,uint256,bytes)'](ZERO_ADDRESS, ZERO_ADDRESS, 0, 0, "");
        await contract.uri(0);
        await contract.isApprovedForAll(ZERO_ADDRESS, ZERO_ADDRESS);
      }
    } catch (e: any) {
      console.warn("failed to call erc functions", address, e?.error?.reason ?? e);
      return false
    }
    return true;
  }


  private async getTxFrom(transactionHash: string): Promise<string> {
    const tx = await this.m.contract.provider.getTransaction(transactionHash)
    this.blocksTimestampCache[tx.blockHash ?? ""] = tx.timestamp;
    return tx.from;
  }

  private async getBlockTimestamp(blockHash: string): Promise<number> {
    const t = this.blocksTimestampCache[blockHash]
    if (t !== undefined) return t;

    const block = await this.m.contract.provider.getBlock(blockHash);
    this.blocksTimestampCache[blockHash] = block.timestamp;
    return block.timestamp
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
