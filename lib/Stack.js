function Stack(name, version) {
    this.name = name;
    if (version) {
        this.version = version;
    }
    
    this.commandsByName = {};
    this._commands = null;
}

Stack.prototype = {
    registerCommand: function(command) {
        if (typeof command !== 'object' || !command.name) {
            throw new Error('Invalid command arg: ' + command);
        }

        var commandName = command.name;
        this.commandsByName[commandName] = command;
        this._commands = null;
    },

    getCommand: function(commandName) {
        return this.commandsByName[commandName];
    },

    getCommands: function() {
        if (!this._commands) {
            var commands = [];
            require('raptor').forEachEntry(
                this.commandsByName,
                function(commandName, command) {
                    commands.push(command);
                });

            commands.sort(function(a, b) {
                a = a.name.toLowerCase();
                b = b.name.toLowerCase();
                return a < b ? -1 : (a === b ? 0 : 1);
            });
            this._commands = commands;
        }

        return this._commands;
    },

    forEachCommand: function(callback, thisObj) {
        var commands = this.getCommands();
        commands.forEach(callback, thisObj);
    },

    getVersion: function() {
        return this.version;
    },

    hideCommand: function(commandName) {
        var command = this.getCommand(commandName);
        if (command) {
            command.hide();
        }
    },

    toString: function() {
        var output = "[" + this.name + '] (' + this.description + ')\n';
        this.getCommands().forEach(function(command) {
            output += ' ' + command.name + ': ' + command.description + ' (' + command.file + ')\n';
        });
        return output;
    }
};

module.exports = Stack;