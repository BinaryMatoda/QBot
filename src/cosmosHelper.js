const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.cosmosEndPoint;
const key = process.env.cosmosKey;
const client = new CosmosClient({ endpoint, key });

const upsertItem = async (databaseId, containerId, itemId, value) => {
    try {
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        //console.log(database.id);
        const { container } = await database.containers.createIfNotExists({ id: containerId });
        //console.log(container.id);
        const item = { ...value, id: itemId, }
        await container.items.upsert(item)
    } catch (error) {
        if (error.code === 409) {
            console.log("There was a conflict with an existing item");
        }
        throw error
    }
}

const readItem = async (databaseId, containerId, itemId) => {
    try {
        console.log(database.id);
        const { database } = await client.databases.createIfNotExists({ id: databaseId });
        const { container } = await database.containers.createIfNotExists({ id: containerId });
        //console.log(container.id);
        const querySpec = {
            query: `SELECT * FROM ${containerId} s WHERE s.id = @itemId`,
            parameters: [
                {
                    name: "@itemId",
                    value: itemId
                }
            ]
        };
        const { resources: results } = await container.items.query(querySpec).fetchAll();
        if (results.length == 0) {
            return null
        } else if (results.length > 1) {
            throw 'incorrect behaviour'
        }
        return results[0];
    } catch (error) {
        if (error.code === 409) {
            console.log("There was a conflict with an existing item");
        }
        throw error
    }
}

exports.upsertItem = upsertItem
exports.readItem = readItem
