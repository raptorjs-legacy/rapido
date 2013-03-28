var Stack = require('./Stack'),
    raptor = require('raptor');

function sortStacks(stacks) {
    stacks.sort(function(a, b) {
        a = a.name.toLowerCase();
        b = b.name.toLowerCase();

        if (a === b) {
            return 0;
        }

        if (a === 'default') {
            return -1;
        }
        if (b === 'default') {
            return 1;
        }

        return a < b ? -1 : (a === b ? 0 : 1);
    });
}

function CommandRegistry() {
    this.stacksByName = {};
    this.commandsByName = {};
    this._enabledStacks = null;
    this.enabledStackNames = {};

    this.registerStack('default', {
        description: 'Default commands'
    });
}

CommandRegistry.prototype = {
    registerStack: function(stackName, stackConfig) {
        var stack = this.stacksByName[stackName] || (this.stacksByName[stackName] = new Stack(stackName));
        if (stackConfig.description) {
            stack.description = stackConfig.description;
        }
        if (stackConfig.version) {
            stack.version = stackConfig.version;
        }
    },

    registerCommand: function(stackName, commandName, commandConfig) {
        if (!stackName) {
            throw new Error('Stack name is required');
        }

        if (!commandName) {
            throw new Error('Command name is required');
        }

        // Find the stack instance that this command will be added to
        var stack = this.stacksByName[stackName] || (this.stacksByName[stackName] = new Stack(stackName));
        commandConfig.stack = stack;
        stack.registerCommand(commandName, commandConfig);
    },

    getCommand: function(stackName, commandName) {
        var stack = this.stacksByName[stackName];
        if (!stack) {
            throw new Error('Stack not found with name "' + stackName + '"');
        }
        return stack.getCommand(commandName);
    },

    getStack: function(stackName) {
        return this.stacksByName[stackName];
    },

    getStacks: function() {
        var stacks = [];
        raptor.forEachEntry(
            this.stacksByName, 
            function(stackName, stack) {
                stacks.push(stack);
            });

        sortStacks(stacks);

        return stacks;
    },

    enableStack: function(stackName) {
        this.enabledStackNames[stackName] = true;
        this._enabledStacks = null;
    },

    isStackEnabled: function(stackName) {
        return this.enabledStackNames[stackName] != null;
    },

    getEnabledStacks: function(stackName) {
        if (!this._enabledStacks) {
            var enabledStacks = [];

            raptor.forEachEntry(
                this.enabledStackNames, 
                function(stackName) {
                    var stack = this.getStack(stackName);
                    if (!stack) {
                        throw new Error('Stack not found: ' + stackName);
                    }
                    enabledStacks.push(stack);
                }, this);

            sortStacks(enabledStacks);
            this._enabledStacks = enabledStacks;
        }
        return this._enabledStacks;
    },

    disableAllStacks: function() {
        this._enabledStacks = null;
        this.enabledStackNames = {};
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