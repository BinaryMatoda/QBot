const { Telegraf } = require('telegraf')
const session = require('telegraf/session')
const { getQ } = require('./db')

var m_activeContexts = {}
const { TELEGRAM_BOT_TOKEN } = process.env
const helpText = 'Бот задает вопросы из базы данных ЧГК. Для игры отправьте боту /new. Чтобы получить ответ /a';

const makeChgkUrl = (complexity = 1, type = 1) => {
    return `https://db.chgk.info/random/answers/types${type}/complexity${complexity}/limit1`
}


const bot = new Telegraf(TELEGRAM_BOT_TOKEN)
bot.use(session())
bot.start((ctx) => ctx.reply(helpText))
bot.help((ctx) => ctx.reply(helpText))
bot.command('new', async (ctx) => {
    const sessionKey = getSessionKey(ctx)
    if (m_activeContexts[sessionKey]) {
        ctx.replyWithHTML(prepareAnswer(m_activeContexts[sessionKey]))
    }
    const data = await getQ(makeChgkUrl(1, 1));
    console.log(data)
    m_activeContexts[sessionKey] = data
    ctx.reply(prepareQuestion(data))
    return
})
bot.command('a', async (ctx) => {
    const sessionKey = getSessionKey(ctx)
    const data = { ...m_activeContexts[sessionKey] }
    m_activeContexts[sessionKey] = null
    ctx.replyWithHTML(prepareAnswer(data))
    const _DATA = await getQ(makeChgkUrl());
    m_activeContexts[sessionKey] = _DATA
    ctx.reply(prepareQuestion(_DATA))
    return
})
bot.on('message', async (ctx) => {
    if (!ctx.message || !ctx.message.text) return
    var msg = ctx.message.text.trim()
    var sessionKey = getSessionKey(ctx);
    const data = m_activeContexts[sessionKey]
    if (data) {
        if (isCorrectAnswer(data, msg)) {
            ctx.replyWithHTML(prepareAnswer(data))
            const _data = await getQ(makeChgkUrl());
            console.log(_data)
            m_activeContexts[sessionKey] = _data
            ctx.reply(prepareQuestion(_data))
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
    return data && Object.keys(data).length>0
        ? `Ответ:${data.answer}
${ data.comment ? `Комментарий:${data.comment}\\n` : ''}Источник:${data.source}
Автор:${data.author}
`
        : 'Вопрос не задан. Начните игру с команды /new'
}

const prepareQuestion = (data) => {
    if (!data) return 'error'
    return `${data.title}
${data.text}`
}

const isCorrectAnswer = (data, myAnswer) => {
    if (data.answer === myAnswer) return true
    if (data.answer2 === myAnswer) return true

    const ANSWER = prepareText(data.answer)
    const d = levenshtein(ANSWER, myAnswer)
    const delta = ANSWER.length - d
    if (delta / ANSWER.length * 100 > 90) return true

    var isAnswer = false
    const answers = data.answer2.split(/[,;]/)
    answers.map(_answer => {
        const answer = prepareText(_answer)
        const d = levenshtein(answer, myAnswer)
        const delta = answer.length - d
        if (delta / answer.length * 100 > 90) isAnswer = true
    })
    return isAnswer
}

const prepareText = (text) => {
    const trim = text.trim()
    if (trim.endsWith('.')) return trim.substr(0, trim.length - 1)
    return trim
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


