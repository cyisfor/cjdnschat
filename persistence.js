var fs = require('fs');

function persist(name,next) {
    var info = undefined;
    var db = name+'.json';
    process.on('exit',function() {
        if(info) {
            fs.writeFileSync(db,JSON.stringify(info));
        }
    });
    fs.exists(db,function(exists) {
        if(exists) {
            fs.readFile(db,function(err, data) {
                console.log('read '+name);
                if(err) {
                    throw "Not overwriting the JSON just because "+err;
                } else {
                    info = JSON.parse(data);
                }
                next(info);
            });
        } else {
            info = {};
            next(info);
        }
    });
}

module.exports = persist;
