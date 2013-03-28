_Design In-Progress. Feedback and Contributions Welcome_

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

In the above example, `"create component"` is the command name and `"ui/buttons/Button"` and `"--no-testing"` are additional
arguments to the command handler.

NOTE: Rápido uses `rap` for less typing.

Details on creating your own commands are described in the "Creating Custom Commands" section below.

## Stack
A stack is a collection of commands that are all related to a particular technology stack. Rápido supports
using multiple stacks, and new stacks can easily be installed using `npm`. 
When running a command, the command is searched for in the stacks that are currently enabled.

### Installing Stacks
A new stack should be installed just like any other Node module using `npm`. For example:<br>
`npm install rapido-raptorjs`

Stacks can also be installed globally using the `--global` switch for `npm` 
(e.g. `npm install rapido-raptorjs --global`). When launched Rápido
will search for stacks and commands in all of the first-level Rápido modules found in any of the available 
`node_modules` directories. Rápido uses the same module search path that Node uses and will begin its
search in the current working directory. A Rápido module is indicated by the existence of a `rapido.json` configuration
file in the root directory of the module.

### Switching Stacks
The current stack can be switched using the `rap use` command as shown in the sample below:<br>
`rap use raptorjs`

It is also possible to enable multiple stacks:<br>
`rap use raptorjs jquery backbone`

NOTE: If multiple stacks support the same command then you will be prompted to choose a stack when invoking
the ambiguous command.

NOTE: The currently enabled stacks are stored in the `rapido.json` configuration that is discovered first
(see the "Configuration" section below). If a `rapido.json` file is not found, one is created in
the current directory.

## Available Commands and Stacks
To get a list of available commands for the currently enabled stacks, simple run the following command:<br>
`rap list`

To get a list of all commamnds for all stacks that have been installed (not just the ones that are enabled), the
following command should be used:
`rap list --all`

## Configuration
Rápido, and all of the commands, can be configured using a simple JSON file format that can be loaded
from multiple locations. Rápido supports configuration overrides at the directory/project-level and
at the user or system level using a simple configuration search path.

**Sample rapido.json config file:**
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
[raptor/file/File](https://github.com/raptorjs/raptorjs/blob/master/lib/raptor/files/File_node.js) that
references the file resolved relative to the directory containing the `rapido.json` file that the
configuration property is defined in.


# Creating Custom Stacks and Commands

Commands and stacks can easily be registered as part of the `rapido.json` configuration file as shown in the following sample code:
```javascript
{
    "stack.raptorjs": {
        "description": "Commands for the RaptorJS Toolkit",
        "command.create component": {
            "description": "Create a RaptorJS UI component",
            "file": "command-create-component.js"
        },
        "command.create page": {
            "description": "Create a RaptorJS page",
            "file": "command-create-page.js"
        },
        "command.rename component": {
            "description": "Rename an existing UI component",
            "file": "command-rename-component.js"
        }
    }
}
```

The command handler should be implemented as CommonJS module as shown in the following sample code:
```javascript
module.exports = {

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
     * @param config {Object} The Rapido configuration loaded from rapido.json config files
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
