import {deployments, ethers, getNamedAccounts} from "hardhat";
import type {Contract, Signer} from "ethers";
import chai from "chai";
import {Offer, TokenContract, TokenData, TokenOrderData, TokenType} from "../lib/types";
import {DatabaseMock} from "../lib/db_mock";
import {Marketplace} from "../lib/marketplace";

chai.should();
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

    await mock721.mint(owner);
    await mock721.approve(marketplace.contract.address, 0);
    mock20.mint(user, 20);
    mock20.connect(userS).approve(marketplace.contract.address, 20)
  });




  it('offer', async () => {

    expect(await mock20.balanceOf(user)).eq(20);
    expect(await mock20.balanceOf(owner)).eq(0);
    expect(await mock721.ownerOf(0)).eq(owner);

    const sellToken = new TokenData(TC721, 0n, owner, 100n);
    const buyToken = new TokenData(TC20, 0n, user, 200n);

    const sell = new TokenOrderData(sellToken, 10n, 0);
    const buy = new TokenOrderData(buyToken, 20n, 0);

    const offer = await new Offer(buy, sell).sign(userS);
    const offerId = await marketplace.makeOffer(offer)
    const offer2 = marketplace.getOffer(offerId);

    expect(offer).to.eq(offer2)

    await marketplace.contract.acceptOffer(offer.left.toOrderData(), offer.right.toOrderData(), offer.signature);

    expect(await mock20.balanceOf(user)).eq(0);
    expect(await mock20.balanceOf(owner)).eq(20);
    expect(await mock721.ownerOf(0)).eq(user);

  });

  it('sell', async () => {

    expect(await mock20.balanceOf(user)).eq(20);
    expect(await mock20.balanceOf(owner)).eq(0);
    expect(await mock721.ownerOf(0)).eq(owner);

    const sellToken = new TokenData(TC721, 0n, owner, 100n);
    const buyToken = new TokenData(TC20, 0n, user, 200n);

    const sell = new TokenOrderData(sellToken, 10n, 0);
    const buy = new TokenOrderData(buyToken, 20n, 0);

    const offer = await (new Offer(sell, buy)).sign(ownerS);
    const offerId = await marketplace.makeOffer(offer)
    const offer2 = marketplace.getOffer(offerId);

    expect(offer).to.eq(offer2)

    await marketplace.contract.connect(userS).acceptOffer(offer.left.toOrderData(), offer.right.toOrderData(), offer.signature);

    expect(await mock20.balanceOf(user)).eq(0);
    expect(await mock20.balanceOf(owner)).eq(20);
    expect(await mock721.ownerOf(0)).eq(user);

  });

});
