module.exports = {
    usage: 'Usage: $0 list all',

    options: {

    },

    validate: function(args, rapido) {
        return args;
    },

    /**
     * @param options {Object} The parsed command options (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from ' + rapido.configFilename + ' config files
     * @param rapido {Object} A reference to the rapido module
     */
    run: function(options, config, rapido) {
        rapido.runCommand('default', 'list', {showAll: true});
    }
}