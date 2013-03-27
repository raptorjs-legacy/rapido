var raptor = require('raptor');

var CommandRegistry = require('./CommandRegistry'),
    optimist = require('optimist'),
    prompt = require('prompt'),
    color = require('cli-color'),
    path = require('path'),
    File = require('raptor/files/File'),
    logger = require('raptor/logging').logger('rapido'),
    rapidoModuleDir = new File(path.join(__dirname, '..')),
    scaffolding = require('./scaffolding');

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

function buildDefaultConfigPaths() {
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

    // Add this directory since we have a .rapido file here
    paths.add(new File(__dirname));

    var foundNodeModulesDir = {};

    function addFromNodeModules(nodeModulesDir) {
        // console.error("addFromNodeModules: " + nodeModulesDir.getAbsolutePath());

        if (!nodeModulesDir.exists()) {
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

    var rootNodeModulesDir = rapidoModuleDir.getParentFile();
    // console.error("rootNodeModulesDir: " + rootNodeModulesDir.getAbsolutePath());
    if (rootNodeModulesDir.getName() === 'node_modules') {
        addFromNodeModules(rootNodeModulesDir);
    }

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

        prompt: prompt,

        color: color,

        enabledStacks: [],

        enabledStacksByName: {},

        log: function(message) {
            console.log.apply(console, arguments);
        },

        scaffold: function(config) {
            scaffolding.generate(config, rapido);
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

        writeConfig: function(jsonFile, config) {
            if (typeof jsonFile === 'string') {
                jsonFile = new File(jsonFile);
            }

            jsonFile.writeAsString(JSON.stringify(config, null, "    "));
        },

        findClosestUserConfigFile: function(paths, configFilename) {
            if (!paths) {
                paths = buildDefaultUserConfigPaths();
            }

            if (!configFilename) {
                configFilename = ".rapido";
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

        updateUserConfig: function(jsonFile, newProps) {
            if (arguments.length === 1) {
                newProps = arguments[0];
                jsonFile = rapido.findClosestUserConfigFile();
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

        run: function(args) {
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
                rapido.log.info("\nAvailable commands:\n");
                this.runCommand('default', 'list', {showAll: false});
                this.log.info('Usage: rap <command-name> [command-args]\n');
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
                console.log('Running command "' + command.name + '" (' + command.stack.name + ' stack)...\n');

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

    function logColor(color, args) {
        if (args.length === 2) {
            var label = '[' + args[0] + ']',
                message = args[1],
                padding = rapido.padding(label, 10);
            rapido.log(padding + rapido.color[color](label) + ' ' + message);    
        }
        else {
            rapido.log(rapido.color[color](args[0]));    
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
        logColor('yellowBright', arguments);
    }

    raptor.extend(rapido.log, {
        success: logSuccess,
        info: logInfo,
        error: logError,
        warn: logWarn
    });

    return rapido;
}
