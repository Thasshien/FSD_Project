const { getOrCreateSettings } = require('../controllers/settingsController')
const { getEffectivePrepTimeMinutes } = require('./prepTimeRules')

const CATEGORY_GST_RATES = {
    Salad: 5,
    Rolls: 12,
    Deserts: 18,
    Sandwich: 12,
    Cake: 18,
    "Pure Veg": 5,
    Pasta: 12,
    Noodles: 12,
}

const RESTAURANT_RULES = {
    minimumOrderAmount: 149,
    freeDeliveryThreshold: 499,
    peakHourSurcharge: 15,
    peakHours: [13, 14, 20, 21],
    maxQuantityPerItem: 10,
    maxTotalItems: 20,
    cancelWindowMinutes: 10,
    maxDeliveryDistanceKm: 50,
    restaurantAddress: "VIT Chennai, Vandalur-Kelambakkam Road, Chennai, Tamil Nadu, 600127, India",
}

const PROMO_RULES = {
    code: "SAVE10",
    discountPercent: 10,
}

const geocodeCache = new Map()
const postalOfficeCache = new Map()

const getRestaurantSchedule = async () => {
    const settings = await getOrCreateSettings()
    return {
        restaurantName: settings.restaurantName,
        opensAtHour: Number(settings.opensAtHour ?? 10),
        closesAtHour: Number(settings.closesAtHour ?? 22),
        lowStockThreshold: Number(settings.lowStockThreshold ?? 3),
    }
}

const isRestaurantOpen = async (date = new Date()) => {
    const schedule = await getRestaurantSchedule()
    const currentHour = date.getHours()
    return currentHour >= schedule.opensAtHour && currentHour < schedule.closesAtHour
}

const getGstRateForItem = (foodItem = {}) => {
    return Number(foodItem.gstRate ?? CATEGORY_GST_RATES[foodItem.category] ?? 12)
}

const toRadians = (degrees) => (degrees * Math.PI) / 180

const haversineDistanceKm = (firstPoint, secondPoint) => {
    const earthRadiusKm = 6371
    const latitudeDelta = toRadians(secondPoint.latitude - firstPoint.latitude)
    const longitudeDelta = toRadians(secondPoint.longitude - firstPoint.longitude)
    const firstLatitude = toRadians(firstPoint.latitude)
    const secondLatitude = toRadians(secondPoint.latitude)

    const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2

    return Number((2 * earthRadiusKm * Math.asin(Math.sqrt(haversine))).toFixed(2))
}

const getPhotonCoordinates = async (query) => {
    const normalizedQuery = String(query || "").trim()
    if (!normalizedQuery) return null

    const cacheKey = `photon:${normalizedQuery}`
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey)
    }

    const searchParams = new URLSearchParams({
        q: normalizedQuery,
        limit: "1",
    })

    const response = await fetch(`https://photon.komoot.io/api/?${searchParams.toString()}`)
    if (!response.ok) {
        throw new Error("Unable to reach geocoding service")
    }

    const results = await response.json()
    const firstResult = results?.features?.[0]
    if (!firstResult) {
        return null
    }

    const coordinates = {
        latitude: Number(firstResult.geometry.coordinates[1]),
        longitude: Number(firstResult.geometry.coordinates[0]),
        label:
            firstResult.properties?.name ||
            firstResult.properties?.street ||
            firstResult.properties?.city ||
            normalizedQuery,
        postcode: firstResult.properties?.postcode || "",
    }

    geocodeCache.set(cacheKey, coordinates)
    return coordinates
}

const getPostalOffices = async (postalCode) => {
    const normalizedPostalCode = String(postalCode || "").trim()
    if (!normalizedPostalCode) return []

    if (postalOfficeCache.has(normalizedPostalCode)) {
        return postalOfficeCache.get(normalizedPostalCode)
    }

    const response = await fetch(`https://api.postalpincode.in/pincode/${normalizedPostalCode}`)
    if (!response.ok) {
        throw new Error("Unable to reach postal lookup service")
    }

    const data = await response.json()
    const offices = data?.[0]?.PostOffice || []
    postalOfficeCache.set(normalizedPostalCode, offices)
    return offices
}

const averageCoordinates = (coordinatesList = []) => {
    if (!coordinatesList.length) return null

    const totals = coordinatesList.reduce(
        (accumulator, currentValue) => ({
            latitude: accumulator.latitude + currentValue.latitude,
            longitude: accumulator.longitude + currentValue.longitude,
        }),
        { latitude: 0, longitude: 0 }
    )

    return {
        latitude: Number((totals.latitude / coordinatesList.length).toFixed(7)),
        longitude: Number((totals.longitude / coordinatesList.length).toFixed(7)),
    }
}

const getRestaurantCoordinates = async () => {
    const cacheKey = "restaurant:vit-chennai"
    if (geocodeCache.has(cacheKey)) {
        return geocodeCache.get(cacheKey)
    }

    const restaurantCoordinates = await getPhotonCoordinates(RESTAURANT_RULES.restaurantAddress)
    if (restaurantCoordinates) {
        geocodeCache.set(cacheKey, restaurantCoordinates)
    }

    return restaurantCoordinates
}

const getCustomerCoordinatesFromPostalCode = async (address = {}) => {
    const postalCode = String(address?.zip_code || "").trim()
    if (!postalCode) return null

    const offices = await getPostalOffices(postalCode)
    const exactMatches = []

    for (const office of offices) {
        const query = [
            postalCode,
            office?.Name,
            office?.District,
            office?.State,
            "India",
        ]
            .filter(Boolean)
            .join(" ")

        const coordinates = await getPhotonCoordinates(query)
        if (coordinates?.postcode === postalCode) {
            exactMatches.push(coordinates)
        }
    }

    if (exactMatches.length) {
        return {
            ...averageCoordinates(exactMatches),
            label: `${postalCode} area`,
            postcode: postalCode,
        }
    }

    const broadCoordinates = await getPhotonCoordinates(`${postalCode} India`)
    if (broadCoordinates) {
        return {
            latitude: broadCoordinates.latitude,
            longitude: broadCoordinates.longitude,
            label: broadCoordinates.label,
            postcode: broadCoordinates.postcode,
        }
    }

    return null
}

const getDeliveryZone = async (address = {}) => {
    const [restaurantCoordinates, customerCoordinates] = await Promise.all([
        getRestaurantCoordinates(),
        getCustomerCoordinatesFromPostalCode(address),
    ])

    if (!restaurantCoordinates || !customerCoordinates) {
        return {
            distanceKm: 0,
            fee: 0,
            available: false,
            label: "Address could not be verified",
            geocoded: false,
        }
    }

    const distanceKm = haversineDistanceKm(restaurantCoordinates, customerCoordinates)
    const available = distanceKm <= RESTAURANT_RULES.maxDeliveryDistanceKm

    let fee = 0
    if (distanceKm <= 3) fee = 20
    else if (distanceKm <= 8) fee = 35
    else if (distanceKm <= 15) fee = 55
    else if (distanceKm <= 25) fee = 80
    else if (distanceKm <= 50) fee = 120

    return {
        distanceKm,
        fee,
        available,
        label: available
            ? `${distanceKm} km from VIT Chennai`
            : `Too far away: ${distanceKm} km from VIT Chennai`,
        geocoded: true,
    }
}

const buildOrderQuote = async ({ items = [], address = {}, foodLookup = new Map(), now = new Date(), promoCode = "" }) => {
    const schedule = await getRestaurantSchedule()
    const errors = []
    const warnings = []
    const normalizedItems = []
    let subtotal = 0
    let gstAmount = 0
    let totalQuantity = 0
    let maxPrepTimeMinutes = 0

    if (!items.length) {
        errors.push("Your cart is empty.")
    }

    if (!address?.zip_code || !/^\d{6}$/.test(String(address.zip_code).trim())) {
        errors.push("Please enter a valid 6-digit delivery pincode.")
    }

    if (!address?.phone || !/^\d{10}$/.test(String(address.phone).replace(/\D/g, ""))) {
        errors.push("Please enter a valid 10-digit phone number.")
    }

    const currentHour = now.getHours()
    if (!(currentHour >= schedule.opensAtHour && currentHour < schedule.closesAtHour)) {
        errors.push(`Orders are accepted only between ${schedule.opensAtHour}:00 and ${schedule.closesAtHour}:00.`)
    }

    items.forEach((item) => {
        const itemId = String(item?._id || item?.id || "")
        const quantity = Number(item?.quantity || 0)
        const food = foodLookup.get(itemId)

        if (!food) {
            errors.push(`One of the items in your cart is no longer available.`)
            return
        }

        if (quantity <= 0) {
            return
        }

        if (quantity > RESTAURANT_RULES.maxQuantityPerItem) {
            errors.push(`${food.name} exceeds the maximum quantity limit of ${RESTAURANT_RULES.maxQuantityPerItem}.`)
        }

        if (food.available === false) {
            errors.push(`${food.name} is currently unavailable.`)
        }

        const availableStock = Number(food.stock ?? 20)
        if (availableStock < quantity) {
            errors.push(`${food.name} has only ${availableStock} portions left.`)
        }

        if (availableStock <= schedule.lowStockThreshold) {
            warnings.push(`${food.name} is running low on stock.`)
        }

        const unitPrice = Number(food.price)
        const itemSubtotal = unitPrice * quantity
        const gstRate = getGstRateForItem(food)
        const itemGst = Number(((itemSubtotal * gstRate) / 100).toFixed(2))

        totalQuantity += quantity
        subtotal += itemSubtotal
        gstAmount += itemGst
        const prepTimeMinutes = getEffectivePrepTimeMinutes(food)
        maxPrepTimeMinutes = Math.max(maxPrepTimeMinutes, prepTimeMinutes)

        normalizedItems.push({
            _id: food._id,
            name: food.name,
            image: food.image,
            price: unitPrice,
            category: food.category,
            prepTimeMinutes,
            gstRate,
            quantity,
            itemSubtotal,
            itemGst,
        })
    })

    if (totalQuantity > RESTAURANT_RULES.maxTotalItems) {
        errors.push(`Orders cannot exceed ${RESTAURANT_RULES.maxTotalItems} total items.`)
    }

    let deliveryZone = {
        distanceKm: 0,
        fee: 0,
        available: false,
        label: "Delivery distance could not be calculated",
        geocoded: false,
    }

    try {
        deliveryZone = await getDeliveryZone(address)
    } catch (error) {
        errors.push("Unable to validate delivery distance right now. Please try again.")
    }

    if (!deliveryZone.geocoded && !errors.includes("Unable to validate delivery distance right now. Please try again.")) {
        errors.push("Address could not be verified. Please refine the address details.")
    }

    if (deliveryZone.geocoded && !deliveryZone.available) {
        errors.push(`Address is too far away for delivery. Distance: ${deliveryZone.distanceKm} km from VIT Chennai.`)
    }

    if (subtotal > 0 && subtotal < RESTAURANT_RULES.minimumOrderAmount) {
        errors.push(`Minimum order amount is Rs ${RESTAURANT_RULES.minimumOrderAmount}.`)
    }

    const normalizedPromoCode = String(promoCode || "").trim().toUpperCase()
    const promoApplied = normalizedPromoCode === PROMO_RULES.code
    let discountAmount = 0

    if (normalizedPromoCode && !promoApplied) {
        errors.push("Invalid promo code. Please use a valid code or remove it.")
    }

    if (promoApplied && subtotal > 0) {
        discountAmount = Number(((subtotal * PROMO_RULES.discountPercent) / 100).toFixed(2))
        warnings.push(`${PROMO_RULES.discountPercent}% promo discount applied with code ${PROMO_RULES.code}.`)
    }

    const peakSurcharge = RESTAURANT_RULES.peakHours.includes(now.getHours()) ? RESTAURANT_RULES.peakHourSurcharge : 0
    const deliveryFee =
        subtotal >= RESTAURANT_RULES.freeDeliveryThreshold
            ? 0
            : deliveryZone.available
                ? deliveryZone.fee
                : 0

    if (deliveryFee === 0 && subtotal >= RESTAURANT_RULES.freeDeliveryThreshold) {
        warnings.push("Free delivery applied on this order.")
    }

    if (peakSurcharge > 0) {
        warnings.push("Peak-hour handling surcharge applied due to high demand.")
    }

    const effectivePrepTimeMinutes = normalizedItems.length ? maxPrepTimeMinutes : 0
    const estimatedTravelMinutes = deliveryZone.available
        ? Math.max(10, Math.ceil(Number(deliveryZone.distanceKm || 0) * 5))
        : 0
    const estimatedDeliveryMinutes = Math.max(
        effectivePrepTimeMinutes,
        effectivePrepTimeMinutes + estimatedTravelMinutes
    )
    const estimatedReadyAt = new Date(now.getTime() + effectivePrepTimeMinutes * 60 * 1000)
    const estimatedDeliveryAt = new Date(now.getTime() + estimatedDeliveryMinutes * 60 * 1000)
    const total = Number((subtotal + gstAmount + deliveryFee + peakSurcharge - discountAmount).toFixed(2))

    return {
        ok: errors.length === 0,
        errors,
        warnings,
        items: normalizedItems,
        pricing: {
            subtotal: Number(subtotal.toFixed(2)),
            gstAmount: Number(gstAmount.toFixed(2)),
            deliveryFee,
            peakSurcharge,
            discountAmount,
            total,
        },
        rules: {
            gstRates: CATEGORY_GST_RATES,
            deliveryZone,
            minimumOrderAmount: RESTAURANT_RULES.minimumOrderAmount,
            freeDeliveryThreshold: RESTAURANT_RULES.freeDeliveryThreshold,
            maxQuantityPerItem: RESTAURANT_RULES.maxQuantityPerItem,
            maxTotalItems: RESTAURANT_RULES.maxTotalItems,
            cancelWindowMinutes: RESTAURANT_RULES.cancelWindowMinutes,
            maxDeliveryDistanceKm: RESTAURANT_RULES.maxDeliveryDistanceKm,
            estimatedPrepMinutes: effectivePrepTimeMinutes,
            estimatedTravelMinutes,
            estimatedDeliveryMinutes,
            estimatedReadyAt,
            estimatedDeliveryAt,
            prepBreakdown: normalizedItems.map((item)=>({
                itemId:item._id,
                name:item.name,
                quantity:item.quantity,
                prepTimeMinutes:item.prepTimeMinutes,
            })),
            promoCode: PROMO_RULES.code,
            promoDiscountPercent: PROMO_RULES.discountPercent,
            promoApplied,
            opensAtHour: schedule.opensAtHour,
            closesAtHour: schedule.closesAtHour,
            lowStockThreshold: schedule.lowStockThreshold,
            restaurantName: schedule.restaurantName,
        },
    }
}

module.exports = {
    CATEGORY_GST_RATES,
    RESTAURANT_RULES,
    PROMO_RULES,
    isRestaurantOpen,
    getGstRateForItem,
    getDeliveryZone,
    buildOrderQuote,
    getRestaurantSchedule,
}
