const isCorrectAnswer = (data, myAnswer) => {
    if (data.answer === myAnswer) return true
    if (data.answer2 === myAnswer) return true

    const hypotese = prepareText(myAnswer)
    const ANSWERS = prepareText(data.answer)
    const allAnswers = getAllOptionalAnswers(ANSWERS)
    if (allAnswers.find(ANSWER => areSentencesEqual(ANSWER, hypotese))) return true

    var isAnswer = false
    const answers = data.answer2.split(/[,;|]/)
    answers.map(_answer => {
        const answer = prepareText(_answer)
        const allAnswers = getAllOptionalAnswers(answer)
        if (allAnswers.find(ANSWER => areSentencesEqual(ANSWER, hypotese))) return true
    })
    return isAnswer
}

const getAllOptionalAnswers = (answer) => {
    if (!sentenceHasBrackets(answer)) return [answer]
    const possibleAnswers = []
    const [begin, end] = getSentenceBracketsIndexes(answer)
    const optionalAnswer = answer.replace(answer.substring(begin, end + 2), '')
    possibleAnswers.push(prepareText(optionalAnswer))
    answer = answer.substring(0, begin) + answer.substring(begin + 1, end) + answer.substring(end + 1)

    return possibleAnswers.concat(getAllOptionalAnswers(answer))
}

const sentenceHasBrackets = (text) => {
    const begin = text.indexOf('[')
    const end = text.indexOf(']')
    if (begin >= 0 && end > begin) return true
    return false
}

const getSentenceBracketsIndexes = (text) => {
    const begin = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (begin >= 0 && end > begin) return [begin, end]
    return [0, 0]
}

const areSentencesEqual = (s1, s2) => {
    const wos1 = s1.split(' ').filter(item=>item)
    const wos2 = s2.split(' ').filter(item=>item)
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
    if (len < 9 && d < 3) return true
    else if (len > 8 && d < 4) return true
    return false
}

const prepareText = (text) => {
    const trim = text.trim()
    const noPunctuationString = trim.replace(/[\'\".,\/#!$%\^&\*;:{}=_`~()]/g, '')
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

exports.isCorrectAnswer = isCorrectAnswer;
