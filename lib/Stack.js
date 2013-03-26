function Stack(name) {
    this.name = name;
    this.commandsByName = {};
    this._commands = null;
}

Stack.prototype = {
    registerCommand: function(commandName, commandConfig) {
        commandConfig.name = commandName;
        this.commandsByName[commandName] = commandConfig;
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

    toString: function() {
        var output = "[" + this.name + '] (' + this.description + ')\n';
        this.getCommands().forEach(function(command) {
            output += ' ' + command.name + ': ' + command.description + ' (' + command.file + ')\n';
        });
        return output;
    }
}

module.exports = Stack;