export default function handler(req, res) {
  return res.status(200).json({
    status: "ok",
    app: "Prime5",
    timestamp: new Date().toISOString()
  });
}
