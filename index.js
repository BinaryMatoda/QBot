require('dotenv').config()
const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const { getQ } = require('./db')
const { upsertItem } = require('./cosmosHelper')


var m_activeContexts = {}
const { TELEGRAM_BOT_TOKEN } = process.env
const URL = process.env.dbUrl || 'https://db.chgk.info/random'
const helpText = 'Бот задает вопросы из базы данных ЧГК. Для игры отправьте боту /new. Чтобы получить ответ /a';

const makeChgkUrl = (complexity = 1, type = 1, showAmswer = true, limit = 10) => {
    return `${URL}${showAmswer ? '/answers' : ''}${type ? `/types${type}` : ''}${complexity ? `/complexity${complexity}` : ''}${limit ? `/limit${limit}` : ''}`
}


const bot = new Telegraf(TELEGRAM_BOT_TOKEN)
bot.use(session())
bot.start((ctx) => { ctx.reply(helpText) })
bot.help((ctx) => ctx.reply(helpText))
bot.command('new', async (ctx) => {
    const sessionKey = getSessionKey(ctx)
    const oldSessionData = m_activeContexts[sessionKey]
    if (oldSessionData) {
        oldSessionData.correct = oldSessionData.correct || 0
        oldSessionData.total = (oldSessionData.total || 0) + 1
        ctx.replyWithHTML(prepareAnswer(oldSessionData))
    }
    const data = await getQ(makeChgkUrl(1, 1));
    console.log(data)
    m_activeContexts[sessionKey] = { ...data, correct: oldSessionData ? oldSessionData.correct : 0, total: oldSessionData ? oldSessionData.total : 0 }
    ctx.reply(prepareQuestion(m_activeContexts[sessionKey]))
    try {
        await upsertItem(process.env.databaseId, process.env.containerId, sessionKey, m_activeContexts[sessionKey])
    }
    catch (exception) {
        console.log(exception.message)
    }
    return
})
bot.command('a', async (ctx) => {
    const sessionKey = getSessionKey(ctx)
    const data = { ...m_activeContexts[sessionKey] }
    data.correct = data.correct || 0
    data.total = (data.total || 0) + 1
    m_activeContexts[sessionKey] = null
    ctx.replyWithHTML(prepareAnswer(data))
    const _DATA = await getQ(makeChgkUrl());
    m_activeContexts[sessionKey] = { ..._DATA, correct: data.correct, total: data.total }
    ctx.reply(prepareQuestion(m_activeContexts[sessionKey]))
    try {
        await upsertItem(process.env.databaseId, process.env.containerId, sessionKey, m_activeContexts[sessionKey])
    }
    catch (exception) {
        console.log(exception.message)
    }
    return
})
bot.on('message', async (ctx) => {
    if (!ctx.message || !ctx.message.text) return
    var msg = ctx.message.text.trim()
    var sessionKey = getSessionKey(ctx);
    const data = m_activeContexts[sessionKey]
    if (data) {
        if (isCorrectAnswer(data, msg)) {
            data.correct = data.correct + 1
            data.total = data.total + 1
            ctx.replyWithHTML(prepareAnswer(data))
            const _data = await getQ(makeChgkUrl());
            console.log(_data)
            m_activeContexts[sessionKey] = { ..._data, correct: data.correct, total: data.total }
            ctx.reply(prepareQuestion(_data))
            try {
                await upsertItem(process.env.databaseId, process.env.containerId, sessionKey, m_activeContexts[sessionKey])
            }
            catch (exception) {
                console.log(exception.message)
            }
            return
        }
        else return ctx.reply('Нет')
    }
    else {
        return ctx.reply('Вопрос не задан. Начните игру с команды /new')
    }
})
bot.hears('hi', (ctx) => ctx.reply('Hey there'))
bot.launch()

const getSessionKey = (ctx) => {
    if (ctx.from && ctx.chat) {
        return `${ctx.from.id}:${ctx.chat.id}`
    } else if (ctx.from && ctx.inlineQuery) {
        return `${ctx.from.id}:${ctx.from.id}`
    }
    return null
}

const prepareAnswer = (data) => {
    return data && Object.keys(data).length > 0
        ? `Ответ:${data.answer}
${ data.comment ? `Комментарий:${data.comment}\n` : ''}Источник:${data.source}
Автор:${data.author}
Отвечено:${data.correct}/${data.total}
`
        : 'Вопрос не задан. Начните игру с команды /new'
}

const prepareQuestion = (data) => {
    if (!data) return 'error'
    return `${data.text}
********
${data.title}`
}

const isCorrectAnswer = (data, myAnswer) => {
    if (data.answer === myAnswer) return true
    if (data.answer2 === myAnswer) return true

    const hypotese = prepareText(myAnswer)
    const ANSWER = prepareText(data.answer)
    if (areSentencesEqual(ANSWER, hypotese)) return true

    var isAnswer = false
    const answers = data.answer2.split(/[,;|]/)
    answers.map(_answer => {
        const answer = prepareText(_answer)
        if (areSentencesEqual(answer, hypotese)) isAnswer = true
    })
    return isAnswer
}

const areSentencesEqual = (s1, s2) => {
    const wos1 = s1.split(' ')
    const wos2 = s2.split(' ')
    if (wos1.length !== wos2.length) return false
    const numberOfMatchedWords = wos1.map(word1 => {
        return wos2.filter(word2 => isWord2EqualsToWord1(word1, word2)).length > 0
    }).filter(result => result).length
    if (numberOfMatchedWords === wos1.length) return true
    return false
}

const isWord2EqualsToWord1 = (word1, word2) => {
    if (word1 === word2) return true
    const d = levenshtein(word1, word2)
    const len = word1.length
    if (len < 6 && d < 2) return true
    else if (len < 9 && d < 3) return true
    else if (len > 8 && d < 4) return true
    return false
}

const prepareText = (text) => {
    const trim = text.trim()
    const noPunctuationString = trim.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    //if (trim.endsWith('.')) return trim.substr(0, trim.length - 1)
    return noPunctuationString
}

const levenshtein = (s1, s2, costs) => {
    var i, j, l1, l2, flip, ch, chl, ii, ii2, cost, cutHalf;
    l1 = s1.length;
    l2 = s2.length;

    costs = costs || {};
    var cr = costs.replace || 1;
    //var cri = costs.replaceCase || costs.replace || 1;
    var cri = 0;
    var ci = costs.insert || 1;
    var cd = costs.remove || 1;

    cutHalf = flip = Math.max(l1, l2);

    if (cutHalf === 0) return 0

    var minCost = Math.min(cd, ci, cr);
    var minD = Math.max(minCost, (l1 - l2) * cd);
    var minI = Math.max(minCost, (l2 - l1) * ci);
    var buf = new Array((cutHalf * 2) - 1);

    for (i = 0; i <= l2; ++i) {
        buf[i] = i * minD;
    }

    for (i = 0; i < l1; ++i, flip = cutHalf - flip) {
        ch = s1[i];
        chl = ch.toLowerCase();

        buf[flip] = (i + 1) * minI;

        ii = flip;
        ii2 = cutHalf - flip;

        for (j = 0; j < l2; ++j, ++ii, ++ii2) {
            cost = (ch === s2[j] ? 0 : (chl === s2[j].toLowerCase()) ? cri : cr);
            buf[ii + 1] = Math.min(buf[ii2 + 1] + cd, buf[ii] + ci, buf[ii2] + cost);
        }
    }
    return buf[l2 + cutHalf - flip];
}


