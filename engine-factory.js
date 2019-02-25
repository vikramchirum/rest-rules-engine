let jre = require('json-rules-engine');
let createError = require('http-errors');
let path = require("path");
let fs = require("fs");
let factLibrary = require('./fact-library');


function emptyEngineFactory(options){

    let engine = typeof (options) === "object" ?
        new jre.Engine([], options) : new jre.Engine();
    return engine;
}

function parseEngineDoc(engineDocId, loadRules = true) {
    let engineDoc = require('./engines/' + engineDocId);

    let engine =  typeof (engineDoc) !== "object" ?
        emptyEngineFactory() : emptyEngineFactory(engineDoc.options);

    if (loadRules === true && (
        typeof (engineDoc.rules) === 'object' &&
        typeof (engineDoc.rules.length) === 'number')) {

        for (let ri = 0; ri < engineDoc.rules.length; ri++) {
            let conditions = engineDoc.rules[ri].conditionsDocId !== 'undefined' ?
                require('./conditions/' + engineDoc.rules[ri].conditionsDocId) : engineDoc.conditions;

            let event = engineDoc.rules[ri].eventDocId !== 'undefined' ?
                require('./events/' + engineDoc.rules[ri].eventDocId) : engineDoc.event;

            engine.addRule(new jre.Rule({conditions, event}));
        }
    }
    return engine;
}

function getFactsNamesRecursively(conditionArray, factNames = []) {
    if(typeof (conditionArray) === "object" && typeof (conditionArray.length) === "number" ) {
        for (let lcv = 0; lcv < conditionArray.length; lcv++) {
            if (typeof (conditionArray[lcv]) === "object") {
                if (typeof (conditionArray[lcv].fact) === "string") {
                    factNames.push(conditionArray[lcv].fact);
                } else if (typeof (conditionArray[lcv].any) === "object" &&
                    typeof (conditionArray[lcv].any.length) === "number") {
                    getFactsNamesRecursively(conditionArray[lcv].any, factNames);
                } else if (typeof (conditionArray[lcv].all) === "object" &&
                    typeof (conditionArray[lcv].all.length) === "number") {
                    getFactsNamesRecursively(conditionArray[lcv].all, factNames);
                } else {
                    console.warn('Encountered unexpected object while traversing conditions ${conditionsArray}.');
                    console.warn('Skipping element(s) after some condition with fact ${factNames[factNames.length]}.');
                }
            } else {
                console.warn('Encountered non-object while traversing conditions ${conditionsArray}.');
                console.warn('Skipping element(s) after some condition with fact ${factNames[factNames.length]}.');
            }
        }
    } else {
        console.warn('Encountered non-object when expecting an array of conditions: ${conditionArray}.');
        console.warn('Skipping element(s) after some condition with fact ${factNames[factNames.length]}.');
    }
}

function loadFactsFromRules(engine, next) {
    let factNames = [];

    if(typeof (engine) === "object" && typeof (engine.rules) === "object"){ //maker sure we're dealing with a valid engine w/ rules
        for(let ruleName in engine.rules) {
            if(typeof (engine.rules[ruleName]) === "object") { //make sure each rule we target is valid

                let rule = engine.rules[ruleName];
                if (typeof (rule.conditions.all) === "object")
                    getFactsNamesRecursively(rule.conditions.all, factNames);

                if (typeof (rule.conditions.any) === "object")
                    getFactsNamesRecursively(rule.conditions.any, factNames);

                if (factNames.length <= 0) {
                    console.error("500 Error: engine contains no conditions (or facts within).")
                    next(createError(500, "Engine contains no conditions (or facts within)."));
                }

                for (let lcv = 0; lcv < factNames.length; lcv++) {
                    if (typeof (factLibrary.facts[factNames[lcv]]) === "function") {
                        engine.addFact(new jre.Fact(factNames[lcv], (params, almanac) => { //engine.addFact ignores dupes
                            factLibrary.facts[factNames[lcv]](params, almanac);
                        }));
                    } else if (!engine.allowUndefinedFacts) {
                        console.error('500 Error: Engine contains conditions with undefined fact ${factNames[lcv]}. Add or configure to allow.');
                        next(createError(500, 'Engine contains conditions with undefined fact ${factNames[lcv]}. Add or configure to allow.'));
                    }
                }
            }
        }
    }
    console.info('Loaded facts: ${factNames}')
}

function parseEnginesDir (loadRules = false) {

    let engines = {};
    let normalizedPath = path.join(__dirname, 'engines');
    fs.readdirSync(normalizedPath).forEach(function (file) {
        let engineDocId = file.replace(/\.[^/.]+$/, "");
        engines[engineDocId] = parseEngineDoc(engineDocId, loadRules);
    });
    return engines;
}

module.exports = {

    /* handle standard engine loading logic and error handling */
    loadEngine: function(engineName, loadRules, next) {
        if (typeof (engineName) === "undefined")
            next(createError(404, 'Could not find specified resource: engineName was undefined'));

        engineName.replace(/\.[^/.]+$/, "");//just in case someone passes filename...

        let engines = parseEnginesDir(loadRules); //attempt to load specified engine via local file repository, with rules if requested

        if (typeof (engines[engineName]) === "undefined")
            next(createError(404, 'Could not find specified resource: Engine[' + engineName + ']'));

        if(loadRules) //don't attempt to load facts unless rules were requested.
            loadFactsFromRules(engines[engineName], next);

        return engines[engineName];
    },

    loadAllEngines: function(next, loadRules = false){
        return parseEnginesDir(loadRules);
    },

    mapQueryToFacts: function(engine, query) {

        for (var key in query) {
            engine.addFact(key, query[key])
        }
    }
};