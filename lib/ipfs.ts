import pinataSDK from '@pinata/sdk';
import * as dotenv from "dotenv";
import {ReadStream} from "fs";
import {IpfsQueue} from "./types/mongo";

dotenv.config();

if (!process.env.PINATA_KEY) throw "No PINATA_KEY env var"
if (!process.env.PINATA_SECRET) throw "No PINATA_SECRET env var"


const TIME_TO_UNPIN = 12*60*60 // 12 hours

const pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);
pinata.testAuthentication().catch(err => {
  throw "Pinata auth error" + err
});


type Data = {
  name: string
  description?: string
  external_url?: string
  image: ReadStream
  animation_url?: ReadStream
}


export function startUnpinOld(timeout: number) {
  setInterval(unpinOld, timeout);
}


export async function upload(data: Data): Promise<string> {
  const cid = await uploadMetadata(data);

  const createTime = Date.now() / 1000;
  await new IpfsQueue({cid, createTime}).save()
  return cid
}

export async function removeFromQueue(cid: string): Promise<void> {
  await IpfsQueue.remove({cid}).exec();
}

export async function unpin(cid: string): Promise<void> {
  await pinata.unpin(cid.replace("ipfs://", ""))
  await removeFromQueue(cid);
}


async function unpinOld(): Promise<void> {
  const createTimeLt = Date.now() / 1000 - TIME_TO_UNPIN;
  const olds = await IpfsQueue.find({createTime: {$lt: createTimeLt}}).exec();
  await Promise.all(olds.map((doc) => unpin(doc.cid)));
}


async function uploadMetadata(data: Data): Promise<string> {
  const metadata = {
    name: data.name,
    description: data.description,
    external_url: data.external_url,
    image: await uploadMedia(data.image),
    animation_url: data.animation_url ? await uploadMedia(data.animation_url) : ""
  };

  return "ipfs://" + (await pinata.pinJSONToIPFS(metadata, {})).IpfsHash;
}

async function uploadMedia(stream: ReadStream): Promise<string> {
  return "ipfs://" + (await pinata.pinFileToIPFS(stream, {})).IpfsHash;
}
