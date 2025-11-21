//api/prime5.js

module.exports = (req, res) => {
  res.status(200).json({
    status: "ok",
    app: "Prime5",
    timestamp: new Date().toISOString(),
  });
};
