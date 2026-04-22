import { SignJWT, jwtVerify } from "jose";

// Güvenlik için, ortam değişkeninden alınan veya varsayılan rastgele bir JWT SECRET
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "TURUNC_ERP_SUPER_SECRET_KEY_12345"
);

export async function signJwt(payload: any, expiresIn: string = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string) {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload;
  } catch (error) {
    return null;
  }
}
