const jre = require('json-rules-engine');

let json_rules_engine = { };
json_rules_engine.run  = (rules, facts, options = { "allowUndefinedFacts": true }) =>  new Promise((resolve, reject) => {

    if (!(Array.isArray(rules) && rules.length > 0) || !facts) {
        reject('The inputs to the rules engine are invalid.');
    }

    let engine = new jre.Engine(rules, options);
    engine
        .run(facts)
        .then(function (events) {
            resolve(events);
        }, function (err) {
            reject(err);
        });
});

module.exports = {
    json_rules_engine: json_rules_engine
}