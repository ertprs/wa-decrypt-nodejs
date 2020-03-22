import crypto from 'crypto';
import hkdf from 'futoin-hkdf';
import atob from 'atob';
import * as rp from 'request-promise-native';

const timeout = (ms:number) => new Promise(res => setTimeout(res, ms));
export const mediaTypes = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  PTT: 'Audio',
  DOCUMENT: 'Document',
  STICKER: 'Image'
};

export const decryptMedia = async (message: any, useragentOverride?: string) => {
  const options = {
    url: message.clientUrl.trim(),
    encoding: null,
    simple: false,
    resolveWithFullResponse: true,
    headers: {
      'User-Agent': processUA(useragentOverride)
    }
  };
  let haventGottenImageYet = true;
  let res: any;
  while (haventGottenImageYet) {
    res = await rp.get(options);
    if (res.statusCode == 200) {
      haventGottenImageYet = false;
    } else {
      await timeout(2000);
    }
  }
  const buff = Buffer.from(res.body, 'utf8');
  const mediaDataBuffer = magix(buff, message.mediaKey, message.type);
  return mediaDataBuffer;
};

const processUA = (userAgent:string)=> {
  let ua = userAgent||'WhatsApp/2.16.352 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.88 Safari/537.36';
  if (!ua.includes('WhatsApp')) ua = "WhatsApp/2.16.352 "+ua;
  return ua;
}

const magix = (fileData: any, mediaKeyBase64: any, mediaType: any) => {
  var encodedHex = fileData.toString('hex');
  var encodedBytes = hexToBytes(encodedHex);
  var mediaKeyBytes: any = base64ToBytes(mediaKeyBase64);
  const info = `WhatsApp ${mediaTypes[mediaType.toUpperCase()]} Keys`;
  const hash: string = 'sha256';
  const salt: any = new Uint8Array(32);
  const expandedSize = 112;
  // @ts-ignore
  const mediaKeyExpanded = hkdf(mediaKeyBytes, expandedSize, {
    salt,
    info,
    hash
  });
  var iv = mediaKeyExpanded.slice(0, 16);
  var cipherKey = mediaKeyExpanded.slice(16, 48);
  encodedBytes = encodedBytes.slice(0, -10);
  var decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  //@ts-ignore
  var decoded: any = decipher.update(encodedBytes);
  const mediaDataBuffer = Buffer.from(decoded, 'utf-8');
  return mediaDataBuffer;
};

const hexToBytes = (hexStr: any) => {
  var intArray = [];
  for (var i = 0; i < hexStr.length; i += 2) {
    intArray.push(parseInt(hexStr.substr(i, 2), 16));
  }
  return new Uint8Array(intArray);
};

const base64ToBytes = (base64Str: any) => {
  var binaryStr = atob(base64Str);
  var byteArray = new Uint8Array(binaryStr.length);
  for (var i = 0; i < binaryStr.length; i++) {
    byteArray[i] = binaryStr.charCodeAt(i);
  }
  return byteArray;
};
