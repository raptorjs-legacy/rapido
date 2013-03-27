module.exports = {

    /**
     * @param args {Array<String>} An array of command arguments that must be 
     *                             parsed (does not include the command).
     * @return {Object} The parsed command arguments (as name/value pairs) 
     */
    parseOptions: function(args, rapido) {
        var options;

        rapido.optimist(args)
            .usage(rapido.color.cyan('Usage: rap use <stack-1> <stack-2> <...>'))
            .describe('help', 'Show this message')
            .check(function(argv) {
                if (argv.help) {
                    throw '';
                }

                options = {
                    stackNames: argv._
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
        var stackNames = options.stackNames;

        if (!stackNames) {
            stackNames = [];
        }

        var validStacks = [];

        stackNames.forEach(function(stackName) {
            if (!rapido.stackExists(stackName)) {
                rapido.log.warn('SKIP', 'Invalid stack: ' + stackName);
            }
            else if (stackName !== 'default') {
                validStacks.push(stackName);
            }
        });

        stackNames = validStacks;        

        

        var result = rapido.updateUserConfig({
            use: stackNames
        });

        var isUpdate = result.updated;

        rapido.log.info((isUpdate ? 'Updated' : 'Set') + ' "use" property in "' + result.file.getAbsolutePath() + '"');

        rapido.log.success('Stacks enabled: ' + (stackNames.length ? stackNames.join(" ") : "(none)"));
        rapido.log();
    }
}