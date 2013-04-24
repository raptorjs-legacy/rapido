var raptor = require('raptor'),
    files = require('raptor/files'),
    File = require('raptor/files/File');



function loadConfigs(config, paths, configFilename, rapido, isStack) {
    var curConfig,
        curDir,
        curConfigFile;

    function getExtraInfo(object) {
        var extraInfo = object._extraInfo;
        if (!extraInfo) {

            extraInfo = {};

            Object.defineProperty(object, '_extraInfo', {
                value: extraInfo
            });

            Object.defineProperty(object, 'getPropertySourceFile', {
                value: function(propName) {
                    return extraInfo[propName + '|sourceFile'];
                }
            });
            
            Object.defineProperty(object, 'getPropertySourcePath', {
                value: function(propName) {
                    var sourceFile = this.getPropertySourceFile();
                    return sourceFile ? rapido.relativePath(sourceFile) : null;
                }
            });

            Object.defineProperty(object, 'getUnresolvedProperty', {
                value: function(propName) {
                    return extraInfo[propName + '|unresolved'];
                }
            });
        }
        return extraInfo;
    }

    function resolveFilePath(key, value, extraInfo) {

        
        var isFile = key.endsWith('.file') || key === 'file';
        var isDir = key.endsWith('.dir') || key === 'dir';
        if (isFile || isDir) {
            extraInfo[key + '|unresolved'] = value;

            var path = files.resolvePath(curDir.getAbsolutePath(), value);
            return new File(path);
        }
        
        return value;
    }


    function resolveFilePaths(o) {
        if (Array.isArray(o)) {
            o.forEach(resolveFilePaths);
        }
        else if (o != null && typeof o === 'object') {
            var extraInfo = getExtraInfo(o);
            raptor.forEachEntry(o, function(key, value) {
                extraInfo[key + '|sourceFile'] = curConfigFile;
                if (typeof value === 'string') {
                    o[key] = resolveFilePath(key, value, extraInfo);
                }
                else if (value != null && typeof value === 'object') {
                    resolveFilePaths(value);
                }
            });
        }
    }

    function registerStack(config) {

        var stackName = config.name;
        var stackDescription = config.description;
        var stackVersion = config.version;
        var commands = config.commands;

        delete config.name;
        delete config.description;
        delete config.version;
        delete config.commands;

        if (!stackVersion) {
            // See if we can determine the version
            // from a package.json file
            var packageFile = new File(curDir, "package.json");
            try
            {
                var packageMeta = JSON.parse(packageFile.readAsString());    
                stackVersion = packageMeta.version;
            }
            catch(e) {
                // Ignore the error...
            }
        }
        
        resolveFilePaths(commands);

        rapido.registerStack({
            name: stackName,
            description: stackDescription,
            version: stackVersion,
            commands: commands
        });
    }

    function copyProperties(source, target) {
        var extraInfo = getExtraInfo(target);

        raptor.forEachEntry(source, function(key, value) {
            if (!target.hasOwnProperty(key)) {
                extraInfo[key + '|sourceFile'] = curConfigFile;

                if (typeof value === 'object') {
                    resolveFilePaths(value);
                }
                else if (typeof value === 'string') {
                    value = resolveFilePath(key, value, extraInfo);
                }
                target[key] = value;
            }
        });
    }
    
    for (var i=0, len=paths.length; i<len; i++) {
        curDir = paths[i];
        if (typeof curDir === 'string') {
            curDir = new File(curDir);
        }

        curConfigFile = new File(curDir, configFilename);
        if (curConfigFile.exists() && curConfigFile.isFile()) {

            var json = curConfigFile.readAsString();
            //console.error(curConfigFile.getAbsolutePath(), json);
            
            try
            {
                curConfig = JSON.parse(json)    
            }
            catch(e) {
                throw new Error('Unable to parse JSON file at path "' + curConfigFile.getAbsolutePath() + '. Error: ' + e);
            }

            if (isStack) {
                registerStack(curConfig);
            }
            else {

                var use = curConfig.use;

                if (use) {

                    if (!Array.isArray(use)) {
                        use = [use];
                    }

                    if (config.use) {
                        config.use = config.use.concat(use);
                    }
                    else {
                        config.use = use;
                    }
                }
            }

            copyProperties(curConfig, config);
        }
    };

    return config;
};

exports.loadConfigs = function loadConfig(config, paths, configFilename, rapido) {
    return loadConfigs(config, paths, configFilename, rapido, false);
}

exports.loadStackConfigs = function loadConfig(config, paths, configFilename, rapido) {
    return loadConfigs(config, paths, configFilename, rapido, true);
}

