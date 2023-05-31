const mongoose = require("mongoose");
const { Schema } = mongoose;

const Notification = new Schema({
  id: { type: String },
  createdAt: { type: Date, default: Date.now() },
  title: { type: String },
  content: { type: String },
});

const User = new Schema({
  id: { type: String, require: true },
  userFullName: { type: String, default: "unknown" },
  gender: { type: String, default: "unknown" },
  isPro: { type: Boolean, default: false }, //false
  loginHistory: { type: Array, default: [] },
  geometry: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" },
  },
  address: { type: String, default: "unknown" },
  userEmail: {
    Email: { type: String, default: "" },
    isVerified: { type: Boolean, Default: false },
    tries: [
      {
        EmailTried: { type: String },
        DateTry: { type: String },
      },
    ],
    dateOfVerification: { type: Date },
  },
  userPhoneNumber: {
    Number: { type: String, default: "" },
    isVerified: { type: Boolean, Default: false },
    tries: [
      {
        PhoneTried: { type: String },
        DateTry: { type: String },
      },
    ],
    dateOfVerification: { type: Date },
  },
  notifications: { type: [Notification], default: [] },
  Otp: { type: String, Default: "" },
  DOB: { type: String, default: Date.now().toString() },
  creationDate: { type: Date, default: Date.now() },
  Selfie: { type: String, default: "" },
  Photos: { type: Array, default: [] },
  Status: { type: String, default: "Normal" },
  Languages: { type: Array, default: [] },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
});

const UserModel = mongoose.model("User", User);
module.exports = UserModel;
