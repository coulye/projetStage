/*
 * GET / POST inserter
 * Il s'agit ici d'un Bean générique qui en fonction des données dans
 * l'annuaire otf json est capable de faire un insert et d'insérer un
 * ou des objets json dans le model passé dans l'annuaire.
 */
var logger = require('log4js').getLogger('inserter');
logger.setLevel(GLOBAL.config["LOGS"].level);
var mongoose = require('mongoose');
//var genericModel = require(__dirname + '/../../../ressources/models/mongooseGeneric');

/*
 * SET users datas into MongoDB.
 */

exports.inserter = {
    one: function (req, cb) {
        var _controler = req.session.controler;
        var model = GLOBAL.schemas[_controler.data_model];
        //@TODO not safety
        logger.debug('path    : ', _controler.path);
        logger.debug('room    : ', _controler.room);
        logger.debug('model   : ', _controler.data_model);
        logger.debug('params  : ', _controler.params);
        logger.debug('schema  : ', _controler.schema);
        //-- Accounts Model
        //var modele = mongoose.model(model);
        // Test Emit WebSocket Event
        logger.debug(" One User emmit call");
        sio.sockets.in(_controler.room).emit('user', {
            room: _controler.room,
            comment: ' One User\n\t Your Filter is :'
        });
        try {
            model.createDocument(_controler.params, function (err, nb_inserted) {
                logger.debug('nombre documents insérés :', nb_inserted);
                return cb(null, {data: nb_inserted, room: _controler.room});
            });
        } catch (err) { // si existe pas alors exception et on l'intègre via mongooseGeneric
            return cb(err);
        }

    },

    /** TODO écrire l'insertion générique d'une liste d'objets avec mongoDB, via mongoose. */
    list: function (req, cb) {
        var _controler = req.session.controler;
        var model = GLOBAL.schemas[_controler.data_model];
        logger.debug('path    : ', _controler.path);
        logger.debug('room    : ', _controler.room);
        logger.debug('model   : ', _controler.data_model);
        logger.debug('params  : ', _controler.params);
        logger.debug('schema  : ', _controler.schema);
        //-- Accounts Model
        //var modele = mongoose.model(model);
        // Test Emit WebSocket Event
        var dataArray = _controler.params;
        var nbInserted = null;

        function insertArray(i, cbk) {
            logger.debug(" List inserter call");
            //sio.sockets.in(_controler.room).emit('user', {room: _controler.room, comment: ' One User\n\t Your Filter is :'});
            try {
                if (i < dataArray.length) {
                    model.createDocument(dataArray[i], function (err, nb_inserted) {
                        nbInserted = nb_inserted;
                        logger.debug("objet inséré via inserter.list : ", dataArray[i]);
                        insertArray(i + 1, cbk);
                    });
                } else {
                    cbk();
                }
            } catch (err) { // si existe pas alors exception et on l'intègre via mongooseGeneric
                return cb(err);
            }

        }

        insertArray(0, function () {
            logger.debug('nombre documents insérés :', nbInserted);
            return cb(null, {data: nbInserted, room: _controler.room});
        });

    },

    registreEtape: function (req, cb) {
        var _controler = req.session.controler;
        var model = _controler.data_model;
        logger.debug('path    : ', _controler.path);
        logger.debug('room    : ', _controler.room);
        logger.debug('model   : ', _controler.data_model);
        logger.debug('params  : ', _controler.params);
        logger.debug('schema  : ', _controler.schema);
        var dataArray = _controler.params;
        var dataMiseajour = {};
        var dataIntoArray = [];
        var k = 0;
        // preparation des données reçues
        /** todo : Attention ici on doit parcourir les 24 lignes de saisie et pas seulement les fields du body */
        for (var field in dataArray) {
            if (!Array.isArray(dataArray[field])) {
                dataMiseajour[field] = dataArray[field];
            }
        }
        var nbFieldsToinsert = dataArray["libelle"].length;
        for (var k = 0; k < nbFieldsToinsert; k++) {
            /** todo : ici transformer le tableau pour avoir un tableau de data par collection */
            dataIntoArray.push({
                "libelle": dataArray["libelle"][k],
                "tel": dataArray["tel"][k],
                "adresse1": dataArray["adresse1"][k],
                "adresse2": dataArray["adresse2"][k],
                "code_postal": dataArray["code_postal"][k],
                "ville": dataArray["ville"][k]
            });
        }
        // insertion des données de la collection MiseAJour, entête du formulaire
        GLOBAL.schemas[model[0]].createDocument(dataMiseajour, function (err, data_inserted1) {
            var tabIds = [];
            logger.debug("objet inséré via inserter.registreEtape : ", data_inserted1);

            // fonction récursive pour insérer les numéro de téléphone des différentes organisation et catgorie
            function insertArray(j, cbk) {
                logger.debug(" List inserter call");
                var numeroModel = 0;
                //sio.sockets.in(_controler.room).emit('user', {room: _controler.room, comment: ' One User\n\t Your Filter is :'});
                try {
                    if (j < 24) {
                        if (j < 14) {
                            numeroModel = 2;
                        }
                        else if (j > 13 && j < 20) {
                            numeroModel = 3;
                        }
                        else if (j > 19 && j < 24) {
                            numeroModel = 4;
                        }
                        GLOBAL.schemas[model[numeroModel]].createDocument(dataIntoArray[j], function (err, data_inserted) {
                            logger.debug("objet inséré via inserter.registreEtape : ", data_inserted);
                            /** todo : trouver une meilleurs façon de stoàcker les ids des ligne insérer denuméros de tél
                             * todo : pour les insérer des la collection NumeroUtiles                                     */
                            tabIds.push(data_inserted._id);
                            insertArray(j + 1, cbk);
                        });
                    } else {
                        cbk();
                    }
                } catch (err) { // si existe pas alors exception et on l'intègre via mongooseGeneric
                    return cb(err);
                }
            }
            /** todo : il faut plusieurs appel recursif pour traiter l'ensemble des champs de chaque catégorie */
            insertArray(0, function () {
                logger.debug('documents insérés');
                /** todo ici on va gérer les ids des numéros de tél des différentes organisations our l'insérer dans NumeroUtile*/
                console.log('dataIntoArray : ', dataIntoArray);
                console.log('tabIds : ', tabIds);
                //return cb(null, {data: dataIntoArray, room: _controler.room});
                /** todo : ici on doit découper le tableau des ids précédemment insérés pour les ajouter à la collection NumeroUtiles */
                    //préparation des données sous la forme de 3 tableaux d'_ids
                var dataToInsert = {
                        installateurs_extId : tabIds.slice(14, 20),
                        verificateursAgrees_extId: tabIds.slice(20),
                        numerosUrgence_extId: tabIds.slice(0, 14)
                    }
                console.log('les numéros utiles a insérer : ', dataToInsert);
                GLOBAL.schemas[model[1]].createDocument(dataToInsert, function (err, data_inserted2) {
                    logger.debug("data insérées : ", data_inserted2);
                    return cb(null, {data: data_inserted2, room: _controler.room});
                });
            });
        });
    },


    registreEtape2: function (req, cb) {
        var _controler = req.session.controler;
        var model = _controler.data_model;
        logger.debug('path    : ', _controler.path);
        logger.debug('room    : ', _controler.room);
        logger.debug('model   : ', _controler.data_model);
        logger.debug('params  : ', _controler.params);
        logger.debug('schema  : ', _controler.schema);
        var dataArray = _controler.params;
        var dataTableau = {};
        var dataIntoArray = [];

        // preparation des données reçues
        /** todo : Attention ici on doit parcourir les lignes de saisie */
        for (var field in dataArray) {
            if (!Array.isArray(dataArray[field])) {
                dataTableau[field] = dataArray[field];
            }
        }

        var nbFieldsToinsertBat = dataArray["libelle"].length;
        for (var k = 0; k < nbFieldsToinsertBat; k++) {
            /** todo : ici transformer le tableau pour avoir un tableau de data par collection */
            dataIntoArray.push({
                "libelle": dataArray["libelle"][k],
                "date_construction": dataArray["date_construction"][k],
                "nbre_niveaux": dataArray["nbre_niveaux"][k]
            });
            logger.debug('documents nbFieldsToinsertBat compter : '+nbFieldsToinsertBat);
        }

        var nbFieldsToinsertPlan = dataArray["emplacement"].length;
        for (var k = 0; k < nbFieldsToinsertPlan; k++) {
            /** todo : ici transformer le tableau pour avoir un tableau de data par collection */
            dataIntoArray.push({
                "emplacement": dataArray["emplacement"][k],
                "date_maj": dataArray["date_maj"][k],
                "visa": dataArray["visa"][k]
            });
            logger.debug('documents nbFieldsToinsertPlan compter : '+nbFieldsToinsertPlan);
        }
// insertion des données de la collection MiseAJour, entête du formulaire
        GLOBAL.schemas[model[0]].createDocument(dataTableau, function (err, data_inserted1) {
            var tabIds = [];
            logger.debug("objet inséré via inserter.registreEtape2 : ", data_inserted1);

            // fonction récursive pour insérer les numéro de téléphone des différentes organisation et catgorie
            function insertArray(j, cbk) {
                logger.debug(" List inserter call");
                var numeroModel = 0;
                //sio.sockets.in(_controler.room).emit('user', {room: _controler.room, comment: ' One User\n\t Your Filter is :'});
                try {
                    if (j < 14) {
                        if (j < 7) {
                            numeroModel = 2;
                        }
                        else if (j > 8 && j < 11) {
                            numeroModel = 3;
                        }
                        else if (j > 10 && j < 14) {
                            numeroModel = 4;
                        }
                        GLOBAL.schemas[model[numeroModel]].createDocument(dataIntoArray[j], function (err, data_inserted) {
                            logger.debug("objet inséré via inserter.registreEtape02 : ", data_inserted);
                            tabIds.push(data_inserted._id);
                            insertArray(j + 1, cbk);
                        });
                    } else {
                        cbk();
                    }
                } catch (err) { // si existe pas alors exception et on l'intègre via mongooseGeneric
                    return cb(err);
                }
            }
            insertArray(0, function () {
                logger.debug('documents insérés');
                console.log('dataIntoArray : ', dataIntoArray);
                console.log('tabIds : ', tabIds);
                var dataToInsert = {
                        BatimentsEntreprise_extId : tabIds.slice(10, 12),
                        PlanEtablissement: tabIds.slice(13,15),
                        Entreprises_extId: tabIds.slice(0, 9)
                    }
                GLOBAL.schemas[model[1]].createDocument(dataToInsert, function (err, data_inserted2) {
                    logger.debug("data insérées : ", data_inserted2);
                    return cb(null, {data: data_inserted2, room: _controler.room});
                });
            });
        });
    }
}