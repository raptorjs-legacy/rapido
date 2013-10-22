var raptor = require('raptor');
var fs = require('fs');
var File = require('raptor/files').File;

function Command(stack, name, config) {
    this.stack = stack;
    this.name = name;
    raptor.extend(this, config);
    this.listed = config.listed !== false;
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
            if (!options) {
                options = {};
            }
            
            if (!options.h) {
                options.h = {
                    describe: 'Show this message',
                    alias: 'help'
                }
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
    },

    showHelp: function(out, optimistCommand) {
        if (!optimistCommand) {
            var optimist = require('optimist');
            var commandModule = this.getModule();

            optimistCommand = optimist([]);

            optimistCommand.options(this.getOptions());

            if (commandModule.usage) {
                var $0 = require('./rapido').instance.$0;
                optimistCommand.usage(commandModule.usage.replace(/\$0/g, $0));
            }
        }
        
        var writeFn;
        if (out) {
            writeFn = function(str) {
                out.write(str);
            }
        }
        else {
            writeFn = console.log;
        }

        optimistCommand.showHelp(writeFn);
        var commandFilePath = this.file.getAbsolutePath();
        var readmeFile = new File(commandFilePath.slice(0, -3) + '.README.md');
        if (readmeFile.exists()) {
            writeFn('\n' + readmeFile.readAsString());
        }
    }
}

module.exports = Command;