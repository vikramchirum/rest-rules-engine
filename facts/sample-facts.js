function stateLookupByZip(country, zip) {
    let state;
    switch (zip.toString()) {
        case '80014':
            state = 'CO';
            break;
        case '84101':
            state = 'UT';
            break;
        case '90210':
            state = 'CA';
            break;
        default:
            state = 'NY';
    }

    return state;
}

let users = {
    1: {age: 22, zipCode: 80014},
    2: {age: 16, zipCode: 80014},
    3: {age: 35, zipCode: 84101},
    4: {age: 23, zipCode: 90210},
};

function getUser(id) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(users[id]);
        }, 500);
    });
}

module.exports = {
    ageFact: function (params, almanac) {
        // facts may return a promise when performing asynchronous operations
        // such as database calls, http requests, etc to gather data
        return almanac.factValue('userId').then((userId) => {
            return getUser(userId);
        }).then((user) => {
            return user.age;
        })
    },

    stateFact: function (params, almanac) {
        // rule "params" value is passed to the fact
        // 'almanac' can be used to lookup other facts
        // via almanac.factValue()
        return almanac.factValue('zip-code')
            .then(zip => {
                return stateLookupByZip(params.country, zip);
            });
    },

    zipCodeFact: function (params, almanac) {
        return almanac.factValue('userId').then((userId) => {
            return getUser(userId);
        }).then((user) => {
            return user.zipCode;
        })
    },

};


