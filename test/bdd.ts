import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import chai from "chai";
import {Offer, TokenContract, OrderPart, TokenType} from "../lib/types";
import {DatabaseMock} from "../lib/db_mock";
import {Marketplace} from "../lib/marketplace";
import {EventLogger} from "../lib/event_logger";
import chaiAsPromised from "chai-as-promised";

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;


describe("Bdd", () => {
  let ownerS: Signer;
  let userS: Signer;
  let owner: string;
  let user: string;

  let mock20: Contract;
  let mock721: Contract;
  let TC20: TokenContract;
  let TC721: TokenContract;

  let marketplace: Marketplace;


  before(async () => {
    await deployments.fixture(["mocks", "marketplace"]);
    ({owner, user} = await getNamedAccounts());
    ownerS = await ethers.getSigner(owner);
    userS = await ethers.getSigner(user);

    mock20 = await ethers.getContract("mockERC20", ownerS);
    mock721 = await ethers.getContract("mockERC721", ownerS);

    TC20 = new TokenContract(TokenType.ERC20, mock20.address, "")
    TC721 = new TokenContract(TokenType.ERC721, mock721.address, "name")

    const marketplaceContract = await ethers.getContract("marketplace", ownerS);
    marketplace = new Marketplace(marketplaceContract, new DatabaseMock());

  });

  beforeEach(async () => {
    await deployments.fixture(["mocks", "marketplace"]); // reset contracts state
    marketplace.contract.provider.removeAllListeners()
  });


  it('offer', async () => {

    await mock721.mint(owner);
    await mock20.mint(user, 200);

    const el = new EventLogger(marketplace);
    await el.events()

    const [token721, token20] = Object.values(marketplace.db.tokens);
    // owner of 721 = owner;   owner of 20 = user

    expect(await mock20.balanceOf(user)).eq(200);
    expect(await mock20.balanceOf(owner)).eq(0);
    expect(await mock721.ownerOf(0)).eq(owner);

    const sell = new OrderPart(token721, 10n, endtime(50));
    const buy = new OrderPart(token20, 200n, endtime(50));

    console.log(buy)

    const offer = await new Offer(buy, sell).sign(userS);

    await marketplace.makeOffer(offer).should.be.rejected;
    await mock721.approve(marketplace.contract.address, 0);
    await mock20.connect(userS).approve(marketplace.contract.address, 200)


    const offerId = await marketplace.makeOffer(offer)

    const offer2 = marketplace.getOffer(offerId);
    expect(offer).to.eq(offer2)


    // frontend will check it before transaction
    await marketplace.checkApprove(offer.right);

    await marketplace.contract.acceptOrder(offer.toCallData());

    expect(await mock20.balanceOf(user)).eq(0);
    expect(await mock20.balanceOf(owner)).eq(195);
    expect(await mock20.balanceOf(marketplace.contract.address)).eq(5);
    expect(await mock721.ownerOf(0)).eq(user);

    // todo update tokens in db; check db
    await new Promise((r) => {setTimeout(r, 5000)})



  });



  it('endtime', async () => {

    await mock721.mint(owner);
    await mock20.mint(user, 20);

    const el = new EventLogger(marketplace);
    await el.events()

    const [token721, token20] = Object.values(marketplace.db.tokens);
    // owner of 721 = owner;   owner of 20 = user

    const sell = new OrderPart(token721, 10n, endtime(-5));
    const buy = new OrderPart(token20, 20n, endtime(50));
    await mock721.approve(marketplace.contract.address, 0);
    await mock20.connect(userS).approve(marketplace.contract.address, 20)

    const offer = await new Offer(buy, sell).sign(userS);
    await marketplace.makeOffer(offer)

    await expect(marketplace.contract.acceptOrder(offer.toCallData())).to.be.rejectedWith("Right order burn out");


  });

});

const endtime = (d: number) => {return Math.round(Date.now()/1000) + d}
