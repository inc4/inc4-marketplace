import chai from "chai";
import chaiAsPromised from "chai-as-promised";


chai.should();
chai.use(chaiAsPromised);
export const expect = chai.expect;


export const zero = "0x0000000000000000000000000000000000000000"


export const endtime = (d: number) => {
  return Math.round(Date.now() / 1000) + d
}

export function isSubset(haystak: any, neeedle: any) {
  haystak = JSON.parse(JSON.stringify(haystak));
  _normalizeHaystack(haystak, neeedle);
  expect(haystak).deep.eq(neeedle);
}

function _normalizeHaystack(haystak: any, needle: any) {
  if (haystak && typeof haystak === 'object')
    for (let key of Object.keys(haystak))
      if (needle[key] === undefined) delete haystak[key]
      else _normalizeHaystack(haystak[key], needle[key])
}
