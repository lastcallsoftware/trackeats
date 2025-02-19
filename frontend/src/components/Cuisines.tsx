export const cuisines = [
    { value: "", label: "-- select one --" },
    { value: "american", label: "American" },
    { value: "belarusian", label: "Belarusian" },
    { value: "caribbean", label: "Caribbean" },
    { value: "chinese", label: "Chinese" },
    { value: "colombian", label: "Colombian" },
    { value: "finnish", label: "Finnish" },
    { value: "french", label: "French" },
    { value: "greek", label: "Greek" },
    { value: "indian", label: "Indian" },
    { value: "indonesian", label: "Indonesian" },
    { value: "italian", label: "Italian" },
    { value: "japanese", label: "Japanese" },
    { value: "kazakh", label: "Kazakh" },
    { value: "korean", label: "Korean" },
    { value: "kyrgyz", label: "Kyrgyz" },
    { value: "malaysian", label: "Malaysian" },
    { value: "mexican", label: "Mexican" },
    { value: "mediterranean", label: "Mediterranean" },
    { value: "middleeastern", label: "Middle Eastern" },
    { value: "moroccan", label: "Moroccan" },
    { value: "philippine", label: "Philippine" },
    { value: "russian", label: "Russian" },
    { value: "southamerican", label: "South American" },
    { value: "spanish", label: "Spanish" },
    { value: "thai", label: "Thai" },
    { value: "turkish", label: "Turkish" },
    { value: "ukranian", label: "Ukranian" },
    { value: "uzbek", label: "Uzbek" },
    { value: "vietnamese", label: "Vietnamese" },
    { value: "other", label: "Other" }
];
export const getCuisineLabel = (cuisineName: string) : string|undefined => {
    const cuisine = cuisines.find(obj => obj.value == cuisineName);
    return cuisine?.label;
}
