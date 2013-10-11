


function get(options, cb) {
    var prompt = require('prompt');
    var raptor = require('raptor');
    var promises = require('raptor/promises');
    var rapido = require('./rapido').instance;

    options.override = options.override || {};
    options.values = options.values || {};

    var properties = options.properties;
    var shouldConfirm = options.confirm ? true : false;
    var values = options.values;
    var override = options.override;
    var selectedOptions = {};
    var skip = options.skip || {};

    var deferred = promises.defer();

    function onError(err) {
        deferred.reject(err);
        if (cb) {
            cb(err);
        }
    }

    if (!properties) {
        onError(new Error('No properties specified'));
    }

    function done(input) {
        deferred.resolve(input);

        if (cb) {
            cb(null, input);
        }
    }

    function confirm(input) {
        
        console.log();
        rapido.log.success(typeof options.confirm === 'string' ? options.confirm : 'YOU ENTERED:');
        for (var propName in properties) {
            if (properties.hasOwnProperty(propName)) {
                var property = properties[propName];
                var value;
                if (property.options) {
                    var selectedOption = selectedOptions[propName];
                    if (selectedOption) {
                        value = selectedOption.label;
                    }
                    else {
                        value = override[propName];
                    }
                }
                else {
                    if (property.hidden) {
                        value = "(hidden)";
                    }
                    else {
                        value = input[propName];    
                    }
                    
                }
                rapido.log.info(property.description, value || '(blank)');
            }
        }

        prompt.start();
        prompt.get({
                properties: {
                    "continue": {
                        type: 'string', 
                        description: 'Continue?',
                        default: 'Y',
                        required: true
                    }
                }
            },
            function(err, result) {
                if (err) {
                    onError(err);
                    return;
                }

                var cont = (result['continue'] || '').toUpperCase();

                if (cont === 'Y' || cont === 'YES' ) {
                    done(input);
                }
                else {
                    // Start over
                    currentIndex = 0;
                    handleNextPrompt();
                }
            });    
    }

    var currentIndex = 0;
    prompt.start();

    var propertyArray = Object.keys(properties).map(function(propertyName) {
        var property = properties[propertyName];
        property.name = propertyName;
        return property;
    });

    var context = raptor.extend({}, options);
    

    function nextPrompt() {
        if (currentIndex === propertyArray.length - 1) {
            if (shouldConfirm !== false) {
                confirm(values);
            }
            else {
                done(values);
            }
        }
        else {
            currentIndex++;
            handleNextPrompt();
        }
    }

    function handleNextPrompt() {
        var property = propertyArray[currentIndex];
            
        context.property = property;

        if (property.beforePrompt) {
            property.beforePrompt(context);
        }

        var propertyName = property.name;
        if (property.default == null && values[propertyName] != null) {
            property.default = values[propertyName];
        }

        var promptProperties = {};
        promptProperties[propertyName] = property;
        if (override[propertyName] == null) {
            delete override[propertyName];
        }

        if (override[propertyName] != null || property.skip === true || skip[propertyName] === true) {
            if (override[propertyName]) {
                values[propertyName] = override[propertyName];
            }
            nextPrompt();
            return;
        }
        var optionIndex;

        if (property.options) {
            console.log();
            property.options.forEach(function(option, i) {
                var label;
                if (typeof option === 'string') {
                    label = option;
                }
                else {
                    label = option.label || option.description;
                }

                rapido.log.info((i+1), label);
            });
            
            property.default = '1';


            var curValue = values[propertyName];

            // Default to the correct index if there is already a value provided...
            if (curValue != null) {
                for (var i=0, len=property.options.length; i<len; i++) {
                    var curOption = property.options[i];
                    if (curOption === curValue || (typeof curOption === 'object' && curOption.value === curValue)) {
                        property.default = (i+1).toString();
                        break;
                    }
                } 
            }
            

            property.pattern = /^[0-9]+$/;                  // Regular expression that input must be valid against.
            property.message = property.message || 'Invalid choice'; // Warning message to display if validation fails.
            property.conform = function(value) {
                if (value === '') {
                    return false;
                }

                optionIndex = parseInt(value, 10) - 1;
                return optionIndex >= 0 && optionIndex < property.options.length;
            };

            property.before = function(value) {
                return value == '' ? '1' : value;
            };
        }

        prompt.get(
            {
                properties: promptProperties
            },
            function(err, input) {
                if (err) {
                    onError(err);
                    return;
                }

                if (property.options) {
                    var selectedOption = property.options[optionIndex];
                    var selectedLabel = selectedOption;
                    var selectedValue = selectedOption;

                    if (typeof selectedOption === 'object') {
                        selectedLabel = selectedOption.label || selectedOption.description;
                        selectedValue = selectedOption.value;
                    }

                    values[propertyName] = selectedValue;
                    selectedOptions[propertyName] = {
                        label: selectedLabel,
                        value: selectedValue
                    }
                }
                else {
                    // Copy input back to values object
                    values[propertyName] = input[propertyName];    
                }
                

                if (property.afterPrompt) {
                    property.afterPrompt(context);
                }

                nextPrompt();
            });
    }

    handleNextPrompt();

    return deferred.promise;
}

get.start = function() {
    // No-op
}

get.get = get;

module.exports = get;