export const foodGroups = [
    { value: "", label: "-- select one --" },
    { value: "beverages", label: "Beverages" },
    { value: "condiments", label: "Condiments" },
    { value: "dairy", label: "Dairy" },
    { value: "fatsAndSugars", label: "Fats and Sugars" },
    { value: "fruits", label: "Fruits" },
    { value: "grains", label: "Grains" },
    { value: "herbsAndSpices", label: "Herbs and Spices" },
    { value: "nutsAndSeeds", label: "Nuts and Seeds" },
    { value: "preparedFoods", label: "Prepared and Packaged Foods" },
    { value: "proteins", label: "Proteins" },
    { value: "vegetables", label: "Vegetables" },
    { value: "other", label: "Other" }
];

export const getFoodGroupLabel = (foodGroupName: string) : string|undefined => {
    const foodGroup = foodGroups.find(obj => obj.value == foodGroupName);
    return foodGroup?.label;
}