var raptor = require('raptor');

var CommandRegistry = require('./CommandRegistry')

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
        config: null,
        commands: new CommandRegistry(),
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
            
        },
        registerStack: function(stackName, stackConfig) {
            this.commands.registerStack(stackName, stackConfig);
        },
        registerCommand: function(stackName, commandName, commandConfig) {
            this.commands.registerCommand(stackName, commandName, commandConfig);
        },
        run: function(argv) {

        }
    };

    return rapido;
}
