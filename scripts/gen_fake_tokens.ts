import {TokensCollection, Tokens} from "../lib/types/mongo";
import {ethers} from "ethers";
import {zero} from "../test/utils/utils";
import {TokenType} from "../lib/types/common";
import amongus from "mongoose";

amongus.connect('mongodb://root:example@localhost:27017/admin');


generateFakeData(2);


function generateFakeData(tokensAmount: number) {
  let collectionObjId;
  new TokensCollection({
    contractAddress: randomAddress(),
    tokenType: randomChoice([TokenType.ERC1155, TokenType.ERC721]),
    owner: randomAddress(),
  }).save().then((r:any) => {
    collectionObjId = r._id
    const tokens = [];
    for (let i=0; i<tokensAmount; i++)
      tokens.push(randomToken(collectionObjId));
    console.log(collectionObjId);

    tokens.forEach(value => {
      new Tokens(value).save();
    });
  });
}


function randomToken(collectionObjId: any) {
  const tokenId = randomFrom0To(1000).toString();
  const quantity = randomFrom0To(100);
  const addr = randomAddress();

  return {
    collectionObjectId: collectionObjId,
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
  return randomHash().slice(0, 42)
}

function randomHash() {
  return ethers.utils.hashMessage(randomFrom0To(100000).toString())
}

function randomChoice(items: any[]) {
  return items[randomFrom0To(items.length)];
}

function randomFrom0To(value: number) {
  return Math.floor(Math.random() * value)
}
