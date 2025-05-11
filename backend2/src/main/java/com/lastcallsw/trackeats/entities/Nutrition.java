package com.lastcallsw.trackeats.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table; // Added import for Table
import lombok.Data;

@Data
@Entity
@Table(name = "Nutrition") // Added to explicitly map to the Nutrition table
public class Nutrition {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Changed from SEQUENCE to IDENTITY
    private Integer id;

    @Column(name = "serving_size_description", length = 50, nullable = false)
    private String serving_size_description;

    @Column(name = "serving_size_g", nullable = true)
    private Integer serving_size_g;

    @Column(name = "serving_size_oz", nullable = true)
    private Float serving_size_oz;

    @Column(name = "calories", nullable = false)
    private Integer calories;

    @Column (name = "total_fat_g", nullable = true)
    private Float total_fat_g;

    @Column(name = "saturated_fat_g", nullable = true)
    private Float saturated_fat_g;

    @Column(name = "trans_fat_g", nullable = true)
    private Integer trans_fat_g;

    @Column(name = "cholesterol_mg", nullable = true)
    private Integer cholesterol_mg;

    @Column(name = "sodium_mg", nullable = true)
    private Integer sodium_mg;

    @Column(name = "total_carbs_g", nullable = true)
    private Integer total_carbs_g;

    @Column(name = "fiber_g", nullable = true)
    private Integer fiber_g;

    @Column(name = "total_sugar_g", nullable = true)
    private Integer total_sugar_g;

    @Column(name = "added_sugar_g", nullable = true)
    private Integer added_sugar_g;
    
    @Column(name = "protein_g", nullable = true)
    private Integer protein_g;

    @Column(name = "vitamin_d_mcg", nullable = true)
    private Integer vitamin_d_mcg;

    @Column(name = "calcium_mg", nullable = true)
    private Integer calcium_mg;

    @Column(name = "iron_mg", nullable = true)
    private Float iron_mg;

    @Column(name = "potassium_mg", nullable = true)
    private Integer potassium_mg;
    
}
