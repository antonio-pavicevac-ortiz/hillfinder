import crypto from "crypto";
import { Schema, model, models } from "mongoose";

// JWT sessions live in cookies, so deleting an account can't reach tokens on other
// devices. This record lets the jwt callback reject any token issued before deletion.
// It stores only a hash of the email and expires once every old token would have.
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const AccountDeletionSchema = new Schema({
  emailHash: { type: String, required: true, unique: true },
  deletedAt: { type: Date, required: true, expires: SESSION_MAX_AGE_SECONDS },
});

const AccountDeletion =
  models.AccountDeletion || model("AccountDeletion", AccountDeletionSchema);

export function hashEmail(email: string) {
  return crypto
    .createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

export default AccountDeletion;
