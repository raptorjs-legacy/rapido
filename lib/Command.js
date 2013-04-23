var raptor = require('raptor');

function Command(stack, name, config) {
    this.stack = stack;
    this.name = name;
    raptor.extend(this, config);
    this._options = undefined;
}

Command.prototype = {
    getModule: function() {
        var file = this.file;
        var command = require(file.getAbsolutePath());
        return command;
    },

    getOptions: function() {
        if (this._options === undefined) {
            var options = this.getModule().options;
            if (options) {
                if (!options.h) {
                    options.h = {
                        describe: 'Show this message',
                        alias: 'help'
                    }
                }
            }
            else {
                options = null;
            }

            this._options = options;
        }
        return this._options;
    },

    getAllowedOptions: function() {
        var options = this.getOptions();
        var allowedOptions = [];
        
        function add(name) {
            allowedOptions.push((name.length > 1 ? '--' : '-') + name);
        }

        if (options) {
            raptor.forEachEntry(options, function(optionName, optionConfig) {
                add(optionName);
                if (optionConfig.alias) {
                    add(optionConfig.alias);
                }
            });
        }

        return allowedOptions;
    },

    toString: function() {
        return "[" + this.name + '] (' + this.description + ')';
    }
}

module.exports = Command;