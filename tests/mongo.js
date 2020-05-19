const { upsertItem, readItem } = require('../mongoHelper')

const test = async () => {
    try {
        await upsertItem('aquestionbot', 'sessions', '12345', { title: 'title', description: 'desc' })
        const res = await readItem('aquestionbot', 'sessions', '12345')
        console.log(res)
    } catch (error) {
        //console.log('errro')
        //console.log(error)
    }
}

test()