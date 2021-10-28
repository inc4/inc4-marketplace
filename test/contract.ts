import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {OrderFront, OrderPartFront, TokenType} from "../lib/types/common";

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;


describe("Contract", () => {
  let ownerS: Signer;
  let userS: Signer;
  let owner: string;
  let user: string;

  let mock20: Contract;
  let mock721: Contract;
  let contract: Contract;

  before(async () => {
    await deployments.fixture(["mocks", "marketplace"]);
    ({owner, user} = await getNamedAccounts());
    ownerS = await ethers.getSigner(owner);
    userS = await ethers.getSigner(user);

    mock20 = await ethers.getContract("mockERC20", ownerS);
    mock721 = await ethers.getContract("mockERC721", ownerS);

    contract = await ethers.getContract("marketplace", ownerS);
  });

  beforeEach(async () => {
    await deployments.fixture(["mocks", "marketplace"]); // reset contracts state


    await mock721.mint(owner);
    await mock20.mint(user, 200);

    await mock721.approve(contract.address, 0);
    await mock20.connect(userS).approve(contract.address, 200)
  });


  it('order', async () => {
    expect(await mock20.balanceOf(user)).eq(200);
    expect(await mock20.balanceOf(owner)).eq(0);
    expect(await mock721.ownerOf(0)).eq(owner);


    const order = new OrderFront(
      42,
      new OrderPartFront(TokenType.ERC721, mock721.address, 0, owner, 1, endtime(100)),
      new OrderPartFront(TokenType.ERC20, mock20.address, 0, user, 200, endtime(100)),
      Date.now()
    )
    order.setSignature(await ownerS.signMessage(order.toMessage()))

    await contract.connect(userS).acceptOrder(order.toCallData());

    expect(await mock20.balanceOf(user)).eq(0);
    expect(await mock20.balanceOf(owner)).eq(195);
    expect(await mock20.balanceOf(contract.address)).eq(5);
    expect(await mock721.ownerOf(0)).eq(user);

  });


  it('endtime', async () => {

    const order = new OrderFront(
      42,
      new OrderPartFront(TokenType.ERC721, mock721.address, 0, owner, 1, endtime(100)),
      new OrderPartFront(TokenType.ERC20, mock20.address, 0, user, 200, endtime(-5)),
      Date.now()
    )
    order.setSignature(await ownerS.signMessage(order.toMessage()))

    await expect(contract.connect(userS).acceptOrder(order.toCallData())).to.be.rejectedWith("Right order burn out");
  });

});

const endtime = (d: number) => {
  return Math.round(Date.now() / 1000) + d
}