const MongoClient = require('mongodb').MongoClient;
const uri = process.env.mongoConnectionString;
let client = null;

const connect = async (uri) => {
    const p = new Promise((resolve, reject) => {
        MongoClient.connect(uri, { useUnifiedTopology: true }, function (err, client) {
            if (err) reject(err)
            //console.log("Connected successfully to server");
            resolve(client)
        });
    })
    return p
}

const upsertItem = (databaseId, containerId, itemId, value) => {
    //const client = await connect(uri)
    const p = new Promise(async (resolve, reject) => {
        try {
            if (!client || !client.isConnected) client = await connect(uri)
        } catch (error) {
            reject(error)
        }
        const db = client.db(databaseId);
        const collection = db.collection(containerId);
        collection.updateOne(
            { _id: itemId },
            { $set: value },
            { upsert: true },
            (err, result) => {
                if (err) reject(new Error(err))
                //console.log("Inserted documents into the collection");
                resolve(result);
            }
        );
    })
    return p;
}

const readItem = (databaseId, containerId, itemId) => {
    const p = new Promise(async (resolve, reject) => {
        try {
            if (!client || !client.isConnected) client = await connect(uri)
        } catch (error) {
            reject(error)
        }
        const db = client.db(databaseId);
        const collection = db.collection(containerId);
        collection.find({ '_id': itemId }).toArray(function (err, docs) {
            //assert.equal(err, null);
            if (err) reject(new Error(err))
            if (docs.length == 0) {
                resolve(null);
            } else if (docs.length > 1) {
                reject(new Error('incorrect behaviour'))
            }
            resolve(docs[0]);
        });
    })
    return p;
}

exports.upsertItem = upsertItem
exports.readItem = readItem
