module.exports = (req, res) => {
  res.status(200).json({ status: 'ok', env: process.env.NODE_ENV });
};
