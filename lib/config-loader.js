var raptor = require('raptor'),
    files = require('raptor/files'),
    File = require('raptor/files/File');



exports.loadConfig = function loadConfig(paths, configFilename, rapido) {
    var config = {},
        curConfig,
        curDir,
        curConfigFile;

    function registerCommands(stackName, config) {

        var stacks = config.stacks;

        if (stacks) {
            raptor.forEachEntry(stacks, function(stackName, stackConfig) {
                if (!stackConfig.version) {
                    // See if we can determine the version
                    // from a package.json file
                    var packageFile = new File(curDir, "package.json");
                    try
                    {
                        var packageMeta = JSON.parse(packageFile.readAsString());    
                        stackConfig.version = packageMeta.version;
                    }
                    catch(e) {
                        // Ignore the error...
                    }
                }
                rapido.registerStack(stackName, stackConfig);
                registerCommands(stackName, stackConfig);
            })
        }

        var commands = config.commands;
        if (commands) {
            raptor.forEachEntry(commands, function(commandName, commandConfig) {
                rapido.registerCommand(stackName, commandName, commandConfig);
            });
        }
    }
    
    function processProperties(source, target) {

        var extraInfo = target._extraInfo;
        if (!extraInfo) {

            extraInfo = {};

            Object.defineProperty(target, '_extraInfo', {
                value: extraInfo
            });

            Object.defineProperty(target, 'getPropertySourceFile', {
                value: function(propName) {
                    return extraInfo[propName + '|sourceFile'];
                }
            });
            
            Object.defineProperty(target, 'getPropertySourcePath', {
                value: function(propName) {
                    var sourceFile = this.getPropertySourceFile();
                    return sourceFile ? rapido.relativePath(sourceFile) : null;
                }
            });

            Object.defineProperty(target, 'getUnresolvedProperty', {
                value: function(propName) {
                    return extraInfo[propName + '|unresolved'];
                }
            });
        }

        raptor.forEachEntry(source, function(key, value) {
            if (key === '_extraInfo') {
                return;
            }

            extraInfo[key + '|sourceFile'] = curConfigFile;

            if (typeof value === 'string') {

                var isFile = key.endsWith('.file') || key === 'file';
                var isDir = key.endsWith('.dir') || key === 'dir';
                if (isFile || isDir) {
                    extraInfo[key + '|unresolved'] = value;

                    var path = files.resolvePath(curDir.getAbsolutePath(), value);
                    value = new File(path);
                    
                }
            }
            else if (Array.isArray(value)) {
                value.forEach(function(el) {
                    if (el && typeof el === 'object') {
                        processProperties(el, el);
                    }
                })
            }
            else if (value && typeof value === 'object') {

                processProperties(value, value);
            }

            target[key] = value;
        });
    }

    for (var i=paths.length-1; i>=0; i--) {
        curDir = paths[i];
        if (typeof curDir === 'string') {
            curDir = new File(curDir);
        }

        curConfigFile = new File(curDir, configFilename);
        if (curConfigFile.exists() && curConfigFile.isFile()) {
            var json = curConfigFile.readAsString();
            
            try
            {
                curConfig = JSON.parse(json)    
            }
            catch(e) {
                throw new Error('Unable to parse JSON file at path "' + curConfigFile.getAbsolutePath() + '. Error: ' + e);
            }

            // Resolve relative file paths and directories
            processProperties(curConfig, config);
            registerCommands('default', curConfig);
        }
    };

    

    return config;
};