import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import chai from "chai";
import {Marketplace} from "../lib/marketplace";
import chaiAsPromised from "chai-as-promised";
import fetch from "node-fetch";
import {OrderFront, OrderPartFront, TokenType} from "../lib/types/common";
import {EventLogger} from "../lib/event_logger";
import amongus from "mongoose";
import {Order, TokenContract} from "../lib/types/mongo";
import {start} from "../lib/api";

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;


describe("Api", function() {
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

    this.timeout(50000);


  });

  beforeEach(async () => {
    await deployments.fixture(["mocks", "marketplace"]); // reset contracts state
    marketplace.contract.provider.removeAllListeners()
    await TokenContract.deleteMany({});
    await Order.deleteMany({});
  });


  it('order', async () => {

    await mock721.mint(owner);
    await mock20.mint(user, 200);
    await mock721.approve(marketplace.contract.address, 0);
    await mock20.connect(userS).approve(marketplace.contract.address, 200)

    const el = new EventLogger(marketplace);
    await el.events()

    await start(marketplace);
    const url = "http://localhost:8080"

    await sleep(5000);


    // create order

    let [tokens721, tokens20] = await (await fetch(url + '/tokens')).json();

    expect(tokens721.tokens.length).eq(1);
    expect(tokens721.tokens[0]).includes({tokenId: 0, owner: owner, quantity: 1});
    expect(tokens20.tokens.length).eq(1);
    expect(tokens20.tokens[0]).includes({tokenId: 0, owner: user, quantity: 200});


    const order1 = new OrderFront(
      42,
      new OrderPartFront(TokenType.ERC721, tokens721.address, tokens721.tokens[0].tokenId, owner, 1, endtime(100)),
      new OrderPartFront(TokenType.ERC20, tokens20.address, 0, user, 200, endtime(100)),
      Date.now()
    )
    order1.setSignature(await ownerS.signMessage(order1.toMessage()))

    await fetch(url + '/orders', {method: "POST", body: JSON.stringify(order1), headers: {'Content-Type': 'application/json'}});


    // accept order

    const [orderJson] = await (await fetch(url + '/orders')).json()
    const order2 = OrderFront.fromJson(orderJson);

    // frontend will check it before transaction
    await marketplace.checkApprove(order2.right);

    await marketplace.contract.connect(userS).acceptOrder(order2.toCallData());



  });

});

const endtime = (d: number) => {
  return Math.round(Date.now() / 1000) + d
}

function sleep(t: number): Promise<void> {
  return new Promise(r => setTimeout(r, t))
}
