module.exports = {

    /**
     * @param args {Array<String>} An array of command arguments that must be 
     *                             parsed (does not include the command).
     * @return {Object} The parsed command arguments (as name/value pairs) 
     */
    parseOptions: function(args, rapido) {
        var options;

        rapido.optimist(args)
            .usage(rapido.color.cyan('Usage: rap list all'))
            .describe('help', 'Show this message')
            .check(function(argv) {
                if (argv.help) {
                    throw '';
                }
                options = {
                }
            })
            .argv; 

        return options;
    },

    /**
     * @param options {Object} The parsed command options (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from .rapido config files
     * @param rapido {Object} A reference to the rapido module
     */
    run: function(options, config, rapido) {
        rapido.runCommand('default', 'list', {showAll: true});
    }
}