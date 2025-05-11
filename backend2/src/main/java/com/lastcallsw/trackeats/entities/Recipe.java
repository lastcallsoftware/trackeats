package com.lastcallsw.trackeats.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import com.fasterxml.jackson.annotation.JsonManagedReference; // Added import
import lombok.Data;
import java.util.List;

@Data
@Entity
@Table(name = "recipe")
public class Recipe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Column(length = 20, nullable = true)
    private String cuisine;

    @Column(length = 50, nullable = false)
    private String name;

    @Column(name = "total_yield", length = 50, nullable = false)
    private String totalYield;

    @Column(nullable = false)
    private Float servings;

    @OneToOne
    @JoinColumn(name = "nutrition_id", nullable = true)
    private Nutrition nutrition;

    @Column(nullable = true)
    private Float price;

    @OneToMany(mappedBy = "recipe")
    @JsonManagedReference // Added to manage the forward part of the reference
    private List<Ingredient> ingredients;

    // Getters and setters are handled by Lombok @Data
}
