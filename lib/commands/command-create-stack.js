var File = require('raptor/files/File'),
    files = require('raptor/files'),
    path = require('path'),
    raptor = require('raptor');

module.exports = {
    usage: 'Usage: $0 create command',

    options: {
        'dir': {
            describe: 'Output directory (defaults to current working directory)'
        },

        'overwrite': {
            describe: 'Overwrite existing template if one exists',
            boolean: true
        }
    },

    validate: function(args, rapido) {
        return args;
    },

    run: function(args, config, rapido) {
        var curDir = new File(process.cwd());

        var name = curDir.getName(),
            commandName,
            description,
            overwrite = args.overwrite === true;

        var scaffoldDir = config["scaffold.stack.dir"];
        if (!scaffoldDir) {
            console.error('"scaffold.stack.dir" not defined in ' + rapido.configFilename + ' config file');
            return;
        }

        

        var prompt = rapido.prompt;
        prompt.start();
        prompt.get(
            {
                properties: {
                    'name': {
                        description: 'Stack name [' + name + ']',
                        required: false
                    },
                    'description': {
                        description: 'Description',
                        required: false
                    },
                }       
            }
            , 
            function (err, result) {
                if (err) { 
                    rapido.log.error(err);
                    return;
                }
                
                name = result.name || name;
                description = result.description;
                var dir = args.dir;
                if (dir) {
                    dir = path.resolve(process.cwd(), dir);
                }
                else {
                    dir = process.cwd()
                }

                var outputDir = new File(dir);

                rapido.scaffold(
                    {
                        scaffoldDir: scaffoldDir,
                        outputDir: outputDir,
                        data: {
                            name: name,
                            description: description
                        },
                        overwrite: overwrite,
                        afterFile: function(outputFile) {
                            
                        }
                    });

                rapido.log.success('finished', 'Stack written to "' + outputDir + '"');
                rapido.log();
                rapido.log('Your stack is ready to be published to npm using the following command:');
                rapido.log.info('npm publish');
                rapido.log();
                rapido.log('Try your stack out:');
                rapido.log.info('$0 use ' + name);
                rapido.log.info('$0 say hello world --upper-case');
            });
    }
}


        