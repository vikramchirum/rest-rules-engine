let createError = require('http-errors');
let express = require('express');
let factory = require('../engine-factory');
let router = express.Router();

/* GET all engines */
router.get('/', function(req, res, next) {
    //load all engines configured via local file repository
    //don't load rules unless specified in query options
    let loadRules = req.query.loadRules === '1';
    res.send(factory.loadAllEngines(next, loadRules));
});

/* GET specified engine */
router.get('/:engineName', function(req, res, next) {
    //load only engine specified via local file repository
    //don't load rules unless specified in query options
    let loadRules = req.query.LoadRules === "1";
    res.send(factory.loadEngine(req.params.engineName, loadRules, next));
});

/*POST a runRequest for specified engine, with facts object in request body as JSON */
router.post('/:engineName/runRequest/',function(req, res, next) {
    // load specified engine with rules so that they can be evaluated against facts in request body
    let engine = factory.loadEngine(req.params.engineName, true, next);
    factory.mapQueryToFacts(engine, req.query); // treat all query params as global facts
    try {
        var facts = typeof(req.body) === "object"?
            req.body : {};
    } catch (e) {
        console.error("invalid JSON was provided in body: " + req.body);
        next(createError(400, "to POST runRequest, body must contain valid JSON with a facts object'. Error: " + e));
    }
    if (typeof (facts) !== "object"){
        console.warn('disregarding non-object JSON passed for runRequest: ${facts}');
        facts = {};
    }
    engine.run(facts)
        .then((events) => {
            res.send(events); //return BRE results
        });
});

/*POST a batchRunRequest for specified engine, with facts objects in batchRun array request body as JSON */
router.post('/:engineName/batchRunRequest', function(req,res,next) {
    // load specified engine with rules so that they can be evaluated against facts in request body
    let engine = factory.loadEngine(req.params.engineName, true, next);
    factory.mapQueryToFacts(engine, req.query); // treat all query params as global facts
    try {
        var batchRun = req.body.batchRun
    } catch (e) {
        console.error("invalid JSON was provided in body: " + req.body);
        next(createError(400, "to POST batchRunRequest, body must contain valid JSON with root object 'batchRun'. Error: " + e));
    }
    if (typeof (batchRun) !== "object" || typeof (batchRun.length) !== "number") {
        console.error("root element of JSON body was not an array: " + req.body);
        next(createError(400, "root element of JSON body should be an array called 'batchRun'"));
    }
    console.info('There were ${batchRun.length} items in the batchRun')
    let batchResults = [];
    for (let lcv = 0; lcv < batchRun.length; lcv++) {
        if(typeof(batchRun[lcv].facts) === "object"){
            engine.run(batchRun[lcv].facts).then((events, lcv) => {
                //TODO: implement callback
                console.log('facts index ${lcv} resulted in the events: ' + events)
            });

        }
    }
    res.send('batchRunRequest POST successful');
});

module.exports = router;