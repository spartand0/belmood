const mongoose = require("mongoose");
const { Schema } = mongoose;

const Logs = new Schema({
  id: { type: String, require: true },
  userID: { type: String },
  userType: { type: String },
  response: { type: {} },
});

const LogsModel = mongoose.model("Logs", Logs);
module.exports = LogsModel;
