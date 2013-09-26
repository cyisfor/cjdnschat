var nets = require('./nets');
var ui = require('./ui');

nets.setup(function() {
    ui.print("You're chatting now! Enjoy ^_^");
    ui.print("Give this to your friends:");
    ui.print(nets.info.host+'/'+nets.info.port);
    ui.monitor();
});
