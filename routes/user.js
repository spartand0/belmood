const User = require("express").Router();
const {
  createAccount,
  AuthUser,
  viewProfile,
  sendOtp,
  editProfile,
  verifyOtp,
  createAccountverifyOtp,
  completeAccount,
  recoverAccount,
  confirmRecover,
  NewPhone,
} = require("../controllers/User.controller");
const { isUser } = require("../middlewares/User/isUser");

const use = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// AUTH
User.post("/login", use(AuthUser), use(createAccount));
User.post("/updateAccount", use(isUser), use(completeAccount));
User.post("/verifyOtp", use(isUser), use(verifyOtp));
User.post("/sendOtp", use(sendOtp));
User.post("/recoverAccount", use(recoverAccount));
User.post("/confirmRecover", use(confirmRecover));
User.post("/newPhone", use(isUser), use(NewPhone));
// Edit user
User.post("/editProfile", use(isUser), use(editProfile));

// GET

User.get("/viewProfile", use(isUser), use(viewProfile));

module.exports = User;
