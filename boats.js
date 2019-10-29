const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";
const GUEST = "Guest";

router.use(bodyParser.json());



/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, "type": type, "length": length};
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boats(req){
    var q = datastore.createQuery(BOAT).limit(2);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function get_boat_guests(req, id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.get(key)
    .then( (boats) => {
        const boat = boats[0];
        const guest_keys = boat.guests.map( (g_id) => {
            return datastore.key([GUEST, parseInt(g_id,10)]);
        });
        return datastore.get(guest_keys);
    })
    .then((guests) => {
        guests = guests[0].map(ds.fromDatastore);
        return guests;
    });
}

function put_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.save({"key":key, "data":boat});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

function put_reservation(lid, gid){
    const l_key = datastore.key([BOAT, parseInt(lid,10)]);
    return datastore.get(l_key)
    .then( (boat) => {
        if( typeof(boat[0].guests) === 'undefined'){
            boat[0].guests = [];
        }
        boat[0].guests.push(gid);
        return datastore.save({"key":l_key, "data":boat[0]});
    });

}

function stringifyExample(idValue, nameValue, typeValue, lengthValue, selfUrl){ 
	return '{ "id": "' + idValue  + '", "name": "' + nameValue + '", "type": "' + typeValue + '", "length": ' + lengthValue + ', "self": "' + selfUrl + '"}'; 
}

// check request body function from: https://stackoverflow.com/questions/47502236/check-many-req-body-values-nodejs-api
function checkProps(obj, list) {
    if (typeof list === "string") {
        list = list.split("|");
    }
    for (prop of list) {
        let val = obj[prop];
        if (val === null || val === undefined) {
            return false;
        }
    }
    return true;
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function(req, res){
    const boats = get_boats(req)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/:id/guests', function(req, res){
    const boats = get_boat_guests(req, req.params.id)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.post('/', function(req, res){
	//let typeu = req.body.type;
	if (!checkProps(req.body, "name|type|length")) {
		res.status(400).send('Status: 400 Bad Request\n\n {\n "Error": "The request object is missing at least one of the required attributes" \n}');
	} else {
		post_boat(req.body.name, req.body.type, req.body.length)
	    // .then( key => {res.status(200).send('{ "id": ' + key.id + ' }')} );
	    .then( key => {res.status(201).type('json').send('Status: 201 Created\n\n' + stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol + '//' + req.get("host") + req.baseUrl))} );	
	}
    
});

router.put('/:id', function(req, res){
    put_boat(req.params.id, req.body.name, req.body.type, req.body.length)
    .then(res.status(200).end());
});

router.put('/:lid/guests/:gid', function(req, res){
    put_reservation(req.params.lid, req.params.gid)
    .then(res.status(200).end());
});

router.delete('/:id', function(req, res){
    delete_boat(req.params.id).then(res.status(200).end())
});

/* ------------- End Controller Functions ------------- */

module.exports = router;