import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import {Marketplace} from "../lib/marketplace";
import amongus from "mongoose";
import {IpfsQueue, TokensCollection} from "../lib/types/mongo";
import {unpin, upload} from "../lib/metadata";
import * as fs from "fs";

import {expect, isSubset, zero} from "./utils/utils";


describe("Ipfs", () => {
  let owner: string;

  let nftPublic: Contract;
  let marketplace: Marketplace;


  before(async () => {
    await deployments.fixture(["marketplace", "nft"]);
    ({owner} = await getNamedAccounts());
    const ownerS = await ethers.getSigner(owner);

    nftPublic = await ethers.getContract("nftPublic", ownerS);

    const marketplaceContract = await ethers.getContract("marketplace", ownerS);
    marketplace = new Marketplace(marketplaceContract);

    await amongus.connect('mongodb://root:example@localhost:27017/admin');
  });

  beforeEach(async () => {
    await deployments.fixture(["marketplace", "nft"]); // reset contracts state
    marketplace.eventLogger.removeListeners();
    await TokensCollection.deleteMany({});
    await IpfsQueue.deleteMany({});
  });


  it('mint', async () => {
    const image = fs.createReadStream("./test/utils/svin.jpg")
    const cid = await upload({name: "test", description: "test", image: image})

    const [ipfsQueue] = await IpfsQueue.find({});
    isSubset(ipfsQueue, {cid: cid});

    await nftPublic.mint(1, cid)

    await marketplace.eventLogger.getEvents(0);

    const emptyIpfsQueue = await IpfsQueue.find({});
    expect(emptyIpfsQueue).to.be.empty;

    const [tokens] = await marketplace.getTokens();
    isSubset(tokens, {
      tokenType: 3, contractAddress: nftPublic.address, owner: owner,
      tokens: [{
        tokenId: "0",
        metadata_uri: cid,
        metadata: {name: "test", description: "test"},
        owners: {[owner]: 1, [zero]: -1},
        events: [{from: zero, to: owner, quantity: 1}]
      }]
    });

    await unpin(cid)

  })
})
