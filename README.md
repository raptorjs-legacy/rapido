Rápido
======

Rápido is an extensible command line interface that enables rapid development for any technology stack. 
Rápido is written in JavaScript and is built on top of Node.js and npm.

# Installation

The only prerequisite for rapido is Node. Rapido should be installed as a 
global script using `npm` as shown below:
`npm install rapido --global`

# Overview

## Command
Rapido is extensible and supports any number of commands that can easily be installed using `npm`.
Based on the arguments passed to the Rápido CLI, Rápido will delegate the work to the appropriate command. A simple
command invocation is shown below:
`rap create component ui/buttons/Button --no-testing`

In the above example, "create component" is the command name and "ui/buttons/Button" and "--no-testing" are additional
arguments to the command handler.

NOTE: Rápido uses `rap` for less typing.

Details on creating your own commands are described in the "Creating Custom Commands" section below.

## Stack
A stack is a collection of commands that are all related to a particular technology stack. Rapido supports
using multiple stacks, and new stacks can easily be installed from `npm` using the `rapido` CLI as described below. 

### Installing Stacks
A new stack can be installed using the following command:
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
The current stack can be switched using the `rap use` command as shown below:
`rap use raptorjs`

It is also possible to enable multiple stacks:
`rap use raptorjs backbone`

NOTE: If multiple stacks support the same command then you will be prompted to choose a stack when invoking
the ambiguous command.

## Configuration
Rapido, and all of the commands, can be configured using a simple JSON file format that can be loaded
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
# Creating Custom Commands


