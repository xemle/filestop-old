var mongoose = require('mongoose'),
    File = mongoose.model('File'),
    Error = require ("errno-codes"),
    Filestop = mongoose.model('Filestop');
;

module.exports = function (config) {
    var exports = {};

    exports.create = function(req, res) {
        var filestop = new Filestop(req.body);

        filestop.createClientId(config);
        filestop.url = config.baseURL + "/#/filestop/" + filestop.cid;

        filestop.save(function (err) {
            if (err) {
                res.send({success: false, errors: err});
            } else {
                res.send({success: 'OK', cid: filestop.cid});
            }
        });
    };
    exports.update = function(req, res, next) {
        var cid = req.params.cid;

        req.body.updated = new Date;

        // find and update does not call custom validators right now
        // see this bug report: https://github.com/LearnBoost/mongoose/issues/860
        // this is so sad..
        Filestop.findOneAndUpdate ({cid: cid}, {$set: req.body}, function (err, filestop) {
            if (err) {
                console.log("Error updating Filestop with cid " + cid + ": " + err);
                res.send({success: false, errors: err});
                return;
            }

            if (filestop) {
                console.log("Updated Filestop with cid " + cid);
                res.send({success: 'OK', cid: filestop.cid});
            } else {
                console.log("Error updating Filestop with cid " + cid + ": not found");
                res.send({success: false, errors: "Filestop not found"});
            }
        });
    };
    exports.delete = function(req, res, next) {
        var cid = req.params.cid;

        // delete all files
        File.find({filestopCId: cid}, function (err, result) {
            if (err) {
                console.log("Error querying for files of filestop with cid " + cid, err);
                return res.send({success: false, errors: "Error querying for files of filestop with cid " + cid});
            }
            if (result) {
                result.forEach (function (file) {
                    file.deleteFile(config, function(err) {
                        // ENOENT is "File does not exist"
                        if (err && err.errno != Error.ENOENT) {
                            res.send({success: 'false', error: err});
                            return;
                        }

                        file.remove();
                    });

                });
            }
        });

        Filestop.findOne({cid:cid}, function (err, filestop) {
            if (err) {
                console.log("Error deleting Filestop with cid " + cid + ": " + err);
                res.send({success: false, errors: err});
                return;
            }

            if (filestop) {
                filestop.deleteFolder(config, function (err) {
                    // ENOENT is "File does not exist"
                    if (err && err.errno != Error.ENOENT.errno) {
                        res.send({success: 'false', error: err});
                        return;
                    }
                    filestop.remove();
                    res.send({success: 'OK', cid: cid});
                    return;
                });
            } else {
                console.log("Error deleting Filestop with cid " + cid + ": not found");
                res.send({success: false, errors: "Filestop not found"});
            }
        });
    };
    exports.get = function(req, res, next) {
        var cid = req.params.cid;
        Filestop.findOne({cid: cid}, function (err, result) {
            if (!result) {
                console.log("Filestop with cid " + cid + " not found");
                res.send(null);
            }
            res.send(result);
        });
    };

    exports.getFiles = function(req, res, next) {
        var cid = req.params.cid;
        File.find({filestopCId: cid}, function (err, result) {
            if (!result) {
                console.log("No files found for Filestop with cid " + cid);
                res.send(null);
            }
            res.send(result);
        });
    };
    exports.findAll = function(req, res) {
        Filestop.find().exec(function (err, result) {
            res.send(result);
        });
    };

    return exports;
};