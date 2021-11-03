import {Contract, ethers} from "ethers";
import {Log} from "hardhat-deploy/dist/types";
import {Marketplace} from "./marketplace";
import {TokenContract} from "./types/mongo";
import {TokenType} from "./types/common";


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

  async listen() {

    const events = [
      // erc20 and erc721
      new Event('Transfer', ['address', 'address', 'uint256'],
        async (log, chainId: number, a) => {
          if (log.topics.length == 3) // erc20
            return await this.onTransfer(log, chainId, a[0], a[1], 0n, a[2].toBigInt());
          if (log.topics.length == 4) // erc721
            return await this.onTransfer(log, chainId, a[0], a[1], a[2].toBigInt(), 1n);
          console.error(log.topics, "length not in (3, 4)")
        }),

      // erc1155
      new Event('TransferSingle', ['address', 'address', 'address', 'uint256', 'uint256',],
        async (log, chainId: number, a) => {
          await this.onTransfer(log, chainId, a[1], a[2], a[3].toBigInt(), a[4].toBigInt());
        }
      ),
      new Event('TransferBatch', ['address', 'address', 'address', 'uint256[]', 'uint256[]',],
        async (log, chainId: number, a) => {
          for (let i = 0; i < a[3]; i++) {
            await this.onTransfer(log, chainId, a[1], a[2], a[3][i].toBigInt(), a[4][i].toBigInt());
          }
        })

    ]

    for (let chainIdS in this.m.chains) {
      const chainId = Number(chainIdS)
      const provider = this.m.chains[chainId];

      for (let e of events) {
        // old
        // todo duplicates
        // const logs = await provider.getLogs({
        //   fromBlock: 'earliest',  // todo last processed block
        //   topics: [e.encode()]
        // });
        // for (let l of logs) await e.onEvent(l, chainId)

        // new
        provider.on([e.encode()], l => e.onEvent(l, chainId))
      }
    }

  }

  removeListeners() {
    for (let chainId in this.m.chains)
      this.m.chains[chainId].removeAllListeners();

  }


  async onTransfer(log: Log, chainId: number, from: string, to: string, tokenId: bigint, value: bigint) {
    console.log(log.address, from, to, tokenId, value)
    const contract = await this.updateContract(log.address, chainId)

    await this.updateToken(chainId, contract, from, tokenId, -value);
    await this.updateToken(chainId, contract, to, tokenId, value);

  }

  async updateToken(chainId: number, contract: any, user: string, tokenId: bigint, valueD: bigint) {
    if (user == ZERO_ADDRESS) return;


    console.log(user, tokenId, Number(valueD))
    // todo in one call
    const found = await TokenContract.findOneAndUpdate(
      {
        chainId: chainId,
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
          chainId: chainId,
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


  async updateContract(address: string, chainId: number): Promise<typeof TokenContract> {
    let tokenContract = await TokenContract.findOne({address}).exec();
    if (tokenContract !== null) return tokenContract;

    const contract = await this.m.getContractCaller(address, chainId);
    const type = await this.getContractType(contract);
    if (type === undefined) throw "Unknown contract type";

    tokenContract = new TokenContract({
      chainId: chainId,
      tokenType: type.valueOf(),
      address: address,
      name: "todo name not in erc"  // todo
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


class Event {
  name: string
  args: string[]
  callback: (log: Log, chainId: number, args: ReadonlyArray<any>) => Promise<void>


  constructor(name: string, args: string[], callback: (log: Log, chainId: number, args: ReadonlyArray<any>) => Promise<void>) {
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

  async onEvent(log: Log, chainId: number) {
    await this.callback(log, chainId, this.decode(log.topics, log.data))
  }
}
