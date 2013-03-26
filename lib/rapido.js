var raptor = require('raptor');

var CommandRegistry = require('./CommandRegistry'),
    optimist = require('optimist'),
    prompt = require('prompt'),
    color = require('cli-color'),
    File = require('raptor/files/File'),
    logger = require('raptor/logging').logger('rapido');

function getUserHome() {
    return new File(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']);
}

function buildDefaultConfigPaths() {
    var paths = [];

    var curDir = new File(process.cwd());
    while(true) {
        paths.push(curDir);
        curDir = curDir.getParentFile();
        if (!curDir || !curDir.exists()) {
            break;
        }
    }

    paths.push(getUserHome());
    paths.push(new File(__dirname));

    return paths;
}

exports.create = function() {
    var rapido = {

        loaded: false,

        config: null,

        commands: new CommandRegistry(),

        optimist: optimist,

        prompt: prompt,

        color: color,

        enabledStacks: [],

        enabledStacksByName: {},

        log: function(message) {
            console.log.apply(console, arguments);
        },

        load: function(paths, configFilename) {
            if (!paths) {
                paths = buildDefaultConfigPaths();
            }

            if (!configFilename) {
                configFilename = '.rapido';
            }

            rapido.config = require('./config-loader').loadConfig(
                paths, 
                configFilename, 
                rapido);

            var enabledStacks = rapido.config['use'] || [];
            this.disableAllStacks();

            this.enableStack('default'); // Always enable the default stack

            enabledStacks.forEach(function(enabledStackName) {
                this.enableStack(enabledStackName);
            }, this);

            this.loaded = true;
        },

        disableAllStacks: function() {
            this.enabledStacks = [];
            this.enabledStacksByName = {};
        },

        enableStack: function(stackName) {
            var stack = this.commands.getStack(stackName);
            if (!stack) {
                throw new Error("Unable to enable stack. Invalid stack: " + stackName);
            }

            if (!this.enabledStacksByName[stackName]) {
                this.enabledStacks.push(stack);
                this.enabledStacksByName[stackName] = stack;
            }
        },

        getStacks: function() {
            return this.commands.getStacks();
        },

        getEnabledStacks: function(stackName) {
            return this.enabledStacks;
        },

        registerStack: function(stackName, stackConfig) {
            this.commands.registerStack(stackName, stackConfig);
        },

        registerCommand: function(stackName, commandName, commandConfig) {
            this.commands.registerCommand(stackName, commandName, commandConfig);
        },

        runCommand: function(stackName, commandName, options) {
            if (arguments.length === 2) {
                options = arguments[1];
                var command = arguments[0];
                commandName = command.name;
                stackName = command.stack.name;
            }

            if (!stackName) {
                stackName = "default";
            }

            if (typeof stackName !== 'string') {
                throw new Error('Unable to run command. Invalid stack name: ' + stackName);
            }

            if (typeof commandName !== 'string') {
                throw new Error('Unable to run command. Invalid command name: ' + commandName);
            }

            var commandConfig = rapido.commands.getCommand(stackName, commandName);
            var file = commandConfig.file;
            var command = require(file.getAbsolutePath());

            try
            {
                command.run(options, this.config, rapido);    
            }
            catch(e) {
                throw raptor.createError(
                    new Error('Error while executing command "' + commandName + '" (' + stackName + '). Error: ' + e), 
                    e);
            }
        },

        padding: function(str, targetLen) {
            var padding = '';
            for (var i=0, len=targetLen-str.length; i<len; i++) {
                padding += ' ';
            }
            return padding;
        },

        rightPad: function(str, len) {
            while(str.length<len) {
                str += ' ';
            }
            return str;
        },

        leftPad: function(str, len) {
            while(str.length<len) {
                str = ' ' + str;
            }
            return str;
        },

        run: function(args) {
            if (!this.loaded) {
                this.load();    
            }

            args = args.slice(2);

            function onErr(err) {
                console.error(err);
            }
            
            var commandParts = [], 
                optionArgs = [],
                matchingCommands = [];

            //console.error('CONFIG: ', config);
            /*
             * Separate out option args from the command
             */
            args.forEach(function(arg) {
                if (arg.startsWith('-')) {
                    optionArgs.push(arg);
                }
                else {
                    commandParts.push(arg);
                }
            });

            if (commandParts.length === 0) {
                this.log.info("\nAvailable commands:\n");
                this.runCommand('default', 'list', {showAll: true});
                return;
            }

            var enabledStacks = this.getEnabledStacks();

            for (var i=commandParts.length-1; i>=0; i--) {
                var commandName = commandParts.slice(0, i+1).join(' ');

                enabledStacks.forEach(function(stack) {
                    var command = stack.getCommand(commandName);
                    if (command) {
                        matchingCommands.push(command);
                    }
                }, this);

                if (matchingCommands.length) {
                    if (i<commandParts.length-1) {
                        optionArgs = commandParts.slice(i+1).concat(optionArgs);
                    }
                    break;
                }
            } 

            if (!matchingCommands.length) {
                throw new Error("Unsupported command: " + commandParts.join(' '));
            }
            

            function invokeCommand(command) {
                console.log('Running command "' + command.name + '" (' + command.stack.name + ')...\n');

                try
                {
                    var commandModule = require(command.file.getAbsolutePath());
                    var options = commandModule.parseOptions ? commandModule.parseOptions(optionArgs, rapido) : optionArgs;
                    rapido.runCommand(command, options);    
                }
                catch(e) {
                    logger.error(e);
                }
            }
            

            if (matchingCommands.length > 1) {

                console.log('Multiple matching commands found. Choose a command:');
                matchingCommands.forEach(function(command, i) {
                    console.log('[' + (i+1) + '] ' + command.name + ' (' + command.stack.name + ')');
                });

                prompt.start();
                prompt.get(
                    {
                        name: "index",
                        description: 'Command number [default: 1]',     // Prompt displayed to the user. If not supplied name will be used.
                        //type: 'number',                 // Specify the type of input to expect.
                        pattern: /^[0-9]+$/,                  // Regular expression that input must be valid against.
                        message: 'Choose a valid command', // Warning message to display if validation fails.
                        conform: function(value) {
                            var index = parseInt(value, 10);
                            return index >= 1 && index <= matchingCommands.length;
                        },
                        before: function(value) {
                            return value == '' ? '1' : value;
                        }
                    }, 
                    function (err, result) {
                        if (err) { return onErr(err); }
                        var index = parseInt(result.index, 10)-1;
                        invokeCommand(matchingCommands[index]);
                    });
            }
            else {
                invokeCommand(matchingCommands[0]);
            }

        }
    };

    function logColor(color, message) {
        rapido.log(rapido.color[color](message));
    }

    function logSuccess(message) {
        logColor('green', message);
    }

    function logInfo(message) {
        logColor('cyan', message);
    }

    function logError(message) {
        logColor('red', message);
    }

    function logWarn(message) {
        logColor('orange', message);
    }

    raptor.extend(rapido.log, {
        success: logSuccess,
        info: logInfo,
        error: logError,
        warn: logWarn
    });

    return rapido;
}
