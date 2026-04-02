const CATEGORY_PREP_TIME = {
    Salad: 12,
    Rolls: 18,
    Deserts: 8,
    Sandwich: 15,
    Cake: 35,
    "Pure Veg": 22,
    Pasta: 24,
    Noodles: 20,
}

const KEYWORD_PREP_TIME = [
    { pattern:/ice cream/i, minutes:6 },
    { pattern:/salad/i, minutes:12 },
    { pattern:/sandwich/i, minutes:15 },
    { pattern:/roll/i, minutes:18 },
    { pattern:/noodle/i, minutes:20 },
    { pattern:/pasta|lasagna/i, minutes:24 },
    { pattern:/cake/i, minutes:35 },
    { pattern:/grilled/i, minutes:18 },
    { pattern:/chicken/i, minutes:22 },
]

const derivePrepTimeMinutes = (food = {}) => {
    const name = String(food?.name || "").trim()
    const category = String(food?.category || "").trim()

    let prepTimeMinutes = CATEGORY_PREP_TIME[category] || 25

    for (const rule of KEYWORD_PREP_TIME) {
        if (rule.pattern.test(name)) {
            prepTimeMinutes = Math.max(prepTimeMinutes, rule.minutes)
        }
    }

    if (/vegan|veg/i.test(name) && category !== "Cake") {
        prepTimeMinutes = Math.max(10, prepTimeMinutes - 2)
    }

    return Math.max(5, prepTimeMinutes)
}

const getEffectivePrepTimeMinutes = (food = {}) => {
    const storedPrepTime = Number(food?.prepTimeMinutes)
    const suggestedPrepTime = derivePrepTimeMinutes(food)

    if (!storedPrepTime || Number.isNaN(storedPrepTime) || storedPrepTime <= 0) {
        return suggestedPrepTime
    }

    if (storedPrepTime === 25 && suggestedPrepTime !== 25) {
        return suggestedPrepTime
    }

    return storedPrepTime
}

module.exports = {
    CATEGORY_PREP_TIME,
    derivePrepTimeMinutes,
    getEffectivePrepTimeMinutes,
}
