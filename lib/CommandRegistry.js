var Stack = require('./Stack'),
    Command = require('./Command'),
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
    this._exclusiveStackCommands = {};
}

CommandRegistry.prototype = {
    exclusiveStackCommand: function(stackName, commandName) {
        this._exclusiveStackCommands[commandName] = stackName;
    },

    registerStack: function(stackConfig) {
        var stackName = stackConfig.name;
        if (!stackName) {
            throw new Error('"name" property is required. Stack config: ' + require('util').inspect(stackConfig));
        }
        var commands = stackConfig.commands;

        var stack = this.stacksByName[stackName] || (this.stacksByName[stackName] = new Stack(stackName));
        if (stackConfig.description) {
            stack.description = stackConfig.description;
        }
        if (stackConfig.version) {
            stack.version = stackConfig.version;
        }

        raptor.forEachEntry(commands, function(commandName, commandConfig) {
            var exclusiveStack = this._exclusiveStackCommands[commandName];
            if (exclusiveStack && exclusiveStack !== stackName) {
                // Ignore commands that are marked as being exclusive to a particular stack
                return;
            }

            this.registerCommand(stackName, commandName, commandConfig);
        }, this);
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
        var command = new Command(stack, commandName, commandConfig);
        stack.registerCommand(command);
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