var File = require('raptor/files/File'),
    files = require('raptor/files'),
    path = require('path'),
    raptor = require('raptor');

module.exports = {
    usage: 'Usage: $0 create command',

    options: {
        'overwrite': {
            describe: 'Overwrite existing template if one exists',
            boolean: true
        }
    },

    validate: function(args, rapido) {
        return args;
    },

    run: function(args, config, rapido) {
        var stackName,
            commandName,
            description,
            overwrite = args.overwrite === true;

        var stackConfig = rapido.findClosestConfig();
        var stackFile = stackConfig['stack.file'];
        
        if (!stackFile) {
            stackFile = new File(process.cwd(), "rapido-stack.json");
        }

        if (!stackFile.exists()) {
            throw '"stack.file" missing in rapido.json. This property should point to the location of "rapido-stack.json"';
        }

        var commandsDir = stackConfig['commands.dir'];
        if (!commandsDir) {
            commandsDir = new File(stackFile.getParentFile(), "commands");
        }

        rapido.prompt({
                confirm: true,
                properties: {
                    'commandName': {
                        description: 'Command name',     // Prompt displayed to the user. If not supplied name will be used.
                        pattern: /^[a-zA-Z0-9\-_ ]+$/,                  // Regular expression that input must be valid against.
                        message: 'Enter a valid command name',
                        required: true
                    },
                    'description': {
                        description: 'Description',
                        required: true
                    },
                }  
            })
            .then(function(input) {
                commandName = input.commandName;
                description = input.description;

                if (!commandName) {
                    return;
                }

                var stackConfig = JSON.parse(stackFile.readAsString());
                var filenameNoExt = 'command-' + commandName.replace(/[^a-zA-Z0-9_-]/g, '-');
                var filename = filenameNoExt + '.js';
                var commandFile = new File(commandsDir, filename);

                stackConfig.commands[commandName] = {
                    "description": description,
                    "file": path.relative(stackFile.getParent(), commandFile.getAbsolutePath())
                }

                rapido.scaffold(
                    {
                        scaffoldDirProperty: "scaffold.command.dir",
                        outputDir: commandFile.getParentFile(),
                        data: {
                            filename: filename,
                            filenameNoExt: filenameNoExt,
                            commandName: commandName
                        },
                        overwrite: overwrite,
                        afterFile: function(outputFile) {
                            
                        }
                    });

                
                rapido.log.success('finished', 'Command written to "' + commandFile + '"');

                stackFile.writeAsString(JSON.stringify(stackConfig, null, 4));
                rapido.log.info('save', 'Registered command in "' + stackFile.getAbsolutePath() + '"');

                
            })
            .fail(function(e) {
                rapido.log.error('failed', 'Unable to create command. Exception: ' + (e.stack || e));
            });
    }
}


        