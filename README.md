Rápido
======

Rápido is an extensible command line interface that enables rapid development for any technology stack. 
Rápido is written in JavaScript and is built on top of Node.js and npm.

# Installation

The only prerequisite for Rápido is Node. Rápido should be installed as a 
global script using `npm` as shown below:<br>
`npm install rapido --global`

# Overview

## Command
Rápido is extensible and supports any number of commands that can easily be installed using `npm`.
Based on the arguments passed to the Rápido CLI, Rápido will delegate the work to the appropriate command handler. A simple
command invocation is shown below:<br>
`rap create component ui/buttons/Button --no-testing`

In the above example, "create component" is the command name and "ui/buttons/Button" and "--no-testing" are additional
arguments to the command handler.

NOTE: Rápido uses `rap` for less typing.

Details on creating your own commands are described in the "Creating Custom Commands" section below.

## Stack
A stack is a collection of commands that are all related to a particular technology stack. Rápido supports
using multiple stacks, and new stacks can easily be installed from `npm` using the `rapido` CLI as described below. 
When running a command, the command is searched for in the stacks that are currently enabled.

### Installing Stacks
A new stack can be installed using the following command:<br>
`rap install <npm-module-ref>`

`npm-module-ref` can be any allowed module reference supported by npm.

Examples:
* `rap install rapido-raptorjs`
* `rap install rapido-raptorjs@0.1.0`
* `rap install https://github.com/raptorjs/rapido-raptorjs/tarball/v0.1.0`
* `rap install git+ssh://git@github.com:raptorjs/rapido-raptorjs.git#v0.1.0`

NOTE: When installed, a stack will be installed into the `node_modules` directory that is nested
within the directory containing the `rapido` module.

### Switching Stacks
The current stack can be switched using the `rap use` command as shown below:<br>
`rap use raptorjs`

It is also possible to enable multiple stacks:<br>
`rap use raptorjs backbone`

NOTE: If multiple stacks support the same command then you will be prompted to choose a stack when invoking
the ambiguous command.

The currently enabled stack is stored in the `.rapido` configuration that is discovered first
(see the "Configuration" section below). If a `.rapido` file is not found, one is created in
the current directory.

## Available Commands and Stacks
To get a list of available commands and stacks, simple run the following command:<br>
`rap list`

## Configuration
Rápido, and all of the commands, can be configured using a simple JSON file format that can be loaded
from multiple locations. Rapidio supports configuration overrides at the directory/project-level and
at the user or system level using a simple configuration search path.

A sample configuration is shown below:

**.rapido**
```javascript
{
    "scaffold.component.dir": "scaffolds/component",
    "scaffold.page.dir": "scaffolds/page",
    "scaffold.webapp.dir": "scaffolds/webapp",
    "modules.dir": "modules",
    "components.base.dir": "modules",
    "pages.base.dir": "modules/pages",
    "app.rtld.file": "modules/taglibs/app/app.rtld"
}
```

NOTE: Any configuration properties that have the suffix "file" or "dir" will result in a property value of type
(raptor/file/File)[https://github.com/raptorjs/raptorjs/blob/master/lib/raptor/files/File_node.js] that
references the file resolved relative to the directory containing the `.raptor` file.


# Creating Custom Stacks and Commands

Commands and stacks can easily be registered as part of the `.rapido` configuration file as shown in the following sample code:
```javascript
{
    "stack.raptorjs": {
        "description": "Commands for the RaptorJS Toolkit",
        "command.create component.file": "command-create-component.js",
        "command.create page.file": "command-create-page.js",
        "command.rename component.file": "command-rename-component.js"
    }
}
```

The command handler and the command metadata (e.g. description) are defined inside the module file for the command as
shown in the following sample code:
```javascript
var File = require('raptor/files/File'),
    files = require('raptor/files'),
    path = require('path');

function getComponentInfo(name) {
    var lastSlash = name.lastIndexOf('/'),
        shortName = lastSlash === -1 ? name : name.slice(lastSlash+1),
        shortNameLower = shortName.toLowerCase(),
        shortNameDashSeparated = shortName.replace(/([a-z])([A-Z])/g, function(match, a, b) {
            return a + '-' + b;
        }).toLowerCase();
    return {
        name: name,
        shortName: shortName,
        shortNameLower: shortNameLower,
        shortNameDashSeparated: shortNameDashSeparated
    };
}

module.exports = {
    description: "Description for my custom command",

    /**
     * @param args {Array<String>} An array of command arguments that must be 
     *                             parsed (does not include the command).
     * @return {Object} The parsed command arguments (as name/value pairs) 
     */
    parseOptions: function(args) {
        // You will typically parse and validate the args using
        // a module such as optimist. See:
        // https://github.com/substack/node-optimist
        return {
            someOption: args[0],
            // ...
        }
    },

    /**
     * @param options {Object} The parsed command options (returned by parseOptions)
     * @param config {Object} The Rapido configuration loaded from .rapido config files
     * @param rapido {Object} A reference to the rapido module
     */
    run: function(options, config, rapido) {
        var someOption = options.someOption;
        var someConfig = config.someConfig;
        // ...
        rapido.log.success('Command completed!');
    }
}
```
