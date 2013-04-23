function(line, cursorPos) {
    this.init();

    if (!cursorPos) {
        cursorPos = line.length;
    }

    /*
    Use cases:

    1) Completion on option value:
    rap some command --options opt

    Expected: (no completions)

    2) Completion on option name
    rap some comm

    Expected: Complete last words of any matching commands

    3) Completion on rap
    rap

    Expected: Output first word for all enabled commends
    */

    // We only care about the string up to the cursor
    line = line.substring(0, cursorPos);
    
    // Chop off the shell command name used to invoke Rapido
    var firstWordRegExp = /^([^\s]+)\s*/g;
    var firstWordMatches = firstWordRegExp.exec(line);
    if (firstWordMatches) {
        line = line.substring(firstWordRegExp.lastIndex);
    }

    // First find where the options start:
    var optionsStartMatches = /\s-/.exec(line);
    var optionsStart = -1;
    
    if (optionsStartMatches) {
        optionsStart = optionsStartMatches.index;
    }

    // Find where the current word is based on the cursor position
    var currentWord;
    var currentWordStart = -1;
    var currentWordRegExp = /([^\s^]+)$/g;

    var currentWordMatches = currentWordRegExp.exec(line);
    if (currentWordMatches) {
        currentWord = currentWordMatches[1];
        currentWordStart = currentWordMatches.index;
    }

    var completions = [];
    var foundCompletions = {};

    function add(completion) {
        if (!foundCompletions[completion]) {
            foundCompletions[completion] = true;
            completions.push(completion);
        }
    }

    if (optionsStart !== -1) {

        if (/^--?.*$/.test(currentWord)) {
            //console.error('IS OPTION');
            // The current word is an option name so we are expected to
            // have a complete command
            
            var parseInfo = this._parseArgs(line.split(/\s+/));
            if (!parseInfo.hasMatchingCommands) {
                // Invalid command...we cannot complete the option names
                return;
            }

            parseInfo.forEachCommand(function(command) {
                var allowedOptions = command.getAllowedOptions();
                allowedOptions.forEach(function(allowedOption) {
                    if (allowedOption.startsWith(currentWord)) {
                        add(allowedOption);
                    }
                })
            }, this);
        }
        else {
            // We are after the options, but the current word is not option
            // name so we can't auto-complete the current word
            return;
        }
            
    }
    else {
        var enabledStacks = this.getEnabledStacks();

        enabledStacks.forEach(function(stack) {
            stack.forEachCommand(function(command) {
                // Find the start of the last word
                if (command.name.startsWith(line)) {
                    // Output the last word of the command as the completion
                    add(command.name.substring(currentWordStart));
                }
            }, this);
        }, this);
            
    }

    if (completions.length) {
        completions.sort(function(a, b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            return a < b ? -1 : (a === b ? 0 : 1);
        });

        console.log(completions.join('\n'));    
    }
}