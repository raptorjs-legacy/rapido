_Design In-Progress. Feedback and Contributions Welcome_

Rápido
======

Rápido is an extensible command line interface that enables rapid development for any technology stack. 
Rápido is written in JavaScript and is built on top of Node.js and npm.

# Installation

The only prerequisite for Rápido is Node. Rápido should be installed as a 
global script using `npm` as shown below:<br>
`$ npm install rapido --global`

# Overview

## Command
Rápido is extensible and supports any number of commands that can easily be installed using `npm`.
Based on the arguments passed to the Rápido CLI, Rápido will delegate the work to the appropriate command handler. A simple
command invocation is shown below:<br>
`$ rap create component ui/buttons/Button --no-testing`

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
`$ npm install rapido-raptorjs`

Stacks can also be installed globally using the `--global` switch for `npm` 
(e.g. `npm install rapido-raptorjs --global`). When launched Rápido
will search for Rápido stacks and commands in all of the first-level Node modules found in any of the available 
`node_modules` directories. Rápido uses the same module search path that Node uses and will begin its
search in the current working directory and ending in the global `node_modules` direcotry.
A Rápido stack is indicated by the existence of a `rapido.json` configuration
file in the root directory of the module.

### Enabling Stacks
Stacks can be enabled and disabled using the `rap use` command as shown in the sample below:<br>
`$ rap use raptorjs`

It is also possible to enable multiple stacks:<br>
`$ rap use raptorjs jquery backbone`

NOTE: If multiple enabled stacks support the same command then you will be prompted to choose a stack when invoking
the ambiguous command.

NOTE: The currently enabled stacks are stored in the `rapido.json` configuration that is discovered first
(see the "Configuration" section below). If a `rapido.json` file is not found, one is created in
the current directory.

### Listing Commands and Stacks
To get a list of available commands for the currently enabled stacks, simple run the following command:<br>
`$ rap list`

To get a list of all commamnds for all stacks that have been installed (not just the ones that are enabled), the
following command should be used:
`$ rap list all`

## Configuration
Rápido, and all of the commands, can be configured using a `rapido.json` file that can be loaded
from multiple locations and merged together. Rápido supports configuration overrides at the directory/project-level and
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


# Creating Stacks and Commands
## Creating a Stack
Rápido provides commands for creating stacks and commands. To create a new stack simply do the following:
```
$ mkdir my-stack
$ cd my-stack
$ rap create stack
```
You will be prompted for information about the new stack, and the command then will generate all of the files
for your stack in the current directory. Stacks are defined in a `rapido.json` file as shown in the following
sample code:
```javascript
{
    "stacks": {
        "raptorjs": {
            "description": "Commands for the RaptorJS Toolkit",
            "commands": {
                "create component": {
                    "description": "Create a RaptorJS UI component",
                    "file": "command-create-component.js"
                },
                "create page": {
                    "description": "Create a RaptorJS page",
                    "file": "command-create-page.js"
                },
                "rename component": {
                    "description": "Rename an existing UI component",
                    "file": "command-rename-component.js"
                }
            }
        } 
    }
}
```

You can then share your stack by publishing it to the npm repository by simply running `npm publish`.

## Creating a Command
New commands can be added to a stack using the `rap create command`. You will be prompted for
some information about the command, and then the command implementation will be created
and automatically registered in the stack by updating the `rapido.json` for the stack.

A command handler is implemented as a CommonJS module as shown in the following sample code:
```javascript
module.exports = {
    usage: 'Usage: $0 say hello <name>',

    options: {
        'upper-case': {
            describe: 'Convert name to upper case'
        }
    },

    validate: function(args, rapido) {
        var name = args._[0];
        if (!name) {
            throw 'name is required';
        }
        
        return {
            name: name,
            upperCase: args['upper-case']
        };
    },

    run: function(args, config, rapido) {
        var name = args.name;

        if (args.upperCase) {
            name = name.toUpperCase();
        }

        rapido.log.success('Command says: ' + name);
    }
}
```

NOTE: Internally, Rápido uses the [optimist](https://github.com/substack/node-optimist) module to
parse the command line arguments using the option definitions.
