
function convertType(value, type) {
    value = value.trim();
    if (!type) {

        if ("true" === value) {
            return true;
        }
        else if ("false" === value) {
            return false;
        }
        else if (/^[+\-]?\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        else if (/^(\+|-)?((\d+(\.\d+)?)|(\.\d+))$/.test(value)) {
            return parseInt(value, 10);
        }
        else {
            return value;
        }
    }
    else if (type === 'int' || type === 'integer') {
        return parseInt(value, 10);
    }
    else if (type === 'number') {
        return parseFloat(value.trim());
    }
    else if (type === 'boolean') {
        return type === 'true';
    }
    else {
        return type;
    }
}

module.exports = {
    usage: 'Usage: $0 set <name> <value> [type]',

    options: {

    },

    validate: function(args, rapido) {
        var varArgs = args._;
        if (varArgs.length < 2) {
            throw 'name and value are required';
        }
        var name = varArgs[0],
            value = varArgs[1],
            type = varArgs[2];


        return {
            name: name,
            value: convertType(value, type)
        };
    },

    /**
     * @param options {Object} The parsed command options (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from ' + rapido.configFilename + ' config files
     * @param rapido {Object} A reference to the rapido module
     */
    run: function(options, config, rapido) {
        var propName = options.name,
            propValue = options.value;


        var closest = rapido.findClosestConfig();

        var isUpdate = closest.config.hasOwnProperty(propName);
        var oldValue = closest.config[propName] || "(not set)";
        var jsonFile = closest.file;

        if (typeof propValue === 'string' && (propName.endsWith('.file') || propName.endsWith('.dir') || propName === 'file' || propName === 'dir')) {

            var filePath = require('path').resolve(process.cwd(), propValue);
            var isDir = propValue.endsWith('dir');

            if (!require('raptor/files').exists(filePath)) {
                rapido.log.warn("warn", 'Resolved file path "' + filePath + '" does not exist for "' + propValue + '"');
            }

            propValue = require('path').relative(closest.file.getParent(), filePath);
        }

        var newProps = {};
        newProps[propName] = propValue;
        var result = rapido.updateConfig(jsonFile, newProps);

        var isUpdate = result.updated;

        rapido.log.info('done', '');
        
    }
}