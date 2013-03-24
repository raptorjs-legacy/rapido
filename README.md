Rapido
======

Source code for the Rapido command line automator

# Installation
`npm install rapido --global`

# Usage

## Installing a new set of plugins from npm
`rap install raptorjs`

The above command will look for a npm module named `rapido-raptorjs` and install it as
a plugin for the `rapido` cli. Internally, `rapido` will install the plugin using npm
and install it into a `node_modules` directory nested within the containing folder for 
the `rapido` module.



