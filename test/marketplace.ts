import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import chai from "chai";
import {Marketplace} from "../lib/marketplace";
import chaiAsPromised from "chai-as-promised";
import {OrderFront, OrderPartFront, TokenType} from "../lib/types/common";
import amongus from "mongoose";
import {Order, TokensCollection} from "../lib/types/mongo";

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;


describe("Marketplace", () => {
  let ownerS: Signer;
  let userS: Signer;
  let owner: string;
  let user: string;

  let mock20: Contract;
  let mock721: Contract;

  let marketplace: Marketplace;


  before(async () => {
    await deployments.fixture(["mocks", "marketplace"]);
    ({owner, user} = await getNamedAccounts());
    ownerS = await ethers.getSigner(owner);
    userS = await ethers.getSigner(user);

    mock20 = await ethers.getContract("mockERC20", ownerS);
    mock721 = await ethers.getContract("mockERC721", ownerS);

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

    await marketplace.eventLogger.getEvents('earliest');

    // create order

    let [tokens721] = await marketplace.getTokens();
    let tokens721_without_garbage = JSON.parse(JSON.stringify(tokens721));
    expect(tokens721_without_garbage).deep.includes({
      tokenType: 2, contractAddress: mock721.address, owner: owner,
      tokens: [{tokenId: "0", owners: {[owner]: 1}}],
    });


    const order = new OrderFront(
      new OrderPartFront(TokenType.ERC721, tokens721.contractAddress, tokens721.tokens[0].tokenId, owner, 1, endtime(100)),
      new OrderPartFront(TokenType.ERC20, mock20.address, "0", user, 200, endtime(100)),
      Date.now()
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

    [tokens721] = await marketplace.getTokens();
    tokens721_without_garbage = JSON.parse(JSON.stringify(tokens721));
    expect(tokens721_without_garbage).deep.includes({
      tokenType: 2, contractAddress: mock721.address, owner: owner,
      tokens: [{tokenId: "0", owners: {[owner]: 0, [user]: 1}}],
    });

  });

});

const endtime = (d: number) => {
  return Math.round(Date.now() / 1000) + d
}
