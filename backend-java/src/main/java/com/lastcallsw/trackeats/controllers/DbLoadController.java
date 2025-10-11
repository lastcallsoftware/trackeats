package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.services.DataLoadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Controller for database operations
 * Provides endpoints to load data from external files into the database
 * and export data from the database to external files
 */
@RestController
@RequestMapping("/api/db")
public class DbLoadController {

    @Autowired
    private DataLoadService dataLoadService;

    /**
     * Endpoint to load food data from a JSON file
     * 
     * @param filePath Path to the JSON file containing food data
     * @return Summary of the load operation
     */
    @PostMapping("/load/foods")
    public ResponseEntity<?> loadFoods(@RequestParam(required = false) String filePath) {
        try {
            // If no file path is provided, use the default path
            if (filePath == null || filePath.isEmpty()) {
                filePath = "backend2/data/foods.json";
            }
            
            Map<String, Object> result = dataLoadService.loadFoodsFromJson(filePath);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load foods: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Endpoint to load ingredient data from a JSON file
     * 
     * @param filePath Path to the JSON file containing ingredient data
     * @return Summary of the load operation
     */
    @PostMapping("/load/ingredients")
    public ResponseEntity<?> loadIngredients(@RequestParam(required = false) String filePath) {
        try {
            // If no file path is provided, use the default path
            if (filePath == null || filePath.isEmpty()) {
                filePath = "backend2/data/ingredients.json";
            }
            
            Map<String, Object> result = dataLoadService.loadIngredientsFromJson(filePath);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load ingredients: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    /**
     * Endpoint to load recipe data from a JSON file
     * 
     * @param filePath Path to the JSON file containing recipe data
     * @return Summary of the load operation
     */
    @PostMapping("/load/recipes")
    public ResponseEntity<?> loadRecipes(@RequestParam(required = false) String filePath) {
        try {
            // If no file path is provided, use the default path
            if (filePath == null || filePath.isEmpty()) {
                filePath = "backend2/data/recipes.json";
            }
            
            Map<String, Object> result = dataLoadService.loadRecipesFromJson(filePath);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load recipes: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * General endpoint for database loading operations
     * Supports loading food, ingredient, and recipe data
     * 
     * @param type Type of data to load (e.g., "foods", "ingredients", "recipes")
     * @param filePath Path to the JSON file containing the data
     * @return Summary of the load operation
     */
    @PostMapping("/load")
    public ResponseEntity<?> loadData(
            @RequestParam String type,
            @RequestParam(required = false) String filePath) {
        
        try {
            Map<String, Object> result = new HashMap<>();
            
            switch (type.toLowerCase()) {
                case "foods":
                    // If no file path is provided, use the default path
                    if (filePath == null || filePath.isEmpty()) {
                        filePath = "backend2/data/foods.json";
                    }
                    result = dataLoadService.loadFoodsFromJson(filePath);
                    break;
                    
                case "ingredients":
                    // If no file path is provided, use the default path
                    if (filePath == null || filePath.isEmpty()) {
                        filePath = "backend2/data/ingredients.json";
                    }
                    result = dataLoadService.loadIngredientsFromJson(filePath);
                    break;
                    
                case "recipes":
                    // If no file path is provided, use the default path
                    if (filePath == null || filePath.isEmpty()) {
                        filePath = "backend2/data/recipes.json";
                    }
                    result = dataLoadService.loadRecipesFromJson(filePath);
                    break;
                    
                default:
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Unsupported data type: " + type);
                    return ResponseEntity.badRequest().body(error);
            }
            
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to load data: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    /**
     * Endpoint to export food data to a JSON file
     * 
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     */
    @PostMapping("/export/foods")
    public ResponseEntity<?> exportFoods(@RequestParam(required = false) String filePath) {
        try {
            // If no file path is provided, use the default path
            if (filePath == null || filePath.isEmpty()) {
                filePath = "backend2/data/foods.json";
            }
            
            Map<String, Object> result = dataLoadService.exportFoodsToJson(filePath);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to export foods: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Endpoint to export ingredient data to a JSON file
     * 
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     */
    @PostMapping("/export/ingredients")
    public ResponseEntity<?> exportIngredients(@RequestParam(required = false) String filePath) {
        try {
            // If no file path is provided, use the default path
            if (filePath == null || filePath.isEmpty()) {
                filePath = "backend2/data/ingredients.json";
            }
            
            Map<String, Object> result = dataLoadService.exportIngredientsToJson(filePath);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to export ingredients: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Endpoint to export recipe data to a JSON file
     * 
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     */
    @PostMapping("/export/recipes")
    public ResponseEntity<?> exportRecipes(@RequestParam(required = false) String filePath) {
        try {
            // If no file path is provided, use the default path
            if (filePath == null || filePath.isEmpty()) {
                filePath = "backend2/data/recipes.json";
            }
            
            Map<String, Object> result = dataLoadService.exportRecipesToJson(filePath);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to export recipes: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * General endpoint for database export operations
     * Supports exporting food, ingredient, and recipe data
     * 
     * @param type Type of data to export (e.g., "foods", "ingredients", "recipes")
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     */
    @PostMapping("/export")
    public ResponseEntity<?> exportData(
            @RequestParam String type,
            @RequestParam(required = false) String filePath) {
        
        try {
            Map<String, Object> result = new HashMap<>();
            
            switch (type.toLowerCase()) {
                case "foods":
                    // If no file path is provided, use the default path
                    if (filePath == null || filePath.isEmpty()) {
                        filePath = "backend2/data/foods.json";
                    }
                    result = dataLoadService.exportFoodsToJson(filePath);
                    break;
                    
                case "ingredients":
                    // If no file path is provided, use the default path
                    if (filePath == null || filePath.isEmpty()) {
                        filePath = "backend2/data/ingredients.json";
                    }
                    result = dataLoadService.exportIngredientsToJson(filePath);
                    break;
                    
                case "recipes":
                    // If no file path is provided, use the default path
                    if (filePath == null || filePath.isEmpty()) {
                        filePath = "backend2/data/recipes.json";
                    }
                    result = dataLoadService.exportRecipesToJson(filePath);
                    break;
                    
                default:
                    Map<String, String> error = new HashMap<>();
                    error.put("error", "Unsupported data type: " + type);
                    return ResponseEntity.badRequest().body(error);
            }
            
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to export data: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
