var should = require('chai').should(),
    path = require('path');

describe('config-loader', function(){
    describe('#loadConfig()', function(){
        it('should register all commands', function(){
            var rapido = require('../lib/rapido').create();
            var paths = [
                path.join(__dirname, 'resources'),
                path.join(__dirname, 'resources/stack1'),
                path.join(__dirname, 'resources/stack2'),
            ];

            rapido.load(paths, '.rapido-test');
            console.log('\n' + rapido.commands.toString());

            var stacks = rapido.commands.getStacks();
            stacks.should.have.length(3);
            stacks[0].name.should.equal('all');
            stacks[0].description.should.equal('Commands that apply to all stacks');
            stacks[0].getCommands().should.have.length(2);
            stacks[0].getCommands()[0].name.should.equal("all command1");
            stacks[0].getCommands()[0].description.should.equal("Description for all command1");
            stacks[0].getCommands()[0].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/all-command1.js'));
            stacks[0].getCommands()[1].name.should.equal("all command2");
            stacks[0].getCommands()[1].description.should.equal("Description for all command2");
            stacks[0].getCommands()[1].file.getAbsolutePath().should.equal(path.join(__dirname, 'resources/all-command2.js'));

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
    })
})