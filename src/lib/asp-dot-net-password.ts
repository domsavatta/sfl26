import crypto from 'crypto';

const encode = (salt: string, octets: string) => {
  const hexChar = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
  ];
  const prehash = `00${salt}${octets}`;
  let result = '';
  for (let i = 0; i < prehash.length; i++) {
    result += `${hexChar[hexChar.indexOf(prehash[i])]}`;
  }
  const buff = Buffer.from(result, 'hex');
  return Buffer.from(buff).toString('base64').toString();
};

const saltMaker = () => {
  let text = '';
  const possible = 'ABCDEF0123456789';
  for (let i = 0; i < 32; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

export function hash(password: string) {
  const salt = saltMaker();
  const nodeCrypto = crypto.pbkdf2Sync(
    Buffer.from(password),
    Buffer.from(salt, 'hex'),
    1000,
    256,
    'sha1',
  );
  const octets = nodeCrypto.toString('hex').toUpperCase().substring(0, 64);
  return encode(salt, octets);
}

export function validate(password: string, hashedPwd: string) {
  if (!hashedPwd || hashedPwd === 'undefined') {
    return false;
  }
  const hashedPasswordBytes = Buffer.from(hashedPwd, 'base64');
  const hexChar = [
    '0',
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
    '7',
    '8',
    '9',
    'A',
    'B',
    'C',
    'D',
    'E',
    'F',
  ];
  let saltString = '';
  let storedSubKeyString = '';
  for (let i = 0; i < hashedPasswordBytes.length; i++) {
    if (i <= 16 && i > 0) {
      saltString +=
        hexChar[(hashedPasswordBytes[i] >> 4) & 0x0f] +
        hexChar[hashedPasswordBytes[i] & 0x0f];
    }
    if (i > 16) {
      storedSubKeyString +=
        hexChar[(hashedPasswordBytes[i] >> 4) & 0x0f] +
        hexChar[hashedPasswordBytes[i] & 0x0f];
    }
  }

  const nodeCrypto = crypto.pbkdf2Sync(
    Buffer.from(password),
    Buffer.from(saltString, 'hex'),
    1000,
    256,
    'sha1',
  );
  const derivedKeyOctets = nodeCrypto.toString('hex').toUpperCase();
  if (derivedKeyOctets.indexOf(storedSubKeyString) === 0) {
    return true;
  } else {
    return false;
  }
}
