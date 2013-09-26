var ui = require('./ui');
var persist = require('./persistence');

var fs = require('fs');
var carrier = require('carrier');
var child_process = require('child_process');
var dgram = require('dgram');

    //exports.port = 20000;
var server = null;
var d = null;

function setup(next) {
    persist('info',function(info) {
        exports.info = info;
        persist('ports', function(ports) {
            exports.ports = ports;
            persist('friends', function(friends) {
                exports.friends = friends;
                finishedExporting(next);
            });
        });
    });
}

function finishedExporting(next) {
    if(!exports.info.port)
        exports.info.port = 0;
    if(exports.info.host) {
        gotHost(next);
    } else {
        var ip = fs.createReadStream('/proc/net/if_inet6',{autoClose:true});
        ip.on('close',function() { gotHost(next); });
        carrier.carry(ip,function(line) {
            (function (addr,n1,n2,n3,n4,name) {
                n1 = parseInt(n1,0x10);
                n2 = parseInt(n2,0x10);
                n3 = parseInt(n3,0x10);
                n4 = parseInt(n4,0x10);
                if( n2 == 8 &&
                    n3 == 0 &&
                    n4 == 0x80 &&
                    addr.slice(0,2,0x10)=='fc') {
                        var components = [];
                        for(;;) {
                            components.push(addr.slice(0,4));
                            addr = addr.slice(4);
                            if(!addr) break;
                        }
                        addr = components.join(':');
                        exports.info.host = addr;
                    }
            }).apply(this,line.split(/ +/));
        });
    }
}
 
function gotHost(next) {
    if(exports.info.host==null) {
        throw "Could not find your cjdns address.";
    }
    server = child_process.spawn('rsync',['rsync','--daemon','--no-motd',
            '--address',exports.info.host,'--port',exports.info.port+1]);
    d = dgram.createSocket('udp6');
    // d.bind should return an event listener that emits the error event!
    function tryAgain(err) {
        console.log(err);
        exports.info.host = undefined;
        if(exports.info.port < 1024) 
            exports.info.port = 0;
        finishedExporting(next);
    }
    process.once('uncaughtException',tryAgain);
    d.bind(exports.info.port,exports.info.host,function() {
        process.removeListener('uncaughtException',tryAgain);
        gotSocket(d,next);
    });
}

function gotSocket(d,next) {
    exports.info.port = d.address().port;
    d.on('message',function (msg,rinfo) {
        if(!exports.friends[rinfo.address]) {
            ui.print('ignoring '+msg.length+' from '+rinfo.address);
            return;
        }
        exports.ports[rinfo.address] = rinfo.port;
        /* PROBABLY don't need persistence on this one... */
        var buffer = buffers[rinfo];
        if (!buffer) {
            buffer = msg;
        } else {
            buffer = buffer + msg;
        }
        var messages = buffer.toString('utf-8').split('\0');
        buffers[rinfo] = messages[messages.length-1];
        messages.slice(messages,messages.length-2).forEach(function (message) {
            var type = message[0];
            message = message.slice(1);
            if(type == 0) {
                ui.print('<'+ui.maybeAlias(rinfo.address)+'> '+message);
            } else {
                var url = message;
                var name = nameFor(url);
                ui.print("Would you like to download "+name+' from '+rinfo.address+'? To do so:');
                ui.print("/get "+url);
            }
        });
    });
    exports.sendMessage = sendMessage;
    next();
}

function sendMessage(who,message) {
    // XXX: type?
    var port = exports.ports[who];
    if(!port)
        port = exports.port;
    message = new Buffer(message);
    d.send(message,0,message.length,port,who);
}

function nameFor(url) {
    url = urllib.parse(url);
    return url.pathname.split('/')[-1];
}

function urlFor(name) {
    url = urllib.format({
        'protocol': 'rsync',
        'hostname': exports.host,
        'port': exports.port+1,
        pathname: name});
}
        

function download(url, name, next) {
    if (name == undefined) {
        name = nameFor(url);
    }
    dest = pubdir+'/'+name;
    process = child_process.spawn('rsync',['rsync','-a',url,dest]);
    process.on('close',next);
}

exports.setup = setup
