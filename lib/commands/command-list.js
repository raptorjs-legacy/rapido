module.exports = {

    usage: 'Usage: $0 list',

    options: {
        'all': {
            describe: 'List all commands (not just commands for enabled stacks)',
            boolean: true,
            alias: 'a'
        }
    },

    validate: function(args, rapido) {
        return {
            showAll: args.all === true
        }
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
            var stackLabel = ('[' + stack.name + ']').cyan;
            var versionStr = stack.version ? ' (v' + stack.version + ')' : '';

            rapido.log(stackLabel + versionStr + (stack.description ? ' - ' + stack.description : ''));
            stack.getCommands().forEach(function(command) {
                rapido.log(' ' + command.name.yellow + rapido.padding(command.name, maxCommandLen) + ' : ' + command.description);
            });
            rapido.log();
        });
    }
}