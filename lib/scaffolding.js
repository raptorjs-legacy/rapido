var dust = require('dustjs-linkedin');
var File = require('raptor/files/File');
var path = require('path');
var pathFilters = require('path-filters');

dust.optimizers.format = function(ctx, node) { return node; };

var templateHandlers = {
    'dust': function(file, data, callback, context) {
        var inputTemplate = file.readAsString();
        var templateName = file.getName();
        var compiled;

        try
        {
            compiled = dust.compile(inputTemplate, templateName, false);
            dust.loadSource(compiled);
        }
        catch(e) {
            throw new Error('The content of "' + file.getAbsolutePath() + '" is not a valid Dust template. Exception: ' + e);
        }

        try {
            dust.render(
                templateName,
                data,
                function(err, out) {
                    callback(err, out);
                });
        }
        catch(e) {
            callback(e);
            
        }
    },

    'ejs': function(file, data, callback, context) {
        var ejs = require('ejs');

        ejs.renderFile(file.getAbsolutePath(), {
            data: data,
            cache: true
        }, callback);
    }
};


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
            throw '';
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

    function copyFile(outputFile, out, relPath, isBinary) {
        if (beforeFile) {
            var result = beforeFile(
                outputFile,
                out);

            if (result === false) {
                logWarn('skip', 'Skipped: ' + relPath);
                return;
            }
        }

        var label = outputFile.exists() ? 'overwrite' : 'create';
        if (isBinary) {
            outputFile.writeAsBinary(out);
        }
        else {
            outputFile.writeAsString(out);
        }
        
        logSuccess(label, relPath);
    }

    var excludes = pathFilters.create();

    // The caller might wish to exclude certain scaffolding files so they can do by passing
    // an array of excludes. The exclude filters are handled by the path-filters module which
    // supports the following types of excludes:
    // - Function: a function that returns true if the file is a match and should be excluded
    // - String: a simple string regular expression (e.g. "test/Demo*.ejs" or "test/Demo.ejs")
    // - RegExp: a Regular Expression that will test if file path is a match and should be excluded
    //
    // NOTE: The exclude filters operates on file paths that are relative to the scaffold directory
    if (options.excludes) {
        excludes.add(options.excludes);
    }

    function isExcluded(file) {

        if (file.getName() === '.DS_Store') {
            return;
        }

        // don't copy directories
        if (file.getAbsolutePath() === scaffoldDir.getAbsolutePath() || file.isDirectory()) {
            return;
        }

        // find the path to the file relative to the scaffold directory
        var relPath = path.relative(scaffoldDir.getAbsolutePath(), file.getAbsolutePath());
        if (excludes.hasMatch(relPath)) {
            return true;
        }

        return false;
    }


    require('raptor/files/walker').walk(
        scaffoldDir,
        function(file) {

            if (isExcluded(file)) {
                return;
            }

            if (file.isDirectory() || file.getAbsolutePath() === scaffoldDir.getAbsolutePath()) {
                return;
            }
            
            if (file.getName() === '.DS_Store') {
                return;
            }

            var outputPath = file.getAbsolutePath().slice(scaffoldDir.getAbsolutePath().length + 1);

            var ext = file.getExtension();
            var templateHandler = templateHandlers[ext];
            if (templateHandler || ext === 'raw') {
                outputPath = outputPath.slice(0, 0-(ext.length+1));
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

            var context = {
                relPath: relPath
            };

            var alreadyExists = outputFile.exists();
            var out;

            if (!alreadyExists || overwrite) {

                try
                {
                    if (templateHandler) {
                        templateHandler(
                            file,
                            data,
                            function(err, out) {
                                if (err) {
                                    logError('error', 'Unable to render Dust template at path "' + relPath + '". Exception: ' + err);
                                }
                                else {
                                    copyFile(outputFile, out, relPath, false);
                                }
                            },
                            context);
                    }
                    else {
                        out = file.readAsBinary();
                        copyFile(outputFile, out, relPath, true);
                    }
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