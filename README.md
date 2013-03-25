rapido
======

Source code for the rapido command line automator

# Installation

The only prerequisite for rapido is Node. Rapido should be installed as a 
global script using npm using the following command:
`npm install rapido --global`

# Overview

## Command
Rapido is extensible and supports any number of commands that can easily be installed using `npm`.
Based on the arguments based to the rapido CLI, rapido will delegate the work to a command. A simple
command invocation is shown below:
`rap create component ui/buttons/Button --no-testing`

## Stack
A stack is a collection of commands that are all related to a particular technology stack. Rapido supports
using multiple stacks, and new stacks can easily be installed from `npm` using the `rapido` CLI. The
current stack can be changed using the `rap use` command as shown below:
`rap use raptorjs`

It is also possible to enable multiple stacks (assuming there are no overlapping commands):
`rap use raptorjs backbone`

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


# Usage

## Installing a Stack
`rap install raptor`



The above command will look for a npm module named `rapido-raptorjs` and install it as
a plugin for the `rapido` cli. Internally, `rapido` will install the plugin using npm
and install it into a `node_modules` directory nested within the containing folder for 
the `rapido` module.



