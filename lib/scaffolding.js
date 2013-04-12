var dust = require('dustjs-linkedin'),
    File = require('raptor/files/File'),
    files = require('raptor/files'),
    path = require('path');

dust.optimizers.format = function(ctx, node) { return node; };

exports.generate = function(options, rapido) {
    var scaffoldDir = options.scaffoldDir,
        outputDir = options.outputDir,
        data = options.data,
        afterFile = options.afterFile,
        beforeFile = options.beforeFile,
        logSuccess = rapido.log.success,
        logWarn = rapido.log.warn,
        logError = rapido.log.error,
        overwrite = options.overwrite === true;
    

    if (options.scaffoldDirProperty) {
        scaffoldDir = rapido.config[options.scaffoldDirProperty];
        if (!scaffoldDir) {
            rapido.log.error('error', '"' + options.scaffoldDirProperty + '" not found in any ' + rapido.configFilename + ' file');
            return;
        }
        else if (scaffoldDir instanceof File) {
            if (!scaffoldDir.exists()) {
                rapido.log.error('error', '"' + options.scaffoldDirProperty + '" defined in "' + 
                    rapido.config.getPropertySourcePath(options.scaffoldDirProperty) + '" does not exist. Invalid file path: ' + 
                    scaffoldDir.getAbsolutePath()  + ' (original value: ' + rapido.config.getUnresolvedProperty(options.scaffoldDirProperty) + ')');
                return;
            }
        }
        else {
            throw new Error('File expected for property "' + options.scaffoldDirProperty + '". Actual: ' + scaffoldDir);
        }
    }
    else {
        if (!(scaffoldDir instanceof File)) {
            scaffoldDir = new File(scaffoldDir);
        }

        if (!scaffoldDir.exists()) {
            rapido.log.error('error', 'Scaffold directory does not exist: ' + scaffoldDir.getAbsolutePath());
            return;
        }
    }
    
    require('raptor/files/walker').walk(
        scaffoldDir, 
        function(file) {
            if (file.isDirectory() || file.getAbsolutePath() === scaffoldDir.getAbsolutePath()) {
                return;
            }
            
            if (file.getName() === '.DS_Store') {
                return;
            }

            var inputTemplate = file.readAsString();
            var templateName = file.getName();
            var compiled = dust.compile(inputTemplate, templateName, false);
            
            dust.loadSource(compiled);

            var outputPath = file.getAbsolutePath().slice(scaffoldDir.getAbsolutePath().length + 1);
            if (outputPath.endsWith('.dust')) {
                outputPath = outputPath.slice(0, 0-'.dust'.length);
            }
            
            var skip = false;
            
            var outputFile = new File(
                outputDir,
                outputPath.replace(/_([a-zA-Z0-9]+)_/g, function(match, varName) {
                        var replacement = data[varName];
                        if (replacement === false) {
                            skip = true;
                            return '';
                        }
                        else if (replacement === true) {
                            return '';
                        }
                        return replacement;
                    }));
            
            if (skip) {
                return false;
            }

            var relPath = path.relative(process.cwd(), outputFile.getAbsolutePath());
            
            var alreadyExists = outputFile.exists();
            if (!alreadyExists || overwrite) {

                try
                {
                    dust.render(
                        templateName, 
                        data, 
                        function(err, out) {

                            if (beforeFile) {
                                var result = beforeFile(
                                    outputFile,
                                    out);

                                if (result === false) {
                                    return;
                                }

                            }

                            var label = alreadyExists ? 'overwrite' : 'create';
                            outputFile.writeAsString(out);
                            logSuccess(label, relPath);
                        });
                }
                catch(e) {
                    logError('error', 'Unable to write "' + relPath + '". Exception: ' + e);
                }
            }
            else {
                logWarn('skip', 'Already exists: ' + relPath);
            }

            if (afterFile) {
                afterFile(outputFile);
            }
            
        },
        this);
};