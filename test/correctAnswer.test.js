const assert = require('assert');
const { isCorrectAnswer } = require('../dist/textHelper');

describe('One word answer test', () => {
    const answers = ["Masters", "masters", "Matser", "master."]
    const NOTanswers = ["Rockstar", "start", "Moonster", "Boomster"]
    const data = {
        answer: '"Master".',
        answer2: '',
    }
    answers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(true, result)
        });
    })
    NOTanswers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] not a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(false, result)
        });
    })
});

describe('Several word answer test', () => {
    const answers = ["Master and Margarita", "master and margarita", "master n margarita", "Mister and Margarita.", "matser and margorita"]
    const NOTanswers = ["Sobache serdye", "master and margarita and thousand devils", "I dont know", "Mister, fuck off", "maybe margarita"]
    const data = {
        answer: '"Master and Margarita".',
        answer2: '',
    }
    answers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(true, result)
        });
    })
    NOTanswers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] not a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(false, result)
        });
    })
});

describe('Optional word in answer test', () => {
    const answers = ["White rabbit", "rabbit"]
    const NOTanswers = []
    const data = {
        answer: '[white] rabbit',
        answer2: '',
    }
    answers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(true, result)
        });
    })
    NOTanswers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] not a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(false, result)
        });
    })
});

describe('Several optional words in answer test', () => {
    const answers = ["Big white rabbit", "Big rabbit", "rabbit"]
    const NOTanswers = []
    const data = {
        answer: '[Big [white]] rabbit',
        answer2: '',
    }
    answers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(true, result)
        });
    })
    NOTanswers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] not a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(false, result)
        });
    })
});

describe('optional words on the middle of answer test', () => {
    const answers = ["Whole big royal power", "Whole power"]
    const NOTanswers = []
    const data = {
        answer: 'Whole [big royal] power',
        answer2: '',
    }
    answers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(true, result)
        });
    })
    NOTanswers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] not a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(false, result)
        });
    })
});

describe('optional words in the end of answer test', () => {
    const answers = ["Beloved.", "Beloved mother", 'beloved    mother']
    const NOTanswers = ['mother']
    const data = {
        answer: 'beloved [mother]',
        answer2: '',
    }
    answers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(true, result)
        });
    })
    NOTanswers.map(answer => {
        it(`If answer is [answer:${data.answer},answer2:${data.answer2}], is [${answer}] not a correct answer?`, () => {
            const result = isCorrectAnswer(data, answer)
            assert.equal(false, result)
        });
    })
});
