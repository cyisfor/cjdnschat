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
            var derp = mysplit(line," ",1);
            var lname = derp[0];
            var hits = [];
            for(var name in commands) {
                if (name.indexOf(lname)==0) {
                    if(name == lname) {
                        var command = commands[name];
                        if(command.complete) { 
                            command.complete(hits,derp[1]);
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
                    var derp = mysplit(cmd," ",1);
                    cmd = derp[0].slice(1);
                    var args = derp[1];
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

commands.help = command({
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
        var derp = mysplit(args," ", 2);
        var name = derp[0].slice(1);
        args = derp[1];
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

commands.quit = command({
    doc: "SHUT. DOWN. EVERYTHING.",
    fulldoc: function(args) {
        print("This quit command's full documentation...");
        print("Is just a test of the fulldoc interface.");
    }
},
function(args) {
    globalDone = true;
});

commands.add = command({
    doc: "Add a friend to chat with you!",
    fulldoc: function(args) {
        print('syntax: /add ip/port');
        print('host is a cjdns host (hopefully)');
        print('port is an integer.');
        print("each person's host/port is listed at the top of the chat.");
    }},
    function(args) {
        var derp = args.split('/');
        if (derp.length != 2) {
            this.fulldoc();
            return;
        }
        host = derp[0];
        port = derp[1];
        net.friends[host] = true;
        net.ports[host] = port;
    });

commands.remove = command({
    doc: "Remove someone from being able to chat.",
    fulldoc: function(args) {
        print('syntax: /remove host');
        print('host is a cjdns host (hopefully)');
        print('port is an integer.');
        print("each person's host/port is listed at the top of the chat.");
    }},
function(args) {
    var host = args;
    delete net.friends[host];
    delete net.ports[host];
});

commands.send = command({
    doc: "Offer to send someone a file",
    fulldoc: function(args) { 
        print('Syntax: /send <friend> <filename>');
    }},
function(args) {
    derp = mysplit(args,' ',1)
    if(derp.length != 2) {
        this.fulldoc();
        return;
    }
    friend = derp[0]
    filename = derp[1]
    print('Under construction.');
    // now get the basename, copy the file into public, then send them the URL to public/basename
});

commands.get = command({
    doc: "Get a file",
    fulldoc: function(args) {
        print('syntax /get <url>');
    }},
function(args) {
    net.download(args);
});

commands.list = command({
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

commands.alias = command({
    doc: "Create an easy to recognize alias for your friend."
},
function(args) {
    var derp = mysplit(args,' ',1);
    aliases[derp[1].trim()] = derp[0].trim();
});

function register(info,f) {
    commands[info['name']] = command(info,f);
}

var print = exports.print = console.log;
exports.register = register;
exports.monitor = monitor;
