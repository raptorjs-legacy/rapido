var chai = require('chai');

var should = chai.should(),
    path = require('path');


chai.Assertion.includeStack = true; // defaults to false

describe('config-loader', function(){
    describe('#loadConfig()', function(){
        it('should register all commands', function(){
            var rapido = require('../lib/rapido').create();

            rapido.stackDirs = [
                path.join(__dirname, 'resources'),
                path.join(__dirname, 'resources/stack1'),
                path.join(__dirname, 'resources/stack2'),
            ];
            rapido.stackConfigFilename = 'rapido-test.json';

            rapido.init();

            
            // var config = {};
            // require('../lib/config-loader').loadStackConfigs(config, paths, 'rapido-test.json', rapido);
            // rapido.config = config;


            console.log('\n' + rapido.commands.toString());

            var stacks = rapido.commands.getStacks();


            stacks.should.have.length(3);
            stacks[0].name.should.equal('default');
            stacks[0].description.should.be.a('string');
            stacks[0].getCommands().should.have.length(2);
            stacks[0].getCommands()[0].name.should.equal("command1");
            stacks[0].getCommands()[0].description.should.equal("Description for command1");
            stacks[0].getCommands()[0].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/command1.js'));
            stacks[0].getCommands()[1].name.should.equal("command2");
            stacks[0].getCommands()[1].description.should.equal("Description for command2");
            stacks[0].getCommands()[1].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/command2.js'));

            stacks[1].name.should.equal('stack1');
            stacks[1].description.should.equal('Description for stack1');
            stacks[1].getCommands().should.have.length(2);
            stacks[1].getCommands()[0].name.should.equal("stack1 command1");
            stacks[1].getCommands()[0].description.should.equal("Description for stack1 command1");
            stacks[1].getCommands()[0].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/stack1/stack1-command1.js'));
            stacks[1].getCommands()[1].name.should.equal("stack1 command2");
            stacks[1].getCommands()[1].description.should.equal("Description for stack1 command2");
            stacks[1].getCommands()[1].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/stack1/stack1-command2.js'));

            stacks[2].name.should.equal('stack2');
            stacks[2].description.should.equal('Description for stack2');
            stacks[2].getCommands().should.have.length(2);
            stacks[2].getCommands()[0].name.should.equal("stack2 command1");
            stacks[2].getCommands()[0].description.should.equal("Description for stack2 command1");
            stacks[2].getCommands()[0].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/stack2/stack2-command1.js'));
            stacks[2].getCommands()[1].name.should.equal("stack2 command2");
            stacks[2].getCommands()[1].description.should.equal("Description for stack2 command2");
            stacks[2].getCommands()[1].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/stack2/stack2-command2.js'));
            
        })

        it('should resolve file properties', function(){
            var rapido = require('../lib/rapido').create();
            var paths = [
                path.join(__dirname, 'resources'),
                path.join(__dirname, 'resources/stack1'),
                path.join(__dirname, 'resources/stack2'),
            ];
            
            var config = {};
            require('../lib/config-loader').loadStackConfigs(config, paths, 'rapido-test.json', rapido);
            rapido.config = config;

            rapido.config['test1.file'].getAbsolutePath().should.equal(path.join(__dirname, 'resources/test1.json'))
            rapido.config['test.dir'].getAbsolutePath().should.equal(path.join(__dirname, 'resources/stack1'))
            rapido.config.getUnresolvedProperty('test1.file').should.equal('test1.json');
            rapido.config.getPropertySourceFile('test1.file').getAbsolutePath().should.equal(path.join(__dirname, 'resources/rapido-test.json'));

            rapido.config.getPropertySourceFile('test2.file').getAbsolutePath().should.equal(path.join(__dirname, 'resources/rapido-test.json'));
            rapido.config.getPropertySourceFile("test.stack1.file").getAbsolutePath().should.equal(path.join(__dirname, 'resources/stack1/rapido-test.json'));
            
        })
    })
});