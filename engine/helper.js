//handlebar helper setup
const hbs = require('hbs');

//register to lower case
hbs.registerHelper('toLowerCase', (str) => {
    return str.toLowerCase();
});



