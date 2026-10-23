const crypto = require("crypto");
const jwt = require("jsonwebtoken");

/**
 * 2FA Utility Helpers
 * Supports:
 * 1. Email OTP (6-digit cryptographically secure code, default)
 * 2. RFC 6238 TOTP (Google Authenticator / Authy / Microsoft Authenticator)
 * 3. 2FA Temporary Login Tokens (10-minute JWT for 2FA session)
 * 4. Backup Emergency Codes
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Generate 6-digit numeric OTP for Email 2FA (Default)
 */
function generateEmailOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash an OTP for secure database storage
 */
function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

/**
 * Compare plain OTP with hashed OTP
 */
function verifyHashedOtp(plainOtp, hashedOtp) {
  if (!plainOtp || !hashedOtp) return false;
  const hash = hashOtp(plainOtp);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedOtp));
}

/**
 * Generate Base32 Secret for TOTP Authenticator Apps
 */
function generateTotpSecret(length = 20) {
  const bytes = crypto.randomBytes(length);
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_ALPHABET[bytes[i] % 32];
  }
  return result;
}

/**
 * Decode Base32 string to Buffer
 */
function decodeBase32(str) {
  const cleanStr = str.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/**
 * Generate TOTP code for a given timestamp and secret
 */
function generateTotpCode(secret, timestamp = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(timestamp / 1000 / step);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const key = decodeBase32(secret);
  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

/**
 * Verify TOTP code with time-step drift tolerance (accepts +/- 1 step = 90s window)
 */
function verifyTotpCode(code, secret, step = 30, window = 1) {
  if (!code || !secret) return false;
  const now = Date.now();
  const cleanCode = String(code).trim();

  for (let i = -window; i <= window; i++) {
    const checkTime = now + i * step * 1000;
    const generated = generateTotpCode(secret, checkTime, step);
    if (generated === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Generate OTPAuth URL for QR Code scanner in Authenticator App
 */
function generateOtpAuthUrl(secret, userEmail, issuer = "Smart Youth ICT") {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(userEmail);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate 8-character alphanumeric backup emergency codes
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/**
 * Mask an email for security display (e.g. t***@gmail.com)
 */
function maskEmail(email = "") {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
}

/**
 * Generate a temporary 2FA session token (expires in 10 minutes)
 */
function generate2FATempToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      purpose: "2fa_verification",
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
}

/**
 * Verify 2FA temporary session token
 */
function verify2FATempToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== "2fa_verification") return null;
    return decoded;
  } catch {
    return null;
  }
}

module.exports = {
  generateEmailOtp,
  hashOtp,
  verifyHashedOtp,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateOtpAuthUrl,
  generateBackupCodes,
  maskEmail,
  generate2FATempToken,
  verify2FATempToken,
};
