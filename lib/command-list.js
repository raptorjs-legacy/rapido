module.exports = {

    /**
     * @param args {Array<String>} An array of command arguments that must be 
     *                             parsed (does not include the command).
     * @return {Object} The parsed command arguments (as name/value pairs) 
     */
    parseOptions: function(args, rapido) {
        var options;

        rapido.optimist(args)
            .usage(rapido.color.cyan('Usage: rap list'))
            .boolean('all')
            .alias('a', 'all')
            .describe('all', 'Show commands for all stacks (not just the currently enabled stacks)')
            .describe('help', 'Show this message')
            .check(function(argv) {
                if (argv.help) {
                    throw '';
                }

                var showAll = argv._[0];

                options = {
                    showAll: argv.all
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
        var stacks = options.showAll ? rapido.getStacks() : rapido.getEnabledStacks();
        var maxCommandLen = 0;

        stacks.forEach(function(stack) {
            maxCommandLen = stack.getCommands().reduce(function(prev, cur) {
                cur = cur.name.length;
                return cur > prev ? cur : prev;
            }, maxCommandLen);
        });

        stacks.forEach(function(stack) {
            var stackLabel = rapido.color.cyan.bold('[' + stack.name + ']');
            var versionStr = stack.version ? ' (v' + stack.version + ')' : '';

            rapido.log(stackLabel + (stack.description ? ' - ' + stack.description : '') + versionStr);
            stack.getCommands().forEach(function(command) {
                rapido.log(' ' + rapido.color.yellow(command.name) + rapido.padding(command.name, maxCommandLen) + ' : ' + command.description);
            });
            rapido.log();
        });
    }
}