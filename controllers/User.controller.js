const UserModel = require("../models/User/User");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const TWILIO_SID = "AC1489930692bbb32de13907e645a74c00";
const TWILIO_TOKEN = "6895002157f1991ca5296fcdfddbeaa9";
const twilio = require("twilio")(TWILIO_SID, TWILIO_TOKEN);
const AWS = require("aws-sdk");

AWS.config.update({
  accessKeyId: "YOUR_ACCESS_KEY_ID",
  secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
  region: "eu-west-3", // Replace with the appropriate AWS region
});

// .----------------.  .----------------.  .----------------.  .----------------.
// | .--------------. || .--------------. || .--------------. || .--------------. |
// | |      __      | || | _____  _____ | || |  _________   | || |  ____  ____  | |
// | |     /  \     | || ||_   _||_   _|| || | |  _   _  |  | || | |_   ||   _| | |
// | |    / /\ \    | || |  | |    | |  | || | |_/ | | \_|  | || |   | |__| |   | |
// | |   / ____ \   | || |  | '    ' |  | || |     | |      | || |   |  __  |   | |
// | | _/ /    \ \_ | || |   \ `--' /   | || |    _| |_     | || |  _| |  | |_  | |
// | ||____|  |____|| || |    `.__.'    | || |   |_____|    | || | |____||____| | |
// | |              | || |              | || |              | || |              | |
// | '--------------' || '--------------' || '--------------' || '--------------' |
//  '----------------'  '----------------'  '----------------'  '----------------'

exports.createAccount = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const foundUser = await UserModel.findOne({ "userPhoneNumber.Number": phoneNumber });
    if (foundUser) {
      return res.status(404).send({
        message: "This phone number exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }

    const OTP = Math.floor(
      Math.pow(10, 6 - 1) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 6 - 1) - 1)
    );
    const user = new UserModel({
      id: uuidv4(),
      "userPhoneNumber.Number": phoneNumber || "",
    });
    user.Otp = OTP;
    const attempt = {
      PhoneTried: phoneNumber,
      DateTry: Date.now(),
    };
    user.userPhoneNumber.tries.push(attempt);
    user.save();
    res.status(200).send({
      code: 200,
      success: true,
      date: Date.now(),
      message: `Please enter the verification code received. code is : ${OTP}. code is : ${OTP}`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from createAccount endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.createAccountverifyOtp = async (req, res) => {
  try {
    const { otp, phoneNumber } = req.body;
    if (!otp) {
      return res.status(404).send({
        message: "OTP missing",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundUser = await UserModel.findOne({ "userPhoneNumber.Number": phoneNumber });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundUser.Otp === otp) {
      foundUser.Otp = "";
      foundUser.userPhoneNumber.isVerified = true;
      foundUser.userPhoneNumber.dateOfVerification = Date.now();
      const token = jwt.sign(
        {
          id: foundUser.id,
          phoneNumber,
          isPro: foundUser.isPro,
        },
        process.env.SECRET_KEY,
        {
          expiresIn: "30d",
        }
      );
      foundUser.save();
      res.cookie("x-belmood-token", token);

      return res.status(200).send({
        message: "Phone number verified",
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else {
      return res.status(406).send({
        message: "Invalid OTP",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from verifyOtp endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.completeAccount = async (req, res) => {
  try {
    const token = req["cookies"]["x-belmood-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const { userFullName, email, DOB, gender, Photos, Languages } = req.body;
    const foundUser = await UserModel.findOne({
      id: user.id,
    });
    if (!foundUser) {
      return res.status(400).send({
        message: "We cannot find user with this number !",
        code: 400,
        success: false,
        date: Date.now(),
      });
    }
    (foundUser.userFullName = userFullName),
      (foundUser.userEmail.Email = email || ""),
      (foundUser.gender = gender || foundUser.gender);
    foundUser.Photos = Photos || [""];
    foundUser.DOB = DOB || "";
    foundUser.Languages = Languages || [""];
    await foundUser.save();
    res.cookie("x-belmood-token", token);
    return res.status(200).send({
      message: "User created successfuly",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        "This error is coming from completeAccount endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const foundUser = await UserModel.findOne({ "userPhoneNumber.Number": phoneNumber });
    if (!foundUser) {
      return res.status(404).send({
        message: "This user dosent exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }
    const OTP = Math.floor(
      Math.pow(10, 6 - 1) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 6 - 1) - 1)
    );
    foundUser.Otp = OTP;
    const attempt = {
      PhoneTried: phoneNumber,
      DateTry: Date.now(),
    };
    foundUser.userPhoneNumber.tries.push(attempt);
    foundUser.save();
    const body = `Your Belmood code: ${OTP}`;
    const { status } = await twilio.messages.create({
      body,
      messagingServiceSid: "MGeed693cf748892254982edb50e1ff5ff",
      to: `${phoneNumber}`,
    });
    res.status(200).send({
      code: 200,
      success: true,
      date: Date.now(),
      message: `Please enter the verification code received. code is : ${OTP}`,
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from sendOtp endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
exports.AuthUser = async (req, res, next) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber) {
      return res.status(400).send({
        message: "Please provide a valid user !",
        code: 400,
        requestDate: Date.now(),
        success: false,
      });
    }
    const foundUser = await UserModel.findOne({ "userPhoneNumber.Number": phoneNumber });
    if (!foundUser) {
      return next();
    }
    //if error than throw error
    if (!otp && foundUser) {
      const OTP = Math.floor(
        Math.pow(10, 6 - 1) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 6 - 1) - 1)
      );
      foundUser.Otp = OTP;
      const attempt = {
        PhoneTried: phoneNumber,
        DateTry: Date.now(),
      };
      foundUser.userPhoneNumber.tries.push(attempt);
      foundUser.save();
      const body = `Your Belmood code: ${OTP}`;
      // const { status } = await twilio.messages.create({
      //   body,
      //   messagingServiceSid: "MGeed693cf748892254982edb50e1ff5ff",
      //   to: `${phoneNumber}`,
      // });
      return res.status(200).send({
        code: 200,
        success: true,
        date: Date.now(),
        message: `Please enter the verification code received. code is : ${OTP}`,
      });
    }
    if (foundUser.Otp === otp) {
      foundUser.Otp = "";
      foundUser.loginHistory.push({
        date: Date.now(),
        device: req.headers["user-agent"],
        ip: req.ip,
        success: true,
      });
      const token = jwt.sign(
        {
          id: foundUser.id,
          phoneNumber,
          isPro: foundUser.isPro,
        },
        process.env.SECRET_KEY,
        {
          expiresIn: "1d",
        }
      );
      const refreshToken = jwt.sign(
        {
          id: foundUser.id,
        },
        process.env.SECRET_KEY,
        {
          expiresIn: "365d",
        }
      );
      foundUser.save();
      res.cookie("x-belmood-token", token);
      res.cookie("x-belmood-refresh-token", refreshToken);
      return res.status(200).json({ message: "Login success", code: 200, success: true });
    } else {
      foundUser.loginHistory.push({
        date: Date.now(),
        device: req.headers["user-agent"],
        ip: req.ip,
        success: false,
      });
      await foundUser.save();
      return res.status(401).json({ message: "Invalid credencial", code: 401, success: false });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send({
      message:
        "This error is coming from AuthUser endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const token = req["cookies"]["x-belmood-token"];
    const { otp } = req.body;
    if (!otp) {
      return res.status(404).send({
        message: "OTP missing",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const user = jwt.verify(token, process.env.process.env.SECRET_KEY);
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundUser.Otp === otp) {
      foundUser.Otp = "";
      foundUser.userPhoneNumber.isVerified = true;
      foundUser.userPhoneNumber.dateOfVerification = Date.now();
      foundUser.save();
      return res.status(200).send({
        message: "Phone number verified",
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else {
      return res.status(406).send({
        message: "Invalid OTP",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from verifyOtp endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.recoverAccount = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(404).send({
        message: "Email missing",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundUser = await UserModel.findOne({ "userEmail.Email": email });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundUser) {
      const OTP = Math.floor(
        Math.pow(10, 6 - 1) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 6 - 1) - 1)
      );
      foundUser.Otp = OTP;
      foundUser.save();
      return res.status(200).send({
        message: `Verification code sent ! code : ${OTP}`,
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else {
      return res.status(406).send({
        message: "Invalid OTP",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from recoverAccount endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.confirmRecover = async (req, res) => {
  try {
    const { otp, email } = req.body;
    if (!otp) {
      return res.status(404).send({
        message: "OTP missing",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const foundUser = await UserModel.findOne({ "userEmail.Email": email });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    if (foundUser.Otp === otp) {
      foundUser.Otp = "";
      const token = jwt.sign(
        {
          id: foundUser.id,
          isPro: foundUser.isPro,
          recover: true,
        },
        process.env.SECRET_KEY,
        {
          expiresIn: "1d",
        }
      );
      const refreshToken = jwt.sign(
        {
          id: foundUser.id,
        },
        process.env.SECRET_KEY,
        {
          expiresIn: "365d",
        }
      );
      res.cookie("x-belmood-token", token);
      res.cookie("x-belmood-refresh-token", refreshToken);
      foundUser.save();
      return res.status(200).send({
        message: "Email verified succefully !",
        code: 200,
        success: true,
        date: Date.now(),
      });
    } else {
      return res.status(406).send({
        message: "Invalid OTP",
        code: 406,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from confirmRecover endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.NewPhone = async (req, res) => {
  try {
    const token = req["cookies"]["x-belmood-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    const { phoneNumber, otp } = req.body;
    const existed = await UserModel.findOne({ "userPhoneNumber.Number": phoneNumber });
    if (existed) {
      return res.status(400).send({
        message:
          "This phone number already exist in the database , please change it and send again",
        code: 400,
        requestDate: Date.now(),
        success: false,
      });
    }
    const foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "This user dosent exist in the database , please verify and send again",
        code: 404,
        requestDate: Date.now(),
        success: false,
      });
    }
    if (user.recover) {
      if (!otp && phoneNumber) {
        const OTP = Math.floor(
          Math.pow(10, 6 - 1) + Math.random() * (Math.pow(10, 6) - Math.pow(10, 6 - 1) - 1)
        );
        foundUser.Otp = OTP;
        const attempt = {
          PhoneTried: phoneNumber,
          DateTry: Date.now(),
        };
        foundUser.userPhoneNumber.tries.push(attempt);
        foundUser.save();
        return res.status(200).send({
          code: 200,
          success: true,
          date: Date.now(),
          message: `Please enter the verification code received. code is : ${OTP}`,
        });
      } else {
        if (foundUser.Otp === otp) {
          foundUser.Otp = "";
          foundUser.userPhoneNumber.Number = phoneNumber;
          foundUser.userPhoneNumber.isVerified = true;
          foundUser.userPhoneNumber.dateOfVerification = Date.now();
          foundUser.save();
          return res.status(200).send({
            message: "Phone number verified",
            code: 200,
            success: true,
            date: Date.now(),
          });
        } else {
          return res.status(406).send({
            message: "Invalid OTP",
            code: 406,
            success: false,
            date: Date.now(),
          });
        }
      }
    } else {
      return res.status(403).send({
        message: "Invalid Token",
        code: 403,
        success: false,
        date: Date.now(),
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).send({
      message:
        "This error is coming from NewPhone endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

//  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.  .----------------.
// | .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. || .--------------. |
// | |  _______     | || |  _________   | || |    ______    | || | _____  _____ | || |   _____      | || |      __      | || |  _______     | |
// | | |_   __ \    | || | |_   ___  |  | || |  .' ___  |   | || ||_   _||_   _|| || |  |_   _|     | || |     /  \     | || | |_   __ \    | |
// | |   | |__) |   | || |   | |_  \_|  | || | / .'   \_|   | || |  | |    | |  | || |    | |       | || |    / /\ \    | || |   | |__) |   | |
// | |   |  __ /    | || |   |  _|  _   | || | | |    ____  | || |  | '    ' |  | || |    | |   _   | || |   / ____ \   | || |   |  __ /    | |
// | |  _| |  \ \_  | || |  _| |___/ |  | || | \ `.___]  _| | || |   \ `--' /   | || |   _| |__/ |  | || | _/ /    \ \_ | || |  _| |  \ \_  | |
// | | |____| |___| | || | |_________|  | || |  `._____.'   | || |    `.__.'    | || |  |________|  | || ||____|  |____|| || | |____| |___| | |
// | |              | || |              | || |              | || |              | || |              | || |              | || |              | |
// | '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' || '--------------' |
//  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'  '----------------'

exports.editProfile = async (req, res) => {
  try {
    const token = req["cookies"]["x-belmood-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    let foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }
    const { userFullName, gender, Photos, email, number } = req.body;

    foundUser.userFullName = userFullName || foundUser.userFullName;
    foundUser.userEmail.Email = email || foundUser.userEmail.Email;
    foundUser.gender = gender || foundUser.gender;
    foundUser.Photos = Photos || foundUser.Photos;
    foundUser.userPhoneNumber.Number = number || foundUser.userPhoneNumber.Number;

    const notification = {
      id: uuidv4(),
      createdAt: Date.now(),
      title: "Profile update",
      content: "Profile modifications have been updated",
    };
    foundUser.notifications.push(notification);
    foundUser.save();
    res.status(200).send({
      message: "Updated profile successfully",
      code: 200,
      success: true,
      date: Date.now(),
    });
  } catch (error) {
    res.status(500).send({
      message:
        "This error is coming from editProfile endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};

exports.viewProfile = async (req, res) => {
  try {
    const token = req["cookies"]["x-belmood-token"];
    const user = jwt.verify(token, process.env.SECRET_KEY);
    var foundUser = await UserModel.findOne({ id: user.id });
    if (!foundUser) {
      return res.status(404).send({
        message: "User not found",
        code: 404,
        success: false,
        date: Date.now(),
      });
    }

    res.status(200).send({
      message: "Fetched profile",
      code: 200,
      success: true,
      date: Date.now(),
      user: foundUser,
    });
  } catch (err) {
    res.status(500).send({
      message:
        "This error is coming from viewProfile endpoint, please report to the sys administrator !",
      code: 500,
      success: false,
      date: Date.now(),
    });
  }
};
