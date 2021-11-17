import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import {Marketplace} from "../lib/marketplace";
import {OrderFront, OrderPartFront, TokenType} from "../lib/types/common";
import amongus from "mongoose";
import {Order, TokensCollection} from "../lib/types/mongo";
import {expect, endtime, isSubset, zero} from "./utils";



describe("Marketplace", () => {
  let ownerS: Signer;
  let userS: Signer;
  let owner: string;
  let user: string;

  let mock20: Contract;
  let mock721: Contract;
  let mock1155: Contract;

  let marketplace: Marketplace;


  before(async () => {
    await deployments.fixture(["mocks", "marketplace"]);
    ({owner, user} = await getNamedAccounts());
    ownerS = await ethers.getSigner(owner);
    userS = await ethers.getSigner(user);

    mock20 = await ethers.getContract("mockERC20", ownerS);
    mock721 = await ethers.getContract("mockERC721", ownerS);
    mock1155 = await ethers.getContract("mockERC1155", ownerS);

    const marketplaceContract = await ethers.getContract("marketplace", ownerS);
    marketplace = new Marketplace(marketplaceContract);

    await amongus.connect('mongodb://root:example@localhost:27017/admin');

  });

  beforeEach(async () => {
    await deployments.fixture(["mocks", "marketplace"]); // reset contracts state
    marketplace.eventLogger.removeListeners();
    await TokensCollection.deleteMany({});
    await Order.deleteMany({});
  });


  it('order', async () => {

    await mock721.mint(owner);
    await mock20.mint(user, 200);

    await marketplace.eventLogger.getEvents(0);

    // create order

    let [tokens] = await marketplace.getTokens();
    isSubset(tokens, {
      tokenType: 2, contractAddress: mock721.address, owner: owner,
      tokens: [{
        tokenId: "0",
        metadata_uri: "http://localhost/0",
        metadata: {},
        owners: {[owner]: 1, [zero]: -1},
        events: [{from: zero, to: owner, quantity: 1}]
      }]
    });


    const order = new OrderFront(
      new OrderPartFront(TokenType.ERC721, tokens.contractAddress, tokens.tokens[0].tokenId, owner, 1, endtime(100)),
      new OrderPartFront(TokenType.ERC20, mock20.address, "0", user, 200, endtime(100)),
      endtime(0)
    )
    order.setSignature(await ownerS.signMessage(order.toMessage()))


    await marketplace.createOrder(order).should.be.rejected;

    await mock721.approve(marketplace.contract.address, 0);
    await mock20.connect(userS).approve(marketplace.contract.address, 200)

    await marketplace.createOrder(order)


    // accept order


    // frontend will check it before transaction
    await marketplace.checkApprove(order.right);

    await expect(() => marketplace.contract.connect(userS).acceptOrder(order.toCallData())).to
      .changeTokenBalances(mock20, [userS, ownerS, marketplace.contract], [-200, 195, 5]);

    await marketplace.eventLogger.getEvents();

    [tokens] = await marketplace.getTokens();
    isSubset(tokens, {
      tokenType: 2, contractAddress: mock721.address, owner: owner,
      tokens: [{
        tokenId: "0",
        metadata_uri: "http://localhost/0",
        metadata: {},
        owners: {[owner]: 0, [user]: 1, [zero]: -1},
        events: [
          {from: zero, to: owner, quantity: 1},
          {from: owner, to: user, quantity: 1}
        ]

      }],
    })

  });


  it('change uri', async () => {
    await mock1155.mint(user, 0, 1, 0);
    await marketplace.eventLogger.getEvents(0);
    let [tokens] = await marketplace.getTokens();
    isSubset(tokens, {
      tokenType: 3, contractAddress: mock1155.address, owner: owner,
      tokens: [{
        tokenId: "0",
        metadata_uri: 'http://localhost/',
        metadata: {},
        owners: {[user]: 1, [zero]: -1},
        events: [{from: zero, to: user, quantity: 1}]
      }],
    });

    await mock1155.changeUri('https://testnets-api.opensea.io/api/v1/metadata/0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656/55517153534380485272812148933649795490470480281686264073219081368668030894081', 0)
    await marketplace.eventLogger.getEvents();

    [tokens] = await marketplace.getTokens();
    isSubset(tokens, {
      tokenType: 3, contractAddress: mock1155.address, owner: owner,
      tokens: [{
        tokenId: "0",
        metadata_uri: 'https://testnets-api.opensea.io/api/v1/metadata/0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656/55517153534380485272812148933649795490470480281686264073219081368668030894081',
        metadata: {
          name: "ASDASD",
          description: null,
          image: "https://lh3.googleusercontent.com/3gprPV915eDyTjQoUIqF0dgC1Zo0jFEhNArt2FZ7EXhhGv_gPZpmHY2Y7xQnVSjwOX4ki46WkxWmb_F3_vKJ9LHLOJRa4XQqoKPP",
        },
        owners: {[user]: 1, [zero]: -1},
        events: [{from: zero, quantity: 1, to: user}]
      }],
    });

  });

});
