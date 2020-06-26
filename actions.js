const { webGet, webRequest } = require('./webClient')

const getQuestionFromArray = (questions) => {
    return questions[Math.floor(Math.random() * questions.length)];
}


class Actions {
    constructor() {

    }

    async getQuestions(url, protocol = 'https') {
        try {
            const response = await webRequest(url, 'GET', '', protocol)
            //console.log(response)
            const jsonQuestionList = JSON.parse(response)
            //console.log(jsonQuestionList)
            const noAnswer = jsonQuestionList.filter(q => !q.answer2 && q.answer.split(' ').length === 1)
            if (noAnswer.length > 0) {
                const withImage = noAnswer.filter(q => q.imageLink)
                if (withImage.length > 0) return getQuestionFromArray(withImage)
                return getQuestionFromArray(noAnswer)
            }
            else {
                const withImage = jsonQuestionList.filter(q => q.imageLink)
                if (withImage.length > 0) return getQuestionFromArray(withImage)
                return getQuestionFromArray(jsonQuestionList)
            }
            return response
        } catch (exception) {
            console.log(exception.message)
            throw exception
        }
    }
}

//export default class Actions
exports.Actions = Actions