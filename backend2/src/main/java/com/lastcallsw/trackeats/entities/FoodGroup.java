package com.lastcallsw.trackeats.entities;

public enum FoodGroup {
    beverages,
    condiments,
    dairy,
    fatsAndSugars,
    fruits,
    grains,
    herbsAndSpices,
    nutsAndSeeds,
    preparedFoods,
    proteins,
    vegetables,
    other;

    // JPA with EnumType.STRING will use the enum constant's name() method.
    // The enum constant names must match the string values in the database.
}
