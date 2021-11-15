import chai from "chai";
import chaiAsPromised from "chai-as-promised";


chai.should();
chai.use(chaiAsPromised);
export const expect = chai.expect;


export const zero = "0x0000000000000000000000000000000000000000"


export const endtime = (d: number) => {
  return Math.round(Date.now() / 1000) + d
}

export function isSubset (haystak: any, neeedle: any) {
  haystak = JSON.parse(JSON.stringify(haystak));
  neeedle = JSON.parse(JSON.stringify(neeedle));
  _isSubset(haystak, neeedle);
}

function _isSubset (haystak: any, neeedle: any, path: string = "given") {
  for (let [k, v] of Object.entries(neeedle)) {
    if (v && typeof v === 'object') _isSubset(haystak[k], v, `${path}.${k}`);
    else expect(haystak[k]).eq(v, `${JSON.stringify(haystak, undefined, 2)} ${path}.${k}`)
  }
}
