module.exports = {
    usage: 'Usage: $0 use <stack-1> <stack-2> <...>',

    options: {

    },

    validate: function(args, rapido) {
        return {
            stackNames: args._
        };
    },

    /**
     * @param options {Object} The parsed command options (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from ' + rapido.configFilename + ' config files
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

        

        var result = rapido.updateConfig({
            use: stackNames
        });

        var isUpdate = result.updated;

        rapido.log.info((isUpdate ? 'Updated' : 'Set') + ' "use" property in "' + result.file.getAbsolutePath() + '"');

        rapido.log.success('Stacks enabled: ' + (stackNames.length ? stackNames.join(" ") : "(none)"));
        rapido.log();
    }
}