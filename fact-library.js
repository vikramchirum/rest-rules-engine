samepleFacts = require('./facts/sample-facts');

module.exports = {

    facts : {
        "age": samepleFacts.ageFact, //(params, almanac),
        "state": samepleFacts.stateFact, //(params, almanac),
        "Zip": samepleFacts.zipCodeFact, //(params,almanac)
    }
};