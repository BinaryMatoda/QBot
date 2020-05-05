const https = require('https');

const httpsGet = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (resp) => {
            let data = ''
            resp.on('data', (chunk) => {
                data += chunk;
            })
            resp.on('end', () => {
                resolve(data)
            })
        }).on("error", (err) => {
            reject(err)
        })
    })
}

const divBegin = '<div class=\'random_question\'>'
const divEnd = '</div>'
const errorData = {
    errorMessage: 'An error occured. Please try again later',
}

const getQ = (url) => {
    console.log(url)
    return new Promise((resolve, reject) => {
        httpsGet(url)
            .then((fetchedData) => {
                // console.log(fetchedData)

                const index1 = fetchedData.indexOf(divBegin)
                //console.log(index1)
                //console.log(fetchedData.indexOf('random_question'))


                const question = getTextBetweenTags(fetchedData, divBegin, divEnd)
                const title = getTextBetweenTags(getTextBetweenTags(question, '<p>', '</p>'),'>','<')
                const text = getTextBetweenTags(question, '</strong>', '<p>')

                const img = getTextBetweenTags(question, '<img', '>')

                const answer = getTextBetweenTags(question, '<strong>Ответ:</strong>', '</p>')
                const answer2 = getTextBetweenTags(question, '<strong>Зачёт:</strong>', '</p>')
                const _author = getTextBetweenTags(question, '<strong>Автор:</strong>', '</p>')
                const source = getTextBetweenTags(question, '<strong>Источник(и):</strong>', '</p>')
                const comment = getTextBetweenTags(question, '<strong>Комментарий:</strong>', '</p>')

                const tmp = getTextBetweenTags(_author, '>', '<')
                const author = tmp.length === 0 ? _author : tmp

                const result = {
                    title,
                    text,
                    img: img.length === 0 ? undefined : '<img ' + img + '>',
                    answer,
                    answer2,
                    source,
                    author,
                    comment,
                    body: question,
                }
                //console.log(result)
                resolve(result)
            })
            .catch(error => {
                console.log(error)
                resolve(errorData)
            })
    })
}

const getTextBetweenTags = (text, openTag, closeTag) => {
    if (!closeTag) closeTag = openTag
    const index1 = text.indexOf(openTag)
    if (index1 >= 0) {
        const index2 = text.indexOf(closeTag, index1 + 1)
        if (index2 >= 0) {
            const between = text.substr(index1 + openTag.length, index2 - index1 - openTag.length)

            return between.replace(/<br\/>/g,'\n').replace(/<br \/>/g,'\n').replace(/&nbsp;/g,' ').replace(/&mdash;/g,'-')
        }
    }
    return ''
}
exports.getQ = getQ