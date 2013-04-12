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

        var projectConfigInfo = rapido.findClosestConfig();
        var projectConfig = projectConfigInfo.config;
        var projectConfigFile = projectConfigInfo.file;
        var defaultStack = 'default';

        var stacks = projectConfig.stacks;
        if (stacks) {
            var stackNames = Object.keys(stacks);
            if (stackNames && stackNames.length) {
                defaultStack = stackNames[0];
            }
        }

        var prompt = rapido.prompt;
        prompt.start();
        prompt.get(
            {
                properties: {
                    'stackName': {
                        description: 'Stack name [' + defaultStack + ']',
                        required: false
                    },
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
            }
            , 
            function (err, result) {
                if (err) { 
                    rapido.log.error(err);
                    return;
                }
                
                stackName = result.stackName || defaultStack;
                commandName = result.commandName;
                description = result.description;

                if (!commandName) {
                    return;
                }

                var filenameNoExt = commandName.replace(/[^a-zA-Z0-9_-]/g, '-');
                var filename = filenameNoExt + '.js';

                var commandsDir = config['commands.dir'] || new File(process.cwd());

                var outputFile = new File(commandsDir, filename);
                var outputDir = outputFile.getParentFile();
                var relativePath = path.relative(projectConfigFile.getParent(), outputFile.getAbsolutePath());

                if (!stacks) {
                    projectConfig.stacks = {};
                }

                var stack = stacks[stackName] || (stacks[stackName] = {
                    description: stackName
                });

                var commands = stack.commands || (stack.commands = {});

                commands[commandName] = {
                    description: description,
                    file: relativePath
                }

                rapido.updateConfig(projectConfigFile, projectConfig);
                rapido.log.info('save', 'Registered command in "' + projectConfigFile.getAbsolutePath() + '"');

                rapido.scaffold(
                    {
                        scaffoldDirProperty: "scaffold.command.dir",
                        outputDir: outputDir,
                        data: {
                            filename: filename,
                            filenameNoExt: filenameNoExt
                        },
                        overwrite: overwrite,
                        afterFile: function(outputFile) {
                            
                        }
                    });

                rapido.log.success('finished', 'Command written to "' + outputFile + '"');
            });
    }
}


        