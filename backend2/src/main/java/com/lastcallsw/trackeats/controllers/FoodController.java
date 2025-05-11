package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.entities.Food;
import com.lastcallsw.trackeats.repositories.FoodRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/foods")
public class FoodController {

    @Autowired
    private FoodRepository foodRepository;

    // Get all foods
    @GetMapping
    public @ResponseBody Iterable<Food> getAllFoods() {
        return foodRepository.findAll();
    }

    // Get a single food by ID
    @GetMapping("/{id}")
    public ResponseEntity<Food> getFoodById(@PathVariable Integer id) {
        Optional<Food> food = foodRepository.findById(id);
        return food.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Add a new food
    @PostMapping
    public ResponseEntity<Food> addFood(@RequestBody Food food) {
        Food savedFood = foodRepository.save(food);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedFood);
    }

    // Update an existing food
    @PutMapping("/{id}")
    public ResponseEntity<Food> updateFood(@PathVariable Integer id, @RequestBody Food foodDetails) {
        Optional<Food> optionalFood = foodRepository.findById(id);
        if (optionalFood.isPresent()) {
            Food existingFood = optionalFood.get();
            // Update fields
            existingFood.setUser(foodDetails.getUser());
            existingFood.setGroup(foodDetails.getGroup());
            existingFood.setName(foodDetails.getName());
            existingFood.setSubtype(foodDetails.getSubtype());
            existingFood.setDescription(foodDetails.getDescription());
            existingFood.setVendor(foodDetails.getVendor());
            existingFood.setSizeDescription(foodDetails.getSizeDescription());
            existingFood.setSizeOz(foodDetails.getSizeOz());
            existingFood.setSizeG(foodDetails.getSizeG());
            existingFood.setServings(foodDetails.getServings());
            existingFood.setNutrition(foodDetails.getNutrition());
            existingFood.setPrice(foodDetails.getPrice());
            existingFood.setPriceDate(foodDetails.getPriceDate());
            existingFood.setShelfLife(foodDetails.getShelfLife());
            Food updatedFood = foodRepository.save(existingFood);
            return ResponseEntity.ok(updatedFood);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete a food
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFood(@PathVariable Integer id) {
        if (foodRepository.existsById(id)) {
            foodRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
