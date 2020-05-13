require('dotenv').config()
const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const { getQ } = require('./db')
const { upsertItem, readItem } = require('./cosmosHelper')
const crypto = require('crypto')

var m_activeContexts = {}
const { TELEGRAM_BOT_TOKEN } = process.env
const URL = process.env.dbUrl || 'https://db.chgk.info/random'
const helpText = 'Бот задает вопросы из базы данных ЧГК. Для игры отправьте боту /new. Чтобы получить ответ /a';
const feedbackText = 'Понравился вопрос? Отправьте /like. Для игры отправьте боту /new';
const noFeedbackIsWaiting = 'Команда не ожидается. Для игры отправьте боту /new'
const thankyou = 'Спасибо!'
const makeChgkUrl = (complexity = 1, type = 1, showAmswer = true, limit = 10) => {
    const r = getRandomInt(Math.pow(10, 7))
    return `${URL}${showAmswer ? '/answers' : ''}${type ? `/types${type}` : ''}${complexity ? `/complexity${complexity}` : ''}/${Math.pow(10, 8) + r}${limit ? `/limit${limit}` : ''}`
}

const getRandomInt = (max) => {
    return Math.floor(Math.random() * Math.floor(max));
}

const getSessionData = async (sessionKey) => {
    if (m_activeContexts[sessionKey]) return m_activeContexts[sessionKey]
    try {
        const dbSession = await readItem(process.env.databaseId, process.env.containerId, sessionKey)
        return dbSession
    }
    catch (exception) {
        console.log(exception.message)
        throw exception
    }
}

const setSessionData = async (sessionKey, data) => {
    m_activeContexts[sessionKey] = data
    try {
        await upsertItem(process.env.databaseId, process.env.containerId, sessionKey, m_activeContexts[sessionKey])
    }
    catch (exception) {
        console.log(exception.message)
        throw exception
    }
}

const sendAnswer = async (ctx, sessionKey, sessionData) => {
    if (sessionData) {
        // sessionData.correct = sessionData.correct || 0
        // sessionData.total = (sessionData.total || 0) + 1
        ctx.replyWithHTML(prepareAnswer(sessionData))
        return sessionData
    }
}

const sendQuestion = async (ctx, sessionKey, sessionData) => {
    try {
        const data = await getQ(makeChgkUrl(1, 1));
        console.log(data)
        if (!sessionData) sessionData = await getSessionData(sessionKey)
        const timestamp = +new Date()
        const newSessionData = {
            ...data,
            timestamp,
            correct: sessionData ? sessionData.correct : 0,
            total: sessionData && sessionData.total ? sessionData.total + 1 : 1
        }
        await setSessionData(sessionKey, newSessionData)
        ctx.reply(prepareQuestion(newSessionData))
    }
    catch (exception) {
        console.log(exception.message)
        throw exception
    }
}

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)
bot.use(session())
bot.start((ctx) => { ctx.reply(helpText) })
bot.help((ctx) => ctx.reply(helpText))
bot.command('new', async (ctx) => {
    try {
        const sessionKey = getSessionKey(ctx)
        const sessionData = await getSessionData(sessionKey)
        if (!sessionData.waitFeedback) sendAnswer(ctx, sessionKey, sessionData)
        await sendQuestion(ctx, sessionKey, sessionData)
    }
    catch (exception) {
        console.log(exception.message)
    }
    return
})
bot.command('a', async (ctx) => {
    try {
        const sessionKey = getSessionKey(ctx)
        const sessionData = await getSessionData(sessionKey)
        if (sessionData.waitFeedback) return
        sendAnswer(ctx, sessionKey, sessionData)
        await sendQuestion(ctx, sessionKey, sessionData)
    }
    catch (exception) {
        console.log(exception.message)
    }
    return
})
bot.command('like', async (ctx) => {
    try {
        const sessionKey = getSessionKey(ctx)
        const sessionData = await getSessionData(sessionKey)
        if (sessionData.waitFeedback) {
            const questionId = crypto.createHash('md5').update(sessionData.body).digest('hex')
            const question = await readItem(process.env.databaseId, process.env.questionContainerId, questionId)
            const newQuestion = {
                id: question ? question.id : questionId,
                body: question ? question.body : sessionData.body,
                likeCounter: question && question.likeCounter ? question.likeCounter + 1 : 1,
            }
            await upsertItem(process.env.databaseId, process.env.questionContainerId, questionId, newQuestion)
            ctx.reply(thankyou)
            await sendQuestion(ctx, sessionKey, sessionData)
        }
        else {
            ctx.reply(noFeedbackIsWaiting)
        }
    }
    catch (exception) {
        console.log(exception.message)
    }
    return
})
bot.on('message', async (ctx) => {
    try {
        if (!ctx.message || !ctx.message.text) return
        var msg = ctx.message.text.trim().toLowerCase()
        if (msg === '/еще' || msg === '/ещё') {
            try {
                const sessionKey = getSessionKey(ctx)
                const sessionData = await getSessionData(sessionKey)
                if (!sessionData.waitFeedback) sendAnswer(ctx, sessionKey, sessionData)
                await sendQuestion(ctx, sessionKey, sessionData)
            }
            catch (exception) {
                console.log(exception.message)
            }
            return
        }
        if (msg === '/ответ') {
            try {
                const sessionKey = getSessionKey(ctx)
                const sessionData = await getSessionData(sessionKey)
                if (sessionData.waitFeedback) return
                sendAnswer(ctx, sessionKey, sessionData)
                await sendQuestion(ctx, sessionKey, sessionData)
            }
            catch (exception) {
                console.log(exception.message)
            }
            return
        }

        var sessionKey = getSessionKey(ctx);
        const sessionData = await getSessionData(sessionKey)
        if (sessionData) {
            if (isCorrectAnswer(sessionData, msg)) {
                sessionData.correct = sessionData.correct + 1
                const answerTimestamp = +new Date()
                console.log(answerTimestamp, sessionData.timestamp, answerTimestamp - sessionData.timestamp)
                if (answerTimestamp - sessionData.timestamp < 1000 * 5 * 60) {
                    sessionData.waitFeedback = true
                    console.log('wait feedback...')
                    await setSessionData(sessionKey, sessionData)
                }
                sendAnswer(ctx, sessionKey, sessionData)
                if (!sessionData.waitFeedback) await sendQuestion(ctx, sessionKey, sessionData)
                return
            }
            else return ctx.reply('Нет')
        }
        else {
            return ctx.reply('Вопрос не задан. Начните игру с команды /new')
        }
    }
    catch (exception) {
        console.log(exception.message)
        return ctx.reply('Ошибка. Начните игру с команды /new')
    }
})
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
********
${data.waitFeedback ? feedbackText : ''}
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
    const noPunctuationString = trim.replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '')
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


