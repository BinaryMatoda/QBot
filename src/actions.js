const { webGet, webRequest } = require('./webClient')

const getQuestionFromArray = (questions) => {
    return questions[Math.floor(Math.random() * questions.length)];
}

export const rules = [
    {
        path: '.',
        validation: [
            (item) => { item },
            (item) => { item.length > 0 },
        ],
    },
    {
        path: 'title',
        validation: [
            (item) => { item },
            (item) => { item.length > 0 },
        ],
    },
    {
        path: 'question',
        validation: [
            (item) => { item },
            (item) => { item.length > 0 },
        ],
    },
    {
        path: 'answer',
        validation: [
            (item) => { item },
            (item) => { item.length > 0 },
        ],
    },
    {
        path: 'author',
        validation: [
            (item) => { item },
            (item) => { item.length > 0 },
        ],
    },
]

export const getOnlyCorrectQuestions = (questions, rules) => {
    return questions.filter(q => {
        return rules.filter(rule => {
            const item = rule.path === '.' ? q : q[rule.path]
            const isValid = rule.validation.reduce((res, val) => {
                res = res && val(item)
                return res
            }, true)
            return !isValid
        }).length === 0
    })
}

export const getQuestions = async (url, protocol = 'https') => {
    try {
        const response = await webRequest(url, 'GET', '', protocol)
        const jsonQuestionList = JSON.parse(response)
        return jsonQuestionList
    } catch (error) {
        console.log('getQuestion:', error.message)
        throw error
    }

}

class Actions {
    constructor() {
    }

    async getQuestions(url, protocol = 'https') {
        try {
            const response = await webRequest(url, 'GET', '', protocol)
            const jsonQuestionList = JSON.parse(response)
            return jsonQuestionList
        } catch (exception) {
            console.log(exception.message)
            throw exception
        }
    }

    chooseQuestion(questions) {
		const noAnswer = questions.filter(q => !q.answer2 && q.answer.split(' ').length === 1)
		if (noAnswer.length > 0) {
			const withImage = noAnswer.filter(q => q.imageLink)
			if (withImage.length > 0) return getQuestionFromArray(withImage)
			return getQuestionFromArray(noAnswer)
		}
		else {
			const withImage = questions.filter(q => q.imageLink)
			if (withImage.length > 0) return getQuestionFromArray(withImage)
			return getQuestionFromArray(questions)
		}
    }

    async getQuestion(url, protocol = 'https') {
        try {
            const questions = await getQuestions(url, protocol)
            return this.chooseQuestion(questions)
        } catch (exception) {
            console.log(exception.message)
            throw exception
        }
    }
}

//export default class Actions
exports.Actions = Actions