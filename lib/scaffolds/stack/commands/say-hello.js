module.exports = {
    usage: 'Usage: $0 say hello <name>',

    options: {
        'upper-case': {
            describe: 'Convert name to upper case',
            alias: 'u'
        }
    },

    validate: function(args, rapido) {
        var name = args._[0];
        if (!name) {
            throw 'name is required';
        }
        
        return {
            name: name,
            upperCase: args['upper-case']
        };
    },

    run: function(args, config, rapido) {
        var name = args.name;

        if (args.upperCase) {
            name = name.toUpperCase();
        }

        rapido.log.success('Command says: Hello ' + name + '!');
    }
}
