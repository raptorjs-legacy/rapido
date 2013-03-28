module.exports = {

    usage: 'Usage: $0 <command-name> [command-args]\n\n'.info.bold +
           'To list available commands, use:\n' +
           '$0 list\n\n'.info +
           'To get help on a particular command, use:\n' +
           '$0 <command-name> --help'.info,

    options: {
    },

    validate: function(args, rapido) {
        return {
        }
    },

    /**
     * @param options {Object} The parsed command options (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from ' + rapido.configFilename + ' config files
     * @param rapido {Object} A reference to the rapido module
     */
    run: function(options, config, rapido) {
        if (rapido.$0 !== 'rap') {
            rapido.log();
            if (rapido.title) {
                rapido.log(rapido.title.green.bold);
            }
            rapido.log("Powered by R\u00e1pido".green + ': ' + 'https://github.com/raptorjs/rapido'.underline.blue);
            rapido.log();
        }
        
        rapido.runCommand('default', 'list');
        
        rapido.log(this.usage);
    }
}