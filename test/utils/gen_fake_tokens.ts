import {TokensCollection} from "../../lib/types/mongo";
import {ethers} from "ethers";
import {zero} from "./utils";
import {TokenType} from "../../lib/types/common";


randomCollection()


function randomCollection() {
  const tokens = [];
  for (let i=0; i<10; i++)
    tokens.push(randomToken())

  new TokensCollection({
    contractAddress: randomAddress(),
    tokenType: randomChoice([TokenType.ERC1155, TokenType.ERC721]),
    owner: randomAddress(),
    tokens: []
  }).save().then((r:any) => console.log(r));
}


function randomToken() {
  const tokenId = randomFrom0To(1000).toString();
  const quantity = randomFrom0To(100)
  const addr = randomAddress()

  return {
    tokenId: tokenId,
    metadata_uri: `http://localhost/${tokenId}`,
    metadata:
      {
        name: `${tokenId}Name`,
        description: `${tokenId}Description`,
        image: `http://localhost/${tokenId}`,
        media_url: `http://localhost/${tokenId}`,
        external_url: `http://localhost/${tokenId}`,
        background_color: `#boobaa`,
      },
    last_update: Math.round(Date.now() / 1000) + randomFrom0To(100),
    owners: {
      [zero]: -quantity,
      [addr]: quantity,
    },
    events: [
      {
        from: zero,
        to: addr,
        quantity: quantity,
        timestamp: Math.round(Date.now()/1000),
        txHash: randomHash(),
      }
    ],
  }
}

function randomAddress() {
  return "0x" + ethers.utils.keccak256(randomFrom0To(100000).toString()).toString().slice(0, 40)
}
function randomHash() {
  return "0x" + ethers.utils.keccak256(randomFrom0To(100000).toString()).toString().slice(0, 64)
}
function randomChoice(items: any[]) {
  return items[randomFrom0To(items.length)];
}
function randomFrom0To(value: number) {
  return Math.floor(Math.random() * value)
}
