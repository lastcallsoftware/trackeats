package com.lastcallsw.trackeats.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Data;
import java.time.LocalDate; // Changed from java.util.Date

@Data
@Entity
@Table(name = "food")
public class Food {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "`group`", nullable = false) // Escaped 'group' as it's a reserved keyword
    private FoodGroup group;

    @Column(length = 50, nullable = false)
    private String name;

    @Column(length = 50, nullable = true)
    private String subtype;

    @Column(length = 100, nullable = true)
    private String description;

    @Column(length = 50, nullable = false)
    private String vendor;

    @Column(name = "size_description", length = 50, nullable = true)
    private String sizeDescription;

    @Column(name = "size_oz", nullable = true)
    private Float sizeOz;

    @Column(name = "size_g", nullable = true)
    private Integer sizeG;

    @Column(nullable = false)
    private Float servings;

    @OneToOne
    @JoinColumn(name = "nutrition_id", nullable = true)
    private Nutrition nutrition;

    @Column(nullable = true)
    private Float price;

    @Column(name = "price_date", nullable = true)
    private LocalDate priceDate; // Changed from Date to LocalDate

    @Column(name = "shelf_life", length = 150, nullable = true)
    private String shelfLife;

    // Getters and setters are handled by Lombok @Data
}
