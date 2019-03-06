let createError = require('http-errors');
let express = require('express');
let factory = require('../lib/engine-factory');
let router = express.Router();

let engine_helper = require('../lib/engine-helper');

router.get('/runRequest', async function(req, res, next) {

   var engine_name = "service_location";
   var fact = {

       "Service_Type" : "Move_In",
       "Premise_Type" : "Residential",
       "Meter_Status" : "Active",
       "Switch_Hold" : false
   };

   let engine = await factory.loadEngine(engine_name, true, next);
   engine_helper.json_rules_engine.run(engine.rules, fact, engine.options).then((resp) => {
           res.send(resp);
       }, function (err) {
          res.send(err);
       }
   );

});


module.exports =  router;