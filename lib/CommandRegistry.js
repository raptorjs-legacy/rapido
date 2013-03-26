var Stack = require('./Stack');

function CommandRegistry() {
    this.stacksByName = {};
    this.registerStack('all', {
        description: 'Commands that apply to all stacks'
    });
}

CommandRegistry.prototype = {
    registerStack: function(stackName, stackConfig) {
        var stack = this.stacksByName[stackName] || (this.stacksByName[stackName] = new Stack(stackName));
        if (stackConfig.description) {
            stack.description = stackConfig.description;
        }
    },

    registerCommand: function(stackName, commandName, commandConfig) {
        if (!stackName) {
            throw new Error('Stack name is required');
        }

        if (!commandName) {
            throw new Error('Command name is required');
        }

        var stack = this.stacksByName[stackName] || (this.stacksByName[stackName] = new Stack(stackName));
        stack.registerCommand(commandName, commandConfig);
    },

    getStacks: function() {
        var stacks = [];
        require('raptor').forEachEntry(
            this.stacksByName, 
            function(stackName, stack) {
                stacks.push(stack);
            });

        stacks.sort(function(a, b) {
            a = a.name.toLowerCase();
            b = b.name.toLowerCase();
            if (a === 'all') {
                return -1;
            }
            if (b === 'all') {
                return 1;
            }

            return a < b ? -1 : (a === b ? 0 : 1);
        });

        return stacks;
    },

    toString: function() {
        var output = "";
        this.getStacks().forEach(function(stack) {
            output += stack.toString() + '\n';
        });
        return output;
    }
}

module.exports = CommandRegistry;