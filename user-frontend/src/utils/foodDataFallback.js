const uniqueList = (items) => [...new Set(items.filter(Boolean))];

const derivePrepTimeMinutes = (item) => {
  const name = String(item?.name || "");
  const category = String(item?.category || "");

  let prepTimeMinutes =
    {
      Salad: 12,
      Rolls: 18,
      Deserts: 8,
      Sandwich: 15,
      Cake: 35,
      "Pure Veg": 22,
      Pasta: 24,
      Noodles: 20,
    }[category] || 25;

  if (/ice cream/i.test(name)) prepTimeMinutes = 6;
  if (/salad/i.test(name)) prepTimeMinutes = 12;
  if (/sandwich/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 15);
  if (/roll/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 18);
  if (/noodle/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 20);
  if (/pasta|lasagna/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 24);
  if (/cake/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 35);
  if (/grilled/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 18);
  if (/chicken/i.test(name)) prepTimeMinutes = Math.max(prepTimeMinutes, 22);
  if (/vegan|veg/i.test(name) && category !== "Cake") prepTimeMinutes = Math.max(10, prepTimeMinutes - 2);

  return Math.max(5, prepTimeMinutes);
};

const buildFallbackFoodData = (item) => {
  const name = String(item?.name || "");
  const category = String(item?.category || "");

  let nutrition = {
    calories: 220,
    sodium: 320,
    sugar: 8,
    protein: 8,
    carbs: 24,
    fat: 9,
  };

  let dietaryInfo = {
    containsPeanuts: false,
    containsDairy: false,
    containsGluten: false,
    diabeticFriendly: false,
    vegan: false,
    spicy: false,
  };

  let allergens = [];
  let healthTags = [];

  switch (category) {
    case "Salad":
      nutrition = { calories: 180, sodium: 220, sugar: 6, protein: 7, carbs: 14, fat: 8 };
      healthTags = ["Fresh", "Light meal"];
      break;
    case "Rolls":
      nutrition = { calories: 310, sodium: 480, sugar: 5, protein: 10, carbs: 32, fat: 13 };
      dietaryInfo.containsGluten = true;
      allergens = ["Gluten"];
      healthTags = ["Handheld"];
      break;
    case "Deserts":
      nutrition = { calories: 340, sodium: 140, sugar: 28, protein: 5, carbs: 36, fat: 18 };
      dietaryInfo.containsDairy = true;
      allergens = ["Dairy"];
      healthTags = ["Sweet treat"];
      break;
    case "Sandwich":
      nutrition = { calories: 330, sodium: 520, sugar: 7, protein: 12, carbs: 30, fat: 14 };
      dietaryInfo.containsGluten = true;
      allergens = ["Gluten"];
      healthTags = ["Filling"];
      break;
    case "Cake":
      nutrition = { calories: 360, sodium: 210, sugar: 30, protein: 4, carbs: 42, fat: 16 };
      dietaryInfo.containsDairy = true;
      dietaryInfo.containsGluten = true;
      allergens = ["Dairy", "Gluten"];
      healthTags = ["Bakery"];
      break;
    case "Pure Veg":
      nutrition = { calories: 240, sodium: 280, sugar: 6, protein: 8, carbs: 26, fat: 10 };
      dietaryInfo.vegan = true;
      healthTags = ["Plant based", "Veg special"];
      break;
    case "Pasta":
      nutrition = { calories: 380, sodium: 540, sugar: 8, protein: 13, carbs: 44, fat: 16 };
      dietaryInfo.containsGluten = true;
      allergens = ["Gluten"];
      healthTags = ["Comfort food"];
      break;
    case "Noodles":
      nutrition = { calories: 350, sodium: 620, sugar: 7, protein: 9, carbs: 46, fat: 12 };
      dietaryInfo.containsGluten = true;
      allergens = ["Gluten"];
      healthTags = ["Popular"];
      break;
    default:
      break;
  }

  if (/Chicken/i.test(name)) {
    nutrition.protein += 8;
    nutrition.calories += 40;
    dietaryInfo.vegan = false;
    healthTags.push("High protein");
  }

  if (/Vegan|Veg salad|Veg Rolls|Veg Noodles|Mix Veg|Garlic Mushroom|Rice Zucchini|Fried Cauliflower/i.test(name)) {
    dietaryInfo.vegan = true;
    healthTags.push("Plant based");
  }

  if (/Peri Peri/i.test(name)) {
    dietaryInfo.spicy = true;
    nutrition.sodium += 70;
    healthTags.push("Spicy");
  }

  if (/Ice Cream|Cake|Butterscotch|Vanilla|Ripple|Fruit|Cheese|Creamy|Lasagna/i.test(name)) {
    dietaryInfo.containsDairy = true;
    allergens.push("Dairy");
  }

  if (/Bread|Sandwich|Rolls|Pasta|Noodles|Cake|Lasagna/i.test(name) || ["Rolls", "Sandwich", "Pasta", "Noodles", "Cake"].includes(category)) {
    dietaryInfo.containsGluten = true;
    allergens.push("Gluten");
  }

  if (/Greek salad|Veg salad|Clover Salad|Rice Zucchini/i.test(name)) {
    dietaryInfo.diabeticFriendly = true;
    nutrition.sugar = Math.min(nutrition.sugar, 9);
    healthTags.push("Diabetes friendly");
  }

  if (/Fruit Ice Cream|Jar Ice Cream|Vanilla Ice Cream|Ripple Ice Cream|Cake|Butterscotch/i.test(name)) {
    dietaryInfo.diabeticFriendly = false;
  }

  return {
    nutrition,
    dietaryInfo,
    allergens: uniqueList(allergens),
    healthTags: uniqueList(healthTags),
  };
};

export const normalizeFoodItem = (item) => {
  const fallback = buildFallbackFoodData(item);

  return {
    ...item,
    nutrition: {
      calories: Number(item?.nutrition?.calories ?? fallback.nutrition.calories),
      sodium: Number(item?.nutrition?.sodium ?? fallback.nutrition.sodium),
      sugar: Number(item?.nutrition?.sugar ?? fallback.nutrition.sugar),
      protein: Number(item?.nutrition?.protein ?? fallback.nutrition.protein),
      carbs: Number(item?.nutrition?.carbs ?? fallback.nutrition.carbs),
      fat: Number(item?.nutrition?.fat ?? fallback.nutrition.fat),
    },
    dietaryInfo: {
      containsPeanuts: Boolean(item?.dietaryInfo?.containsPeanuts ?? fallback.dietaryInfo.containsPeanuts),
      containsDairy: Boolean(item?.dietaryInfo?.containsDairy ?? fallback.dietaryInfo.containsDairy),
      containsGluten: Boolean(item?.dietaryInfo?.containsGluten ?? fallback.dietaryInfo.containsGluten),
      diabeticFriendly: Boolean(item?.dietaryInfo?.diabeticFriendly ?? fallback.dietaryInfo.diabeticFriendly),
      vegan: Boolean(item?.dietaryInfo?.vegan ?? fallback.dietaryInfo.vegan),
      spicy: Boolean(item?.dietaryInfo?.spicy ?? fallback.dietaryInfo.spicy),
    },
    allergens:
      Array.isArray(item?.allergens) && item.allergens.length
        ? item.allergens
        : fallback.allergens,
    healthTags:
      Array.isArray(item?.healthTags) && item.healthTags.length
        ? item.healthTags
        : fallback.healthTags,
    available: item?.available ?? true,
    stock: Number(item?.stock ?? 12),
    prepTimeMinutes: Number(item?.prepTimeMinutes ?? derivePrepTimeMinutes(item)),
    gstRate: Number(item?.gstRate ?? 12),
  };
};
