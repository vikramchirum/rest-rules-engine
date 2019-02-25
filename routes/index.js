let createError = require('http-errors');
let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send('nothing to see here');
});


module.exports = router;
