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

function buildStackConfigPaths(rapido) {
    var paths = createPaths();

    // Add this directory since we have a rapido-stack.json file here
    paths.add(new File(__dirname));
    rapido.additionalStackDirs.forEach(paths.add);

    var foundNodeModulesDir = {};

    function addFromNodeModules(nodeModulesDir) {
        // console.error("addFromNodeModules: " + nodeModulesDir.getAbsolutePath());
        if (typeof nodeModulesDir === 'string') {
            nodeModulesDir = new File(nodeModulesDir);
        }

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

    rapido.additionalNodeModulesDirs.forEach(function(dir) {
        addFromNodeModules(dir);
    });

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

var $0 = path.basename(process.argv[1]);

exports.create = function() {
    var _exclusiveStackCommands = [];

    var rapido = {

        initialized: false,

        config: null,

        commands: new CommandRegistry(),

        optimist: optimist,

        globalNodeModulesDir: null,

        log: function(message) {
            for (var i=0, len=arguments.length; i<len; i++) {
                var arg = arguments[i];
                if (typeof arg === 'string') {
                    arguments[i] = arg.replace(/\$0/g, $0);
                }
                
            }
            console.log.apply(console, arguments);
        },

        scaffold: function(config) {
            scaffolding.generate(config, rapido);
        },
        $0: $0,
        configFilename: 'rapido.json',
        stackConfigFilename: 'rapido-stack.json',
        additionalStackDirs: [],
        additionalNodeModulesDirs: [],
        additionalEnabledStacks: [],

        exclusiveStackCommands: function(stackName) {
            _exclusiveStackCommands.push(stackName);
        },

        init: function() {
            if (this.initialized) {
                return;
            }

            this.initialized = true;

            var startTime = Date.now();
            var configFilename = rapido.configFilename;
            var stackConfigFilename = rapido.stackConfigFilename;

            var config = rapido.config;

            if (!config) {
                config = rapido.config = {};
                
                require('./config-loader').loadConfigs(
                    config,
                    buildDefaultUserConfigPaths(rapido), 
                    configFilename, 
                    rapido);

                var stacks = require('./config-loader').loadStackConfigs(
                    config,
                    buildStackConfigPaths(rapido), 
                    stackConfigFilename, 
                    rapido); 

                if (_exclusiveStackCommands) {
                    _exclusiveStackCommands.forEach(function(stackName) {
                        var stack = stacks[stackName];
                        if (stack) {
                            if (stack.commands) {
                                raptor.forEachEntry(stack.commands, function(commandName, commandConfig) {
                                    rapido.commands.exclusiveStackCommand(stackName, commandName);
                                });
                            }
                            
                        }
                    });
                }
                
                raptor.forEachEntry(stacks, function(stackName, stackConfig) {
                    rapido.registerStack(stackConfig);
                });

            }

            var enabledStackNames = rapido.config['use'] || [];

            this.disableAllStacks();

            
            enabledStackNames = enabledStackNames.concat(rapido.additionalEnabledStacks);
            enabledStackNames.push('default'); // Always enable the default stack

            enabledStackNames.forEach(function(enabledStackName) {
                if (!rapido.stackExists(enabledStackName)) {
                    rapido.log.warn('WARN', "Enabled stack not found: " + enabledStackName);
                }
                else {
                    this.enableStack(enabledStackName);    
                }
                
            }, this);

            logger.debug('rapido configuration loaded in ' + (Date.now() - startTime) + 'ms');
        },

        disableAllStacks: function() {
            this.commands.disableAllStacks();
        },

        enableStack: function(stackName) {
            if (!this.initialized) {
                rapido.additionalEnabledStacks.push(stackName);
                return;
            }
            
            var stack = this.commands.getStack(stackName);
            if (!stack) {
                throw new Error("Unable to enable stack. Invalid stack: " + stackName);
            }

            this.commands.enableStack(stackName);
        },
        
        isStackEnabled: function(stackName) {
            return this.commands.isStackEnabled(stackName);
        },

        getStacks: function() {
            return this.commands.getStacks();
        },

        stackExists: function(stackName) {
            return this.commands.getStack(stackName) != null;
        },

        getEnabledStacks: function(stackName) {
            return this.commands.getEnabledStacks();
        },

        registerStack: function(stackConfig) {
            this.commands.registerStack(stackConfig);
        },

        registerCommand: function(stackName, commandName, commandConfig) {
            this.commands.registerCommand(stackName, commandName, commandConfig);
        },

        getCommandModule: function(stackName, commandName) {
            var command = rapido.commands.getCommand(stackName, commandName);
            return command.getModule();
        },

        runCommand: function(stackName, commandName, options) {
            if (typeof arguments[0] !== 'string') {
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
                command.run(options || {}, rapido.config, rapido);    
            }
            catch(e) {
                if (e === '') {
                    throw e;
                }

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
                configFilename = rapido.configFilename;
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
                config: config,
                path: this.relativePath(file)
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
            
            var newPropsArray = [];

            raptor.forEachEntry(newProps, function(name, value) {
                if (config[name] !== value) {
                    newPropsArray.push('    ' + name + ': ' + value);
                }
            });

            var path = this.relativePath(jsonFile);

            if (newPropsArray.length) {
                raptor.extend(config, newProps);
                jsonFile.writeAsString(JSON.stringify(config, null, "    "));    
                rapido.log.info('update', 'Updated the following properties in "' + path + '":');
                newPropsArray.forEach(function(newPropStr) {
                    rapido.log.info('update', newPropStr);
                });
            }
            else {
                rapido.log.info('skip', 'No changes to "' + path + '"');
            }

            return {
                config: config,
                file: jsonFile,
                path: this.relativePath(jsonFile),
                updated: updated
            };
        },

        _parseArgs: function(args) {
            this.init();

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
                commandParts = ['_default'];
            }

            var enabledStacks = this.getEnabledStacks();

            var commandName;

            for (var i=commandParts.length-1; i>=0; i--) {
                commandName = commandParts.slice(0, i+1).join(' ');

                enabledStacks.forEach(function(stack) {
                    // We want to filter out certain commands from being listed if
                    // they are exclusive to a certain stack and that is what the
                    // "shouldListCommand" method will do for us
                    if (this.commands.shouldListCommand(stack.name, commandName)) {

                        var command = stack.getCommand(commandName);
                        if (command) {
                            matchingCommands.push(command);
                        }    
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
                commandName = commandParts.join(' ');
            }

            function forEachCommand(callback, thisObj) {
                matchingCommands.forEach(callback, thisObj);
            };

            return {
                matchingCommands: matchingCommands,
                optionArgs: optionArgs,
                commandName: commandName,
                hasMatchingCommands: matchingCommands.length > 0,
                forEachCommand: forEachCommand
            };
        },


        /**
         * This method is used by the Bash shell to support
         * command line auto-completion for command names
         * and command options.
         *
         * See:
         * http://www.gnu.org/software/bash/manual/bash.html#Programmable-Completion-Builtins
         * 
         * @param  {String} line      The auto-completion line (i.e. COMP_LINE)
         * @param  {int} cursorPos    The index into the line where the cursor is
         * @return {void}
         */
        outputCompletions: function(line, cursorPos) {
            this.init();

            if (cursorPos == null) {
                cursorPos = line.length;
            }

            /*
            Use cases:
    
            1) Completion on option value:
            rap some command --options opt

            Expected: (no completions)

            2) Completion on option name
            rap some comm

            Expected: Complete last words of any matching commands

            3) Completion on rap
            rap

            Expected: Output first word for all enabled commends
            */

            // We only care about the string up to the cursor
            line = line.substring(0, cursorPos);
            
            // Chop off the shell command name used to invoke Rapido
            var firstWordRegExp = /^([^\s]+)\s*/g;
            var firstWordMatches = firstWordRegExp.exec(line);
            if (firstWordMatches) {
                line = line.substring(firstWordRegExp.lastIndex);
            }

            // First find where the options start:
            var optionsStartMatches = /\s-/.exec(line);
            var optionsStart = -1;
            
            if (optionsStartMatches) {
                optionsStart = optionsStartMatches.index;
            }

            // Find where the current word is based on the cursor position
            var currentWord;
            var currentWordStart = -1;
            var currentWordRegExp = /([^\s^]+)$/g;

            var currentWordMatches = currentWordRegExp.exec(line);
            if (currentWordMatches) {
                currentWord = currentWordMatches[1];
                currentWordStart = currentWordMatches.index;
            }
            else {
                currentWord = '';
                currentWordStart = line.length;
            }

            var completions = [];
            var foundCompletions = {};

            function add(completion) {
                if (!foundCompletions[completion]) {
                    foundCompletions[completion] = true;
                    completions.push(completion);
                }
            }

            if (optionsStart !== -1) {

                if (/^--?.*$/.test(currentWord)) {
                    // The current word is an option name so we are expected to
                    // have a complete command
                    var parseInfo = this._parseArgs(line.split(/\s+/));
                    if (!parseInfo.hasMatchingCommands) {
                        // Invalid command...we cannot complete the option names
                        return;
                    }

                    // Loop over all the matching commands to look for matching options
                    parseInfo.forEachCommand(function(command) {
                        
                        // Get a list of allowed options for the current command as an array
                        // NOTE: The "-" and "--" prefixes will be included for each option
                        var allowedOptions = command.getAllowedOptions();
                        allowedOptions.forEach(function(allowedOption) {
                            if (allowedOption.startsWith(currentWord)) {
                                add(allowedOption);
                            }
                        })
                    }, this);
                }
                else {
                    // We are after the options, but the current word is not an option
                    // name so we can't auto-complete the current word
                    return;
                }
                    
            }
            else {
                var enabledStacks = this.getEnabledStacks();

                enabledStacks.forEach(function(stack) {
                    stack.forEachCommand(function(command) {
                        if (command.name.startsWith('_')) {
                            return;
                        }

                        // Find the start of the last word
                        if (command.name.startsWith(line)) {
                            add(command.name.substring(currentWordStart));
                        }
                    }, this);
                }, this);
                    
            }

            if (completions.length) {
                completions.sort(function(a, b) {
                    a = a.toLowerCase();
                    b = b.toLowerCase();
                    return a < b ? -1 : (a === b ? 0 : 1);
                });

                require('util').print(completions.join('\n'));    
            }
        },

        doRun: function(args) {
            this.init();

            if (process.env.COMP_LINE) {
                this.outputCompletions(process.env.COMP_LINE, process.env.COMP_POINT);
                return;
            }

            args = args.slice(2);

            function onErr(err) {
                console.error(err);
            }
            
            var parseInfo = this._parseArgs(args);
            var commandName = parseInfo.commandName;
            var matchingCommands = parseInfo.matchingCommands;
            var optionArgs = parseInfo.optionArgs;

            if (!matchingCommands.length) {
                rapido.log.error('Command not found: ' + commandName);
                return;
            }
            
            function invokeCommand(command) {
                var startTime = Date.now();
                console.log('Running command "' + command.name + '" (stack: ' + command.stack.name + ')...\n');    
                
                try
                {
                    var commandModule = require(command.file.getAbsolutePath());
                    var commandArgs;
                    var options = command.getOptions();
                    if (options) {
                        
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
                    if (e !== '') {
                        logger.error(e);    
                    }
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
            
            exports.instance = rapido;

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
                    rapido.doRun(args);
                });
            }
        },

        relativePath: function(filePath) {
            if (filePath instanceof File) {
                filePath = filePath.getAbsolutePath();
            }
            return path.relative(process.cwd(), filePath);
        },
        
        addNodeModulesDir: function(path) {
            rapido.additionalNodeModulesDirs.push(path);
        },
        
        addStackDir: function(path) {
            rapido.additionalStackDirs.push(path);
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


