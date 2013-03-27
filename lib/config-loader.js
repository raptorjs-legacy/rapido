var raptor = require('raptor'),
    files = require('raptor/files'),
    File = require('raptor/files/File');

function resolveFiles(o, dir, file) {
    raptor.forEachEntry(o, function(key, value) {
        if (typeof value === 'string') {

            var isFile = key.endsWith('.file') || key === 'file';
            var isDir = key.endsWith('.dir') || key === 'dir';
            if (isFile || isDir) {
                var path = files.resolvePath(dir.getAbsolutePath(), value);
                if (!files.exists(path)) {
                    throw new Error('Invalid configuration value for "' + key + '" in "' + file.getAbsolutePath() + '". File does not exist: ' + value + ' (' + path + ')');
                }

                value = new File(path);

                if (isDir && !value.isDirectory()) {
                    throw new Error('Invalid configuration value for "' + key + '" in "' + file.getAbsolutePath() + '". Directory expected but file found.');
                }
                
                if (isFile && !value.isFile()) {
                    throw new Error('Invalid configuration value for "' + key + '" in "' + file.getAbsolutePath() + '". File expected but directory found.');
                }
            }
            
        }
        else if (typeof value === 'object') {
            resolveFiles(value, dir, file);
        }
        else if (Array.isArray(value)) {
            value.forEach(function(el) {
                if (typeof el === 'object') {
                    resolveFiles(el, dir, file);
                }
            })
        }

        o[key] = value;
    });
}

function registerCommands(rapido, stackName, config, dir) {
    raptor.forEachEntry(config, function(key, value) {
        if (key.startsWith('stack.')) {
            stackName = key.substring('stack.'.length);

            if (!value.version) {
                // See if we can determine the version
                // from a package.json file
                var packageFile = new File(dir, "package.json");
                try
                {
                    var packageMeta = JSON.parse(packageFile.readAsString());    
                    value.version = packageMeta.version;
                }
                catch(e) {
                    // Ignore the error...
                }
            }
            rapido.registerStack(stackName, value);
            registerCommands(rapido, stackName, value);
        }
        else if (key.startsWith('command.')) {
            var commandName = key.substring('command.'.length);
            rapido.registerCommand(stackName, commandName, value);
        }
    })
}

exports.loadConfig = function loadConfig(paths, configFilename, rapido) {
    var config = {};
    
    for (var i=paths.length-1; i>=0; i--) {
        var dir = paths[i];
        if (typeof dir === 'string') {
            dir = new File(dir);
        }

        var configFile = new File(dir, configFilename);
        if (configFile.exists() && configFile.isFile()) {
            var json = configFile.readAsString();
            var curConfig;
            try
            {
                curConfig = JSON.parse(json)    
            }
            catch(e) {
                throw new Error('Unable to parse JSON file at path "' + configFile.getAbsolutePath() + '. Error: ' + e);
            }

            // Resolve relative file paths and directories
            resolveFiles(curConfig, dir, configFile);
            raptor.extend(config, curConfig);
            registerCommands(rapido, 'default', curConfig, dir);
        }
    };

    return config;
};