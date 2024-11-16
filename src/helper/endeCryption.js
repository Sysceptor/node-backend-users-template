import crypto from 'crypto';

const { SECRET_KEY } = process.env;
const algorithm = 'aes-256-ctr';
const IV_LENGTH = 16; // 16 bytes for AES-256-CTR

// Encryption function
export function encrypt(text) {
    // Generate random IV (16 bytes)
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(SECRET_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Return IV (hex) + encrypted text (base64)
    return iv.toString('hex') + ':' + encrypted.toString('base64');
}

// Decryption function
export function decrypt(text) {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex'); // Extract IV
    const encryptedText = Buffer.from(textParts.join(':'), 'base64'); // Decode base64-encrypted data
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(SECRET_KEY, 'hex'), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Test encryption and decryption
const encryptedText = encrypt('123 Main Street');
console.log('Encrypted:', encryptedText);

const decryptedText = decrypt(encryptedText);
console.log('Decrypted:', decryptedText);
