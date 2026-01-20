import crypto from "crypto"

export const generateToken = async () => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(token).digest("hex");

  return {
    plainToken: token,
    tokenHash: hashed
  };

};
