let createError = require('http-errors');
let express = require('express');
let factory = require('../lib/engine-factory');
let router = express.Router();

router.get('/runRequest', async function(req, res, next) {

   var engine_name = "service_location";
   let engine = await factory.loadEngine(engine_name, true, next);

});


module.exports =  router;