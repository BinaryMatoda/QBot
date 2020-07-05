import "@babel/polyfill"
//require('dotenv').config()
import dotenvConfig from 'dotenv/config'
//dotenv.config()
import { Telegraf } from 'telegraf'
import session from 'telegraf/session'
import crypto from 'crypto'
import { isCorrectAnswer } from './textHelper'
import { Actions } from './actions'
import { upsertItem, readItem } from './storageConnector'
//const { Telegraf } = require('telegraf')
//const session = require('telegraf/session')
//const { getQ } = require('./db')
//const { upsertItem, readItem } = require('./storageConnector')
//const crypto = require('crypto')
//const { Actions } = require('./actions')
//const { isCorrectAnswer } = require('./textHelper')

var m_activeContexts = {}
const { TELEGRAM_BOT_TOKEN } = process.env
const helpText = 'Бот задает вопросы из базы данных ЧГК. Для игры отправьте боту /new. Чтобы получить ответ /a';
const feedbackText = 'Понравился вопрос? Отправьте /like. Для игры отправьте боту /new';
const noFeedbackIsWaiting = 'Команда не ожидается. Для игры отправьте боту /new'
const thankyou = 'Спасибо!'

const makeChgkUrl2 = (complexity = 1, type = 1, showAmswer = true, limit = 10) => {
    //const r = getRandomInt(Math.pow(10, 7))
    const URL = process.env.dbUrl || 'http://18.196.94.147'
    return `${URL}/api/chgk/type/${type}/complexity/${complexity}/limit/${limit}`
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
        ctx.reply(prepareAnswer(sessionData))
        return sessionData
    }
}

const sendQuestion = async (ctx, sessionKey, sessionData) => {
    try {
        const act = new Actions()
        const data = await act.getQuestion(makeChgkUrl2(1, 1), 'http')
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
        if (sessionData && !sessionData.waitFeedback) sendAnswer(ctx, sessionKey, sessionData)
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
        if (sessionData && sessionData.waitFeedback) return
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
        if (sessionData && sessionData.waitFeedback) {
            const questionId = crypto.createHash('md5').update(sessionData.question).digest('hex')
            const question = await readItem(process.env.databaseId, process.env.questionContainerId, questionId)
            const newQuestion = {
                id: question ? question.id : questionId,
                body: question
                    ? { ...question, likeCounter: undefined }
                    : { ...sessionData, _id: undefined, id: undefined, correct: undefined, total: undefined, waitFeedback: undefined },
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
                if (sessionData && !sessionData.waitFeedback) sendAnswer(ctx, sessionKey, sessionData)
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
                if (sessionData && sessionData.waitFeedback) return
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
                //console.log(answerTimestamp, sessionData.timestamp, answerTimestamp - sessionData.timestamp)
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
    //console.log('from:', ctx.from, 'chat:', ctx.chat)
    if (ctx.from && ctx.chat && ctx.chat.type && ctx.chat.type === 'private') {
        return `${ctx.from.id}:${ctx.chat.id}`
    } else if (ctx.from && ctx.chat && ctx.chat.type && ctx.chat.type === 'group') {
        return `${ctx.chat.id}:${ctx.chat.title}`
    }
    else if (ctx.from && ctx.inlineQuery) {
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
    return `${data.question}
********
${data.title}`
}
