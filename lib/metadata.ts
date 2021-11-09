import pinataSDK from '@pinata/sdk';
import * as dotenv from "dotenv";
import {ReadStream} from "fs";

dotenv.config();

if (!process.env.PINATA_KEY) throw "No PINATA_KEY env var"
if (!process.env.PINATA_SECRET) throw "No PINATA_SECRET env var"

const pinata = pinataSDK(process.env.PINATA_KEY, process.env.PINATA_SECRET);
pinata.testAuthentication().catch(err => {
  throw "Pinata auth error" + err
});


type Data = {
  name: string
  description: string
  external_url: string
  image: ReadStream
  animation_url: ReadStream
}

async function upload(data: Data): Promise<string> {
  const metadata = {
    name: data.name,
    description: data.description,
    external_url: data.external_url,
    image: uploadMedia(data.image),
    animation_url: uploadMedia(data.animation_url),
  }
  return (await pinata.pinJSONToIPFS(metadata, {})).IpfsHash;
}

async function uploadMedia(stream: ReadStream): Promise<string> {
  return (await pinata.pinFileToIPFS(stream, {})).IpfsHash;
}
