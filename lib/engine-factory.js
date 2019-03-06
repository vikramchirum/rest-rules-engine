const util = require('util');

let fs = require("fs");
let path = require("path");

let createError = require('http-errors');
const _ = require('lodash');

function promisify_fs() {
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

    return await loadEngine_Dabba(engine_name, next);
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

    var config_rules = content.rules;
    var config_conditions = [];
    var config_events = [];

    await Promise.all(
        config_rules.map(async (r) => {

                let relative_path = `conditions/${engine_name}/${r.conditionsDocId}.json`;
                let conditions_path = path.join(`${__dirname}/..`, relative_path);
                config_conditions.push(...await JSON.parse(await fs.readFile(conditions_path, 'utf8')));

                relative_path = `events/${engine_name}/${r.eventDocId}.json`;
                let events_path = path.join(`${__dirname}/..`, relative_path);
                config_events.push(...await JSON.parse(await fs.readFile(events_path, 'utf8')));
            }
        ));

    let rules = [];
    populateRules(rules, config_conditions, config_events);
    return { rules : rules , options : engine_options  };
}

function populateRules(rules, config_conditions, config_events) {

    if (!rules) {
        rules = [];
    }

    config_conditions.forEach(function (item) {

        let condition_name = Object.keys(item)[0];

        let rule = {};
        rule.conditions = item[condition_name].conditions;
        rule.priority = item[condition_name].priority;

        let match = config_events.find(function (element) {
            return (condition_name in element);
        });

        if (match) {
            rule.event = match[condition_name].event;
            rules.push(rule);
        }
    });
}

module.exports = {
    loadEngine: loadEngine,
};