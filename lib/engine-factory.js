let jre = require('json-rules-engine');
let factLibrary = require('../fact-library');

const util = require('util');
let fs = require("fs");
let createError = require('http-errors');
let path = require("path");
const _ = require('lodash');

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



function promisify_fs() {

    /*
    for(index = 0; index < Object.keys(fs).length; index++) {
        var member = Object.keys(fs)[index];
        if (typeof member === 'function') {
            member = util.promisify(fs[key]);
        }
    }
*/

    Object.keys(fs).forEach((key) => {
        if (typeof fs[key] === 'function') {
            fs[key] = util.promisify(fs[key]);
        }
    });
}

async function  loadEngine(engine_name, next) {

     promisify_fs();

    if (!engine_name) {
        next(createError(404, 'Engine name cannot be undefined.'));
    }

    // just in case someone passes filename.
    engine_name = engine_name.replace(/\.[^/.]+$/, "");

    await loadEngine_Dabba(engine_name, next);
}


async function  loadEngine_Dabba(engine_name, next) {
    let content;
    let engine_path = `engines/${engine_name}.json`;
    let normalizedPath = path.join(`${__dirname}/..`, engine_path);

    try {
        await fs.access(normalizedPath);
    }
    catch (err) {
        next(createError(404, `Could not find specified resource: Engine ${engine_name}`));
    }

    try {
        content = JSON.parse(await fs.readFile(normalizedPath, 'utf8'));
    }
    catch (err) {
        next(createError(404, `Error in reading the Engine file: Engine ${engine_name}`));
    }

    var engine_options = content.options;

    var rules = content.rules;
    var conditions = [];
    var events = [];

    await Promise.all(
        rules.map(async (r) => {

                let relative_path = `conditions/${engine_name}/${r.conditionsDocId}.json`;
                let conditions_path = path.join(`${__dirname}/..`, relative_path);
                conditions.push(await JSON.parse(await fs.readFile(conditions_path, 'utf8')));

                relative_path = `events/${engine_name}/${r.eventDocId}.json`;
                let events_path = path.join(`${__dirname}/..`, relative_path);
                events.push(await JSON.parse(await fs.readFile(events_path, 'utf8')));
            }
        ));

    var test = conditions.length;
    var bisk = events.length;
}

module.exports = {

    /* handle standard engine loading logic and error handling */
    loadEngine: loadEngine,

    loadAllEngines: function(next, loadRules = false){
        return parseEnginesDir(loadRules);
    },

    mapQueryToFacts: function(engine, query) {

        for (var key in query) {
            engine.addFact(key, query[key])
        }
    }
};