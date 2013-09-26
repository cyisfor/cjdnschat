if(typeof(String.prototype.trim) === "undefined")
{
    String.prototype.trim = function() 
    {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}

function mysplit(s,delim,n) {
    var results = [];
    var times = 0;
    var pos = 0;
    while(s.length) {
        var pos = s.indexOf(delim);
        if(pos==-1 || times > n) {
            results.push(s);
            return results;
        }
        results.push(s.slice(0,pos));
        s = s.slice(pos+delim.length);
        times += 1;
    }
    return results;
}

var readline = require('readline-history');
var net = require('./nets');
var commands = Object(null);

var globalDone = false;
var aliases = new Object(null);

function monitor() {
    readline.createInterface({
        path: "history.log",
        maxLength: 0x100,
        input: process.stdin,
        output: process.stdout,
        completer: function (line) {
            var stuff = mysplit(line," ",1);
            var lname = stuff[0];
            var hits = [];
            for(var name in commands) {
                if (name.indexOf(lname)==0) {
                    if(name == lname) {
                        var command = commands[name];
                        if(command.complete) { 
                            command.complete(hits,stuff[1]);
                            continue;
                        }
                    }
                    hits.push(name);            
                }
            }
            return [hits,line];
        },
        next: function(rl) {
            rl.setPrompt("> ");
            rl.prompt();
            rl.on('line', function (cmd) {
                // [cmd,args] = cmd.split(" ",2);
                if(cmd == '') {
                    commands.help();
                } else if(cmd[0]=='/') {
                    var stuff = mysplit(cmd," ",1);
                    cmd = stuff[0].slice(1);
                    var args = stuff[1];
                    cmd = commands[cmd];
                    if (cmd == undefined) {
                        print("I don't recognize that command.");
                        print("Commands:");
                        commands.help();
                    } else {
                        cmd(args);
                    }
                } else {
                    for(var friend in net.friends) {
                        net.sendMessage(friend,cmd);
                    }
                }
                if(globalDone) {
                    rl.close();
                } else {
                    rl.prompt();
                }
            }).on('close', function () {
                print("Shutting down.");
                process.exit(0);
            });

        }
    });
}

function command(info,f) {
    f.doc = info.doc;
    f.fulldoc = info.fulldoc;
    return f;
}

function register(info,f) {
    commands[info['name']] = command(info,f);
}

function alias(name,alias) {
    commands[alias] = commands[name];
}

register({
    name: 'help',
    doc: "help on various things."
},
function(args) {
    function shortHelp(name) {
        var command = commands[name];
        if (command == undefined) return;
        var doc = command.doc;
        if(doc != undefined) {
            print('/'+name + ": " + doc);
        }
        return command;
    }
    if(args == undefined || args == '') {
        for (var name in commands) {
            shortHelp(name);
        }
    } else {
        // [subcommand,args] = args.split(" ",2);
        var stuff = mysplit(args," ", 2);
        var name = stuff[0].slice(1);
        args = stuff[1];
        subcommand = shortHelp(name);
        if (subcommand) {
            if(subcommand.fulldoc) {
                subcommand.fulldoc(args);
            }
        } else {
            print(name+" is not a registered command.");
        }
    }
});

register({
    name: 'quit',
    doc: "SHUT. DOWN. EVERYTHING.",
    fulldoc: function(args) {
        print("This quit command's full documentation...");
        print("Is just a test of the fulldoc interface.");
    }
},
function(args) {
    globalDone = true;
});

register({
    name: 'add',
    doc: "Add a friend to chat with you!",
    fulldoc: function(args) {
        print('syntax: /add ip/port');
        print('host is a cjdns host (hopefully)');
        print('port is an integer.');
        print("each person's host/port is listed at the top of the chat.");
    }},
    function(args) {
        var stuff = args.split('/');
        if (stuff.length != 2) {
            this.fulldoc();
            return;
        }
        host = stuff[0];
        port = stuff[1];
        net.friends[host] = true;
        net.ports[host] = port;
    });

register({
    name: 'remove',
    doc: "Remove someone from being able to chat.",
    fulldoc: function(args) {
        print('syntax: /remove host');
        print('host is a cjdns host (hopefully)');
        print('port is an integer.');
        print("each person's host/port is listed at the top of the chat.");
    }},
function(args) {
    var host = args.split('/',1);
    delete net.friends[host];
    delete net.ports[host];
});

alias('remove','ignore');

register({
    name: 'send',
    doc: "Offer to send someone a file",
    fulldoc: function(args) { 
        print('Syntax: /send <friend> <filename>');
    }},
function(args) {
    stuff = mysplit(args,' ',1)
    if(stuff.length != 2) {
        this.fulldoc();
        return;
    }
    friend = stuff[0]
    filename = stuff[1]
    print('Under construction.');
    // now get the basename, copy the file into public, then send them the URL to public/basename
});

register({
    name: 'get',
    doc: "Get a file",
    fulldoc: function(args) {
        print('syntax /get <url>');
    }},
function(args) {
    net.download(args);
});

register({
    name: 'list',
    doc: "List your friends."
},
function(args) {
    for(var friend in net.friends) {
        print(friend+'/'+net.ports[friend]);
        var alias = aliases[friend];
        if (alias) {
            print('Alias:',alias);
        }
    }
});

/* XXX: ui.alias is NOT the same as the ui command /alias.
 * 1st = alias for command names
 * 2nd = alias for friends
 *
 * better name for 1/2 = ? 
 */

register({
    name: 'alias',
    doc: "Create an easy to recognize alias for your friend."
},
function(args) {
    var stuff = mysplit(args,' ',1);
    aliases[stuff[1].trim()] = stuff[0].trim();
});

var print = exports.print = console.log;
exports.register = register;
exports.alias = alias;
exports.monitor = monitor;
