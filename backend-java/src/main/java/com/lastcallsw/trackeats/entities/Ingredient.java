package com.lastcallsw.trackeats.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonBackReference; // Added import
import lombok.Data;

@Data
@Entity
@Table(name = "ingredient")
public class Ingredient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "recipe_id")
    @JsonBackReference // Added to manage the back part of the reference
    private Recipe recipe;

    @ManyToOne
    @JoinColumn(name = "food_ingredient_id")
    private Food foodIngredient; // Assuming Food entity exists for food_ingredient_id

    @ManyToOne
    @JoinColumn(name = "recipe_ingredient_id")
    private Recipe recipeIngredient; // Assuming Recipe entity exists for recipe_ingredient_id

    @Column(nullable = true)
    private Integer ordinal;

    @Column(nullable = false)
    private Float servings;

    @Column(length = 100, nullable = true)
    private String summary;

    // Getters and setters are handled by Lombok @Data
}
