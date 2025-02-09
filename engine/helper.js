//handlebar helper setup
const hbs = require('hbs');

//register to lower case
hbs.registerHelper('toLowerCase', (str) => {
    return str.toLowerCase();
});
//register split
hbs.registerHelper('split', (str) => {
    return str.split(',');
});

hbs.registerHelper("log", function(something) {
    console.log("REGISTER HELPER LOG: ");
    console.log(something);
  });

hbs.registerHelper('ifeq', function (a, b, options) {
    if (a == b) { return options.fn(this); }
    return options.inverse(this);
});

hbs.registerHelper('ifnoteq', function (a, b, options) {
    if (a != b) { return options.fn(this); }
    return options.inverse(this);
});