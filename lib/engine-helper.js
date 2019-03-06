const jre = require('json-rules-engine');


let jre = { };
jre.run  = (rules, facts, options = { "allowUndefinedFacts": true }) =>  new Promise((resolve, reject) => {

    if(!(Array.isArray(rules) && rules.length > 0) || !facts) {
        reject('The inputs to the rules engine are invalid.');
    }

    let engine = new jre.Engine(rules, options);

    engine.on('success', (event, almanac, ruleResult) => {
        almanac.factValue('username').then(username => {
            render(`${username.bold} succeeded! ${event.params.message}`, ruleResult)
        })
    })

    engine.on('failure', (event, almanac, ruleResult) => {
        almanac.factValue('username').then(username => {
            render(`${username.bold} failed - `, ruleResult)
        })
    })


    function render (message, ruleResult) {
        // if rule succeeded, render success message
        if (ruleResult.result) {
            return console.log(`${message}`.green)
        }
        // if rule failed, iterate over each failed condition to determine why the student didn't qualify for athletics honor roll
        let detail = ruleResult.conditions.all.filter(condition => !condition.result)
            .map(condition => {
                switch (condition.operator) {
                    case 'equal':
                        return `was not an ${condition.fact}`
                    case 'greaterThanInclusive':
                        return `${condition.fact} of ${condition.factResult} was too low`
                }
            }).join(' and ')
        console.log(`${message} ${detail}`.red)
    }


    engine
        .run(facts)
        .then(function (events) {
            resolve(events);
        }, function (err) {
            reject(err);
        });

});



module.exports = {
    jre: jre
}