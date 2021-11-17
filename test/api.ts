import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import {Marketplace} from "../lib/marketplace";
import amongus from "mongoose";
import {Order, TokensCollection} from "../lib/types/mongo";
import {endtime, expect, isSubset, zero} from "./utils/utils";
import {start} from "../lib/api/api";
import fetch from "node-fetch";
import {OrderFront, OrderPartFront, TokenType} from "../lib/types/common";


describe("Api", function () {
  let ownerS: Signer;
  let userS: Signer;
  let owner: string;
  let user: string;

  let mock20: Contract;
  let mock1155: Contract;

  let marketplace: Marketplace;


  before(async () => {
    await deployments.fixture(["mocks", "marketplace", "nft"]);  // reset contracts to not receive their logs
    ({owner, user} = await getNamedAccounts());
    ownerS = await ethers.getSigner(owner);
    userS = await ethers.getSigner(user);

    mock20 = await ethers.getContract("mockERC20", ownerS);
    mock1155 = await ethers.getContract("nftPublic", ownerS);

    const marketplaceContract = await ethers.getContract("marketplace", ownerS);
    marketplace = new Marketplace(marketplaceContract);

    await amongus.connect('mongodb://root:example@localhost:27017/admin');

  });

  beforeEach(async () => {
    await deployments.fixture(["mocks", "marketplace"]); // reset contracts state
    marketplace.eventLogger.removeListeners()
    await TokensCollection.deleteMany({});
    await Order.deleteMany({});
  });


  it('order', async () => {

    await mock1155.mint(2, "https://testnets-api.opensea.io/api/v1/metadata/0x88B48F654c30e99bc2e4A1559b4Dcf1aD93FA656/55517153534380485272812148933649795490470480281686264073219081368668030894081");
    await mock20.mint(user, 200);
    await mock1155.connect(userS).setApprovalForAll(marketplace.contract.address, true);
    await mock20.connect(userS).approve(marketplace.contract.address, 200)

    await marketplace.eventLogger.getEvents(0);

    await start(marketplace);

    // create order

    let res = await request('{ tokensCollection { contractAddress tokenType tokens {tokenId metadata { name } } } }')
    isSubset(res.data, {
      tokensCollection: [{
        tokenType: 3, contractAddress: mock1155.address,
        tokens: [{
          tokenId: "0",
          metadata: {name: "ASDASD"},
        }]
      }]
    });

    const tokens1155 = res.data.tokensCollection[0]

    const order1 = new OrderFront(
      new OrderPartFront(tokens1155.tokenType, tokens1155.contractAddress, tokens1155.tokens[0].tokenId, owner, 1, endtime(100)),
      new OrderPartFront(TokenType.ERC20, mock20.address, "0", user, 200, endtime(100)),
      endtime(0)
    )
    order1.setSignature(await ownerS.signMessage(order1.toMessage()))


    const order1Json = JSON.stringify(order1).replaceAll('"', '\\"')
    res = await request(`mutation { createOrder(order: "${order1Json}") }`)
    expect(res).to.deep.eq({ data: { createOrder: true } })


    // accept order

    res = await request(`{ orders { signature createTime
       left { tokenType contractAddress tokenId user quantity endTime }
       right { tokenType contractAddress tokenId user quantity endTime } }}`)
    const order2 = OrderFront.fromJson(res.data.orders[0]);

    // frontend will check it before transaction
    expect(await marketplace.checkApprove(order2.right)).to.be.true;

    await marketplace.contract.connect(userS).acceptOrder(order2.toCallData());
  });

});

async function request(query: string): Promise<any> {
  const res = await fetch('http://localhost:8080/graphql', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({query})
  });
  return await res.json();
}
