var express = require('express');
var router = express.Router();
router.get('/', function(req, res) {
  res.json({ status: 'ok', uptime: process.uptime() });
});
module.exports = router;
