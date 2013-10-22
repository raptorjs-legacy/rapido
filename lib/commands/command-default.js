module.exports = {

    usage: 'Usage: $0 <command-name> [command-args]',

    options: {
        'version': {
            describe: 'Current version',
            boolean: true,
            alias: 'v'
        }
    },

    validate: function(args, rapido) {
        return args;
    },

    /**
     * @param args {Object} The parsed command args (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from ' + rapido.configFilename + ' config files
     * @param rapido {Object} A reference to the rapido module
     */
    run: function(args, config, rapido) {
        if (args.version) {
            var version = rapido.version;
            if (!version) {
                var fs = require('fs');
                var path = require('path');
                var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'));
                version = 'R\u00e1pido ' + pkg.version;
            }
            rapido.log(version);
        }
        else {
            if (rapido.$0 !== 'rap') {
                rapido.log();
                if (rapido.title) {
                    rapido.log(rapido.title.green.bold);
                }
                rapido.log("Powered by R\u00e1pido".green + ': ' + 'https://github.com/raptorjs/rapido'.underline.blue);
                rapido.log();
            }

            rapido.runCommand('default', 'list');   
            
            rapido.log('Usage: $0 <command-name> [command-args]');
            console.log();
            rapido.log(
                'To list available commands, use:\n' +
                '$0 list\n\n'.info +
                'To get help on a particular command, use:\n' +
                '$0 <command-name> --help'.info);
        }
    }
}