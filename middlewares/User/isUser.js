const jwt = require("jsonwebtoken");

exports.isUser = async (req, res, next) => {
  try {
    const token = req["cookies"]["x-belmood-token"];
    if (!token) {
      return res.status(403).send({
        message: "Please provide belmood token in the cookies",
        code: 403,
        success: false,
        date: Date.now(),
      });
    } else {
      const user = jwt.verify(token, process.env.SECRET_KEY);
      next();
    }
  } catch (err) {
    // Check if the error is due to an expired token.
    if (err.name === "TokenExpiredError") {
      const refreshToken = req["cookies"]["x-belmood-refresh-token"];
      if (!refreshToken) {
        return res.status(403).send({
          message: "Please provide belmood refresh token in the cookies",
          code: 403,
          success: false,
          date: Date.now(),
        });
      }
      try {
        const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const newToken = jwt.sign({ id: payload.id }, process.env.SECRET_KEY, { expiresIn: "20m" });
        res.cookie("x-belmood-token", newToken, { httpOnly: true }); // Update the token in the cookie.
        next();
      } catch (err) {
        console.log(err);
        res.status(500).send({
          message:
            "This error is coming from isUser middleware, please report to the sys administrator !",
          code: 500,
          success: false,
          date: Date.now(),
        });
      }
    } else {
      console.log(err);
      res.status(500).send({
        message:
          "This error is coming from isUser middleware, please report to the sys administrator !",
        code: 500,
        success: false,
        date: Date.now(),
      });
    }
  }
};
