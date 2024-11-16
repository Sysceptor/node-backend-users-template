import { IPinfoWrapper } from "node-ipinfo";

const { IPINFO_TOKEN } = process.env;

const ipinfo = new IPinfoWrapper(IPINFO_TOKEN);

async function fetchIpInfo(ip, ASN) {
  if (ip) {
    try {
      // Lookup IP info
      const ipResponse = await ipinfo.lookupIp(ip);
      console.log(ipResponse);
    } catch (error) {
      console.error("Error fetching IP info:", error);
    }
  }

  if (ASN) {
    try {
      // Lookup ASN info
      const asnResponse = await ipinfo.lookupASN(ASN);
      console.log(asnResponse);
    } catch (error) {
      console.error("Error fetching ASN info:", error);
    }
  }

}

export default fetchIpInfo;