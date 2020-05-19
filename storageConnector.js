const cosmosDb = require('./cosmosHelper')
const mongoDb = require('./mongoHelper')

const storageName = process.env.storage
let db = null;
if(storageName === 'mongo')
{
    db = mongoDb
}
else{
    db = cosmosDb
}

const upsertItem = async (databaseId, containerId, itemId, value) => {
    return db.upsertItem(databaseId, containerId, itemId, value)
}

const readItem = async (databaseId, containerId, itemId) => {
    return db.readItem(databaseId, containerId, itemId)
}

exports.upsertItem = upsertItem
exports.readItem = readItem