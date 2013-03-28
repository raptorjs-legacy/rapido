var rapidoStartTime = Date.now();

var raptor = require('raptor');

require('raptor/logging').configure({
    loggers: {
        ROOT: {level: 'WARN'}
    }
});

var logger = require('raptor/logging').logger('rapido');

function requireTimed(module) {
    var start = Date.now();
    try
    {
        return require(module);
    }
    finally {
        logger.debug(module + ' loaded at ' + (Date.now() - start) + 'ms')    
    }
    
}

var CommandRegistry = requireTimed('./CommandRegistry');
var optimist = requireTimed('optimist');
var path = requireTimed('path');
var colors = requireTimed('colors');
var File = requireTimed('raptor/files/File');
var scaffolding = requireTimed('./scaffolding');

logger.debug('rapido dependencies loaded in ' + (Date.now() - rapidoStartTime) + 'ms');

var rapidoModuleDir = new File(path.join(__dirname, '..'));

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'white',
    data: 'grey',
    info: 'cyan',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});



function getUserHome() {
    return new File(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME']);
}

var createPaths = function() {
    var paths = [],
        foundPaths = {};
    return {
        add: function(dir) {
            if (typeof dir === 'string') {
                dir = new File(dir);
            }

            var path = dir.getAbsolutePath();
            if (!foundPaths[path]) {
                foundPaths[path] = true;

                if (dir.exists() && dir.isDirectory()) {
                    paths.push(dir);    
                }
                
            }
        },
        paths: paths
    }
}

function buildDefaultConfigPaths(rapido) {
    var paths = createPaths();

    // Walk from the current directory up to the root
    var curDir = new File(process.cwd());
    while(true) {
        paths.add(curDir);
        curDir = curDir.getParentFile();
        if (!curDir || !curDir.exists()) {
            break;
        }
    }

    // Add the user home directory
    paths.add(getUserHome());

    // Add this directory since we have a rapido.json file here
    paths.add(new File(__dirname));

    var foundNodeModulesDir = {};

    function addFromNodeModules(nodeModulesDir) {
        // console.error("addFromNodeModules: " + nodeModulesDir.getAbsolutePath());

        if (!nodeModulesDir || !nodeModulesDir.exists()) {
            return;
        }

        var path = nodeModulesDir.getAbsolutePath();
        if (foundNodeModulesDir[path]) {
            return;
        }

        foundNodeModulesDir[path] = true;

        var moduleDirs = nodeModulesDir.listFiles();
        if (moduleDirs && moduleDirs.length) {
            moduleDirs.forEach(paths.add);
        }
    }
    // Now discover all of the Rapido stacks/commands
    // in first-level modules in available node_modules directories:
    curDir = new File(process.cwd());

    // Add all of the node_modules starting with CWD up to root
    while(true) {
        addFromNodeModules(new File(curDir, "node_modules"));
        curDir = curDir.getParentFile();
        if (!curDir || !curDir.exists()) {
            break;
        }
    }

    addFromNodeModules(rapido.globalNodeModulesDir);
    return paths.paths;
}

function buildDefaultUserConfigPaths() {
    var paths = createPaths();

    var curDir = new File(process.cwd());
    while(true) {
        paths.add(curDir);
        curDir = curDir.getParentFile();
        if (!curDir || !curDir.exists()) {
            break;
        }
    }

    paths.add(getUserHome());



    return paths.paths;
}

exports.create = function() {

    var rapido = {

        loaded: false,

        config: null,

        commands: new CommandRegistry(),

        optimist: optimist,

        enabledStacks: [],

        enabledStacksByName: {},

        globalNodeModulesDir: null,

        log: function(message) {
            console.log.apply(console, arguments);
        },

        scaffold: function(config) {
            scaffolding.generate(config, rapido);
        },

        load: function(paths, configFilename) {
            var startTime = Date.now();
            if (!paths) {
                paths = buildDefaultConfigPaths(rapido);
            }

            if (!configFilename) {
                configFilename = 'rapido.json';
            }

            rapido.config = require('./config-loader').loadConfig(
                paths, 
                configFilename, 
                rapido);

            this.loaded = true;
            logger.debug('rapido configuration loaded in ' + (Date.now() - startTime) + 'ms');
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

        stackExists: function(stackName) {
            return this.commands.getStack(stackName) != null;
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

        getCommandModule: function(stackName, commandName) {
            var commandConfig = rapido.commands.getCommand(stackName, commandName);
            var file = commandConfig.file;
            var command = require(file.getAbsolutePath());
            return command;
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

            var command = rapido.getCommandModule(stackName, commandName);

            try
            {
                command.run(options, rapido.config, rapido);    
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

        writeConfig: function(jsonFile, config) {
            if (typeof jsonFile === 'string') {
                jsonFile = new File(jsonFile);
            }

            jsonFile.writeAsString(JSON.stringify(config, null, "    "));
        },

        findClosestConfigFile: function(paths, configFilename) {
            if (!paths) {
                paths = buildDefaultUserConfigPaths();
            }

            if (!configFilename) {
                configFilename = "rapido.json";
            }

            for (var i=0, len=paths.length; i<len; i++) {
                var configFile = new File(paths[i], configFilename);
                if (configFile.exists()) {
                    return configFile;
                }
            }

            // Config file not found... create it as a child of the first path
            return new File(paths[0], configFilename);
        },

        findClosestConfig: function(paths, configFilename) {
            var file = rapido.findClosestConfigFile(paths, configFilename);
            var config;

            if (file.exists()) {
                config = JSON.parse(file.readAsString());
            }
            else {
                config = {}
            }

            return {
                file: file,
                exists: file.exists(),
                config: config
            }
        },

        updateConfig: function(jsonFile, newProps) {
            if (arguments.length === 1) {
                newProps = arguments[0];
                jsonFile = rapido.findClosestConfigFile();
            }
            
            var config,
                updated = false;

            if (jsonFile.exists()) {
                updated = true;
                config = JSON.parse(jsonFile.readAsString());    
            }
            else {
                config = {};
            }
            
            raptor.extend(config, newProps);
            jsonFile.writeAsString(JSON.stringify(config, null, "    "));

            return {
                config: config,
                file: jsonFile,
                updated: updated
            };
        },

        doRun: function(args) {
            if (!this.loaded) {
                this.load();    
            }

            var enabledStacks = rapido.config['use'] || [];
            this.disableAllStacks();

            this.enableStack('default'); // Always enable the default stack

            enabledStacks.forEach(function(enabledStackName) {
                if (!rapido.stackExists(enabledStackName)) {
                    rapido.log.warn('WARN', "Enabled stack not found: " + enabledStackName);
                }
                else {
                    this.enableStack(enabledStackName);    
                }
                
            }, this);

            args = args.slice(2);

            function onErr(err) {
                console.error(err);
            }
            
            var commandParts = [], 
                optionArgs = [],
                matchingCommands = [],
                optionsStarted = false;

            //console.error('CONFIG: ', config);
            /*
             * Separate out option args from the command
             */
            args.forEach(function(arg) {
                if (arg.startsWith('-') || optionsStarted) {
                    optionsStarted = true;
                    optionArgs.push(arg);
                }
                else {
                    commandParts.push(arg);
                }
            });

            if (commandParts.length === 0) {
                rapido.log.info("\nAVAILABLE COMMANDS:\n");
                this.runCommand('default', 'list', {showAll: false});
                this.log.info('Usage: rap <command-name> [command-args]\n');
                this.log("To get help on a particular command, use:")
                this.log.info('Usage: rap <command-name> --help\n');
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
                var startTime = Date.now();
                console.log('Running command "' + command.name + '" (stack: ' + command.stack.name + ')...\n');


                try
                {
                    var commandModule = require(command.file.getAbsolutePath());
                    var commandArgs;
                    var options = commandModule.options;
                    if (options) {
                        
                        if (!options.help) {
                            options.help = {
                                'h': {
                                    describe: 'Show this message',
                                    alias: 'help'
                                }
                            }
                        }
                        var optimistCommand = optimist(optionArgs);

                        if (commandModule.usage) {
                            optimistCommand.usage(commandModule.usage);
                        }

                        optimistCommand.options(options);

                        var commandArgs = optimistCommand.argv;

                        if (commandArgs.help) {
                            optimistCommand.showHelp();
                            return;
                        }

                        if (commandModule.validate) {
                            try
                            {
                                var newCommandArgs = commandModule.validate(commandArgs, rapido);
                                if (newCommandArgs) {
                                    commandArgs = newCommandArgs;
                                }
                            }
                            catch(e) {
                                optimistCommand.showHelp(console.log);
                                rapido.log('Invalid args: ' + (e.message || e));
                                return;
                            }
                        }

                    }
                    else if (commandModule.parseOptions) {
                        commandArgs = commandModule.parseOptions(optionArgs, rapido);
                    }

                    rapido.runCommand(command, commandArgs);
                    // Time not valid for async commands...
                    // logger.debug('Command completed in ' + (Date.now() - startTime) + 'ms');
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

                var prompt = rapido.prompt;
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
        },



        run: function(args) {
            var startTime = Date.now();

            var globalNodeModulesDir = new File('/usr/local/lib/node_modules')
            if (globalNodeModulesDir.exists()) {
                rapido.globalNodeModulesDir = globalNodeModulesDir;
                rapido.doRun(args);
            }
            else {
                var npm = require("npm")
                npm.load({}, function (er) {
                    logger.debug('npm loaded in ' + (Date.now() - startTime) + 'ms');
                    rapido.globalNodeModulesDir = new File(npm.globalDir);
                });
            }
        },

        relativePath: function(filePath) {
            if (filePath instanceof File) {
                filePath = filePath.getAbsolutePath();
            }
            return path.relative(process.cwd(), filePath);
        }
    };

    function logColor(color, args) {
        if (args.length === 2) {
            var label = '[' + args[0] + ']',
                message = args[1],
                padding = rapido.padding(label, 12);

            rapido.log(padding + (label[color]) + ' ' + message);    
        }
        else {
            var output = args[0] ? args[0][color] : null;
            rapido.log(output);
        }
        
    }

    function logSuccess(message) {
        logColor('green', arguments);
    }

    function logInfo(message) {
        logColor('cyan', arguments);
    }

    function logError(message) {
        logColor('red', arguments);
    }

    function logWarn(message) {
        logColor('yellow', arguments);
    }

    raptor.extend(rapido.log, {
        success: logSuccess,
        info: logInfo,
        error: logError,
        warn: logWarn
    });

    // Lazily initialize prompt because it is slow!
    rapido.__defineGetter__("prompt", function() { return require('prompt'); });

    return rapido;
}


