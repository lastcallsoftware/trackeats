package com.lastcallsw.trackeats.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.lastcallsw.trackeats.entities.Food;
import com.lastcallsw.trackeats.entities.FoodGroup;
import com.lastcallsw.trackeats.entities.Nutrition;
import com.lastcallsw.trackeats.entities.Ingredient;
import com.lastcallsw.trackeats.entities.Recipe;
import com.lastcallsw.trackeats.repositories.FoodRepository;
import com.lastcallsw.trackeats.repositories.IngredientRepository;
import com.lastcallsw.trackeats.repositories.NutritionRepository;
import com.lastcallsw.trackeats.repositories.RecipeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class DataLoadService {

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private NutritionRepository nutritionRepository;
    
    @Autowired
    private IngredientRepository ingredientRepository;
    
    @Autowired
    private RecipeRepository recipeRepository;

    private final ObjectMapper objectMapper;

    public DataLoadService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule()); // For handling Java 8 date/time types
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT); // For pretty printing JSON
        
        // Configure JSON formatting with 4-space indentation and braces on new lines
        objectMapper.getFactory().configure(com.fasterxml.jackson.core.JsonGenerator.Feature.WRITE_BIGDECIMAL_AS_PLAIN, true);
        objectMapper.setDefaultPrettyPrinter(new com.fasterxml.jackson.core.util.DefaultPrettyPrinter() {
            {
                _objectIndenter = new com.fasterxml.jackson.core.util.DefaultIndenter("    ", "\n");
                _arrayIndenter = new com.fasterxml.jackson.core.util.DefaultIndenter("    ", "\n");
            }
            
            @Override
            public void writeStartObject(com.fasterxml.jackson.core.JsonGenerator g) throws java.io.IOException {
                g.writeRaw("{\n");
                _objectIndenter.writeIndentation(g, _nesting);
            }
            
            @Override
            public void writeEndObject(com.fasterxml.jackson.core.JsonGenerator g, int nrOfEntries) throws java.io.IOException {
                g.writeRaw("\n");
                _objectIndenter.writeIndentation(g, _nesting - 1);
                g.writeRaw("}");
            }
            
            @Override
            public void writeObjectEntrySeparator(com.fasterxml.jackson.core.JsonGenerator g) throws java.io.IOException {
                g.writeRaw(",\n");
                _objectIndenter.writeIndentation(g, _nesting);
            }
            
            @Override
            public void writeStartArray(com.fasterxml.jackson.core.JsonGenerator g) throws java.io.IOException {
                g.writeRaw("[\n");
                _arrayIndenter.writeIndentation(g, _nesting);
            }
            
            @Override
            public void writeEndArray(com.fasterxml.jackson.core.JsonGenerator g, int nrOfValues) throws java.io.IOException {
                g.writeRaw("\n");
                _arrayIndenter.writeIndentation(g, _nesting - 1);
                g.writeRaw("]");
            }
            
            @Override
            public void writeArrayValueSeparator(com.fasterxml.jackson.core.JsonGenerator g) throws java.io.IOException {
                g.writeRaw(",\n");
                _arrayIndenter.writeIndentation(g, _nesting);
            }
            
            @Override
            public com.fasterxml.jackson.core.util.DefaultPrettyPrinter createInstance() {
                return new com.fasterxml.jackson.core.util.DefaultPrettyPrinter(this);
            }
        });
    }

    /**
     * Loads food data from a JSON file
     * 
     * @param filePath Path to the JSON file
     * @return Summary of the load operation
     * @throws IOException If there's an error reading or parsing the file
     */
    @Transactional
    public Map<String, Object> loadFoodsFromJson(String filePath) throws IOException {
        // Resolve the file path relative to the current directory
        File file = resolveFilePath(filePath);
        
        if (!file.exists()) {
            throw new IOException("File not found: " + filePath);
        }
        
        // Truncate existing data in food, nutrition, and ingredient tables before loading
        ingredientRepository.deleteAll();
        foodRepository.deleteAll();
        nutritionRepository.deleteAll();

        // Read foods from JSON file
        List<Map<String, Object>> foodsData = objectMapper.readValue(
            file, 
            new TypeReference<List<Map<String, Object>>>() {}
        );

        List<Food> savedFoods = new ArrayList<>();
        List<Map<String, Object>> errors = new ArrayList<>();

        for (Map<String, Object> foodData : foodsData) {
            try {
                // Extract and save nutrition data first
                Map<String, Object> nutritionData = objectMapper.convertValue(foodData.get("nutrition"), new TypeReference<Map<String, Object>>() {});
                Nutrition nutrition = mapNutrition(nutritionData);
                
                // Save nutrition to get an ID
                nutrition = nutritionRepository.save(nutrition);
                
                // Create and save food entity
                Food food = mapFood(foodData);
                food.setNutrition(nutrition);
                
                Food savedFood = foodRepository.save(food);
                savedFoods.add(savedFood);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("data", foodData);
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }

        // Prepare result summary
        Map<String, Object> result = new HashMap<>();
        result.put("totalProcessed", foodsData.size());
        result.put("successCount", savedFoods.size());
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        
        return result;
    }

    /**
     * Maps JSON nutrition data to a Nutrition entity
     */
    private Nutrition mapNutrition(Map<String, Object> data) {
        Nutrition nutrition = new Nutrition();
        
        // Set fields from data map
        nutrition.setServing_size_description((String) data.get("serving_size_description"));
        nutrition.setServing_size_g(getIntegerValue(data.get("serving_size_g")));
        nutrition.setServing_size_oz(getFloatValue(data.get("serving_size_oz")));
        nutrition.setCalories(getIntegerValue(data.get("calories")));
        nutrition.setTotal_fat_g(getFloatValue(data.get("total_fat_g")));
        nutrition.setSaturated_fat_g(getFloatValue(data.get("saturated_fat_g")));
        nutrition.setTrans_fat_g(getIntegerValue(data.get("trans_fat_g")));
        nutrition.setCholesterol_mg(getIntegerValue(data.get("cholesterol_mg")));
        nutrition.setSodium_mg(getIntegerValue(data.get("sodium_mg")));
        nutrition.setTotal_carbs_g(getIntegerValue(data.get("total_carbs_g")));
        nutrition.setFiber_g(getIntegerValue(data.get("fiber_g")));
        nutrition.setTotal_sugar_g(getIntegerValue(data.get("total_sugar_g")));
        nutrition.setAdded_sugar_g(getIntegerValue(data.get("added_sugar_g")));
        nutrition.setProtein_g(getIntegerValue(data.get("protein_g")));
        nutrition.setVitamin_d_mcg(getIntegerValue(data.get("vitamin_d_mcg")));
        nutrition.setCalcium_mg(getIntegerValue(data.get("calcium_mg")));
        nutrition.setIron_mg(getFloatValue(data.get("iron_mg")));
        nutrition.setPotassium_mg(getIntegerValue(data.get("potassium_mg")));
        
        return nutrition;
    }

    /**
     * Maps JSON food data to a Food entity
     */
    private Food mapFood(Map<String, Object> data) {
        Food food = new Food();
        
        // Set fields from data map
        food.setName((String) data.get("name"));
        food.setSubtype((String) data.get("subtype"));
        food.setDescription((String) data.get("description"));
        food.setVendor((String) data.get("vendor"));
        food.setSizeDescription((String) data.get("size_description"));
        food.setSizeOz(getFloatValue(data.get("size_oz")));
        food.setSizeG(getIntegerValue(data.get("size_g")));
        food.setServings(getFloatValue(data.get("servings")));
        food.setPrice(getFloatValue(data.get("price")));
        
        // Handle price date
        if (data.get("price_date") != null) {
            String dateStr = (String) data.get("price_date");
            food.setPriceDate(LocalDate.parse(dateStr));
        }
        
        food.setShelfLife((String) data.get("shelf_life"));
        
        // Handle food group
        String groupStr = (String) data.get("group");
        if (groupStr != null) {
            try {
                FoodGroup group = FoodGroup.valueOf(groupStr);
                food.setGroup(group);
            } catch (IllegalArgumentException e) {
                // Default to "other" if the group doesn't match any enum value
                food.setGroup(FoodGroup.other);
            }
        } else {
            food.setGroup(FoodGroup.other);
        }
        
        // User ID is handled separately when saving
        
        return food;
    }

    /**
     * Safely converts an object to Integer
     */
    private Integer getIntegerValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Integer) {
            return (Integer) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Safely converts an object to Float
     */
    private Float getFloatValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Float) {
            return (Float) value;
        }
        if (value instanceof Number) {
            return ((Number) value).floatValue();
        }
        try {
            return Float.parseFloat(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    /**
     * Resolves a file path in a generic way, handling both absolute and relative paths.
     * For relative paths, it extracts the essential part of the path (after any project directory).
     * 
     * @param filePath The original file path
     * @return A File object representing the resolved path
     */
    private File resolveFilePath(String filePath) {
        // If it's an absolute path, use it directly
        if (new File(filePath).isAbsolute()) {
            return new File(filePath);
        }
        
        // For relative paths, extract the essential part (after any project directory)
        // This handles paths like "projectdir/data/file.json" by extracting "data/file.json"
        String[] pathParts = filePath.split("/");
        StringBuilder essentialPath = new StringBuilder();
        
        // Find the first occurrence of "data" directory or similar
        boolean foundDataDir = false;
        for (String part : pathParts) {
            if (foundDataDir || part.equals("data") || part.equals("resources") || part.endsWith(".json")) {
                if (essentialPath.length() > 0) {
                    essentialPath.append("/");
                }
                essentialPath.append(part);
                foundDataDir = true;
            }
        }
        
        // If we couldn't find a data directory, use the original path
        if (essentialPath.length() == 0) {
            return new File(filePath);
        }
        
        return new File(essentialPath.toString());
    }
    
    /**
     * Loads ingredient data from a JSON file
     * 
     * @param filePath Path to the JSON file
     * @return Summary of the load operation
     * @throws IOException If there's an error reading or parsing the file
     */
    @Transactional
    public Map<String, Object> loadIngredientsFromJson(String filePath) throws IOException {
        // Resolve the file path relative to the current directory
        File file = resolveFilePath(filePath);
        
        if (!file.exists()) {
            throw new IOException("File not found: " + filePath);
        }
        
        // Truncate existing data in ingredient table before loading
        ingredientRepository.deleteAll();

        // Read ingredients from JSON file
        List<Map<String, Object>> ingredientsData = objectMapper.readValue(
            file, 
            new TypeReference<List<Map<String, Object>>>() {}
        );

        List<Ingredient> savedIngredients = new ArrayList<>();
        List<Map<String, Object>> errors = new ArrayList<>();

        for (Map<String, Object> ingredientData : ingredientsData) {
            try {
                // Create and save ingredient entity
                Ingredient ingredient = mapIngredient(ingredientData);
                
                Ingredient savedIngredient = ingredientRepository.save(ingredient);
                savedIngredients.add(savedIngredient);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("data", ingredientData);
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }

        // Prepare result summary
        Map<String, Object> result = new HashMap<>();
        result.put("totalProcessed", ingredientsData.size());
        result.put("successCount", savedIngredients.size());
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        
        return result;
    }

    /**
     * Maps JSON ingredient data to an Ingredient entity
     */
    private Ingredient mapIngredient(Map<String, Object> data) {
        Ingredient ingredient = new Ingredient();
        
        // Set fields from data map
        ingredient.setOrdinal(getIntegerValue(data.get("ordinal")));
        ingredient.setServings(getFloatValue(data.get("servings")));
        ingredient.setSummary((String) data.get("summary"));
        
        // Handle recipe reference
        if (data.get("recipe_id") != null) {
            Integer recipeId = getIntegerValue(data.get("recipe_id"));
            if (recipeId != null) {
                Recipe recipe = recipeRepository.findById(recipeId).orElse(null);
                ingredient.setRecipe(recipe);
            }
        }
        
        // Handle food ingredient reference
        if (data.get("food_ingredient_id") != null) {
            Integer foodId = getIntegerValue(data.get("food_ingredient_id"));
            if (foodId != null) {
                Food food = foodRepository.findById(foodId).orElse(null);
                ingredient.setFoodIngredient(food);
            }
        }
        
        // Handle recipe ingredient reference
        if (data.get("recipe_ingredient_id") != null) {
            Integer recipeIngredientId = getIntegerValue(data.get("recipe_ingredient_id"));
            if (recipeIngredientId != null) {
                Recipe recipeIngredient = recipeRepository.findById(recipeIngredientId).orElse(null);
                ingredient.setRecipeIngredient(recipeIngredient);
            }
        }
        
        return ingredient;
    }

    /**
     * Loads recipe data from a JSON file
     * 
     * @param filePath Path to the JSON file
     * @return Summary of the load operation
     * @throws IOException If there's an error reading or parsing the file
     */
    @Transactional
    public Map<String, Object> loadRecipesFromJson(String filePath) throws IOException {
        // Resolve the file path relative to the current directory
        File file = resolveFilePath(filePath);
        
        if (!file.exists()) {
            throw new IOException("File not found: " + filePath);
        }
        
        // Truncate existing data in recipe table before loading
        // We need to delete ingredients first due to foreign key constraints
        ingredientRepository.deleteAll();
        recipeRepository.deleteAll();

        // Read recipes from JSON file
        List<Map<String, Object>> recipesData = objectMapper.readValue(
            file, 
            new TypeReference<List<Map<String, Object>>>() {}
        );

        List<Recipe> savedRecipes = new ArrayList<>();
        List<Map<String, Object>> errors = new ArrayList<>();

        for (Map<String, Object> recipeData : recipesData) {
            try {
                // Extract and save nutrition data first if present
                Nutrition nutrition = null;
                if (recipeData.get("nutrition") != null) {
                    Map<String, Object> nutritionData = objectMapper.convertValue(recipeData.get("nutrition"), new TypeReference<Map<String, Object>>() {});
                    nutrition = mapNutrition(nutritionData);
                    nutrition = nutritionRepository.save(nutrition);
                }
                
                // Create and save recipe entity
                Recipe recipe = mapRecipe(recipeData);
                if (nutrition != null) {
                    recipe.setNutrition(nutrition);
                }
                
                Recipe savedRecipe = recipeRepository.save(recipe);
                savedRecipes.add(savedRecipe);
            } catch (Exception e) {
                Map<String, Object> error = new HashMap<>();
                error.put("data", recipeData);
                error.put("error", e.getMessage());
                errors.add(error);
            }
        }

        // Prepare result summary
        Map<String, Object> result = new HashMap<>();
        result.put("totalProcessed", recipesData.size());
        result.put("successCount", savedRecipes.size());
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        
        return result;
    }

    /**
     * Maps JSON recipe data to a Recipe entity
     */
    private Recipe mapRecipe(Map<String, Object> data) {
        Recipe recipe = new Recipe();
        
        // Set fields from data map
        recipe.setName((String) data.get("name"));
        recipe.setCuisine((String) data.get("cuisine"));
        recipe.setTotalYield((String) data.get("total_yield"));
        recipe.setServings(getFloatValue(data.get("servings")));
        recipe.setPrice(getFloatValue(data.get("price")));
        
        return recipe;
    }

    /**
     * Exports all foods from the database to a JSON file
     * 
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     * @throws IOException If there's an error writing to the file
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exportFoodsToJson(String filePath) throws IOException {
        // Get all foods from the database
        Iterable<Food> foodsIterable = foodRepository.findAll();
        
        // Convert to list of maps with the desired structure
        List<Map<String, Object>> foodsData = new ArrayList<>();
        
        for (Food food : foodsIterable) {
            Map<String, Object> foodMap = new HashMap<>();
            
            // Add food properties
            foodMap.put("id", food.getId());
            foodMap.put("user_id", food.getUser() != null ? food.getUser().getId() : null);
            foodMap.put("group", food.getGroup().name());
            foodMap.put("name", food.getName());
            foodMap.put("subtype", food.getSubtype());
            foodMap.put("description", food.getDescription());
            foodMap.put("vendor", food.getVendor());
            foodMap.put("size_description", food.getSizeDescription());
            foodMap.put("size_oz", food.getSizeOz());
            foodMap.put("size_g", food.getSizeG());
            foodMap.put("servings", food.getServings());
            
            // Add nutrition data if available
            Nutrition nutrition = food.getNutrition();
            if (nutrition != null) {
                foodMap.put("nutrition_id", nutrition.getId());
                
                Map<String, Object> nutritionMap = new HashMap<>();
                nutritionMap.put("id", nutrition.getId());
                nutritionMap.put("serving_size_description", nutrition.getServing_size_description());
                nutritionMap.put("serving_size_oz", nutrition.getServing_size_oz());
                nutritionMap.put("serving_size_g", nutrition.getServing_size_g());
                nutritionMap.put("calories", nutrition.getCalories());
                nutritionMap.put("total_fat_g", nutrition.getTotal_fat_g());
                nutritionMap.put("saturated_fat_g", nutrition.getSaturated_fat_g());
                nutritionMap.put("trans_fat_g", nutrition.getTrans_fat_g());
                nutritionMap.put("cholesterol_mg", nutrition.getCholesterol_mg());
                nutritionMap.put("sodium_mg", nutrition.getSodium_mg());
                nutritionMap.put("total_carbs_g", nutrition.getTotal_carbs_g());
                nutritionMap.put("fiber_g", nutrition.getFiber_g());
                nutritionMap.put("total_sugar_g", nutrition.getTotal_sugar_g());
                nutritionMap.put("added_sugar_g", nutrition.getAdded_sugar_g());
                nutritionMap.put("protein_g", nutrition.getProtein_g());
                nutritionMap.put("vitamin_d_mcg", nutrition.getVitamin_d_mcg());
                nutritionMap.put("calcium_mg", nutrition.getCalcium_mg());
                nutritionMap.put("iron_mg", nutrition.getIron_mg());
                nutritionMap.put("potassium_mg", nutrition.getPotassium_mg());
                
                foodMap.put("nutrition", nutritionMap);
            }
            
            foodMap.put("price", food.getPrice());
            foodMap.put("price_date", food.getPriceDate() != null ? food.getPriceDate().toString() : null);
            foodMap.put("shelf_life", food.getShelfLife());
            
            foodsData.add(foodMap);
        }
        
        // Resolve the file path
        File file = resolveFilePath(filePath);
        
        // Create parent directories if they don't exist
        File parentDir = file.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }
        
        objectMapper.writeValue(file, foodsData);
        
        // Prepare result summary
        Map<String, Object> result = new HashMap<>();
        result.put("totalExported", foodsData.size());
        result.put("filePath", filePath);
        
        return result;
    }
    
    /**
     * Exports all ingredients from the database to a JSON file
     * 
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     * @throws IOException If there's an error writing to the file
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exportIngredientsToJson(String filePath) throws IOException {
        // Get all ingredients from the database
        Iterable<Ingredient> ingredientsIterable = ingredientRepository.findAll();
        
        // Convert to list of maps with the desired structure
        List<Map<String, Object>> ingredientsData = new ArrayList<>();
        
        for (Ingredient ingredient : ingredientsIterable) {
            Map<String, Object> ingredientMap = new HashMap<>();
            
            // Add ingredient properties
            ingredientMap.put("id", ingredient.getId());
            ingredientMap.put("recipe_id", ingredient.getRecipe() != null ? ingredient.getRecipe().getId() : null);
            ingredientMap.put("food_ingredient_id", ingredient.getFoodIngredient() != null ? ingredient.getFoodIngredient().getId() : null);
            ingredientMap.put("recipe_ingredient_id", ingredient.getRecipeIngredient() != null ? ingredient.getRecipeIngredient().getId() : null);
            ingredientMap.put("ordinal", ingredient.getOrdinal());
            ingredientMap.put("servings", ingredient.getServings());
            ingredientMap.put("summary", ingredient.getSummary());
            
            ingredientsData.add(ingredientMap);
        }
        
        // Resolve the file path
        File file = resolveFilePath(filePath);
        
        // Create parent directories if they don't exist
        File parentDir = file.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }
        
        objectMapper.writeValue(file, ingredientsData);
        
        // Prepare result summary
        Map<String, Object> result = new HashMap<>();
        result.put("totalExported", ingredientsData.size());
        result.put("filePath", filePath);
        
        return result;
    }
    
    /**
     * Exports all recipes from the database to a JSON file
     * 
     * @param filePath Path where the JSON file will be saved
     * @return Summary of the export operation
     * @throws IOException If there's an error writing to the file
     */
    @Transactional(readOnly = true)
    public Map<String, Object> exportRecipesToJson(String filePath) throws IOException {
        // Get all recipes from the database
        Iterable<Recipe> recipesIterable = recipeRepository.findAll();
        
        // Convert to list of maps with the desired structure
        List<Map<String, Object>> recipesData = new ArrayList<>();
        
        for (Recipe recipe : recipesIterable) {
            Map<String, Object> recipeMap = new HashMap<>();
            
            // Add recipe properties
            recipeMap.put("id", recipe.getId());
            recipeMap.put("user_id", recipe.getUser() != null ? recipe.getUser().getId() : null);
            recipeMap.put("cuisine", recipe.getCuisine());
            recipeMap.put("name", recipe.getName());
            recipeMap.put("total_yield", recipe.getTotalYield());
            recipeMap.put("servings", recipe.getServings());
            recipeMap.put("price", recipe.getPrice());
            
            // Add nutrition data if available
            Nutrition nutrition = recipe.getNutrition();
            if (nutrition != null) {
                recipeMap.put("nutrition_id", nutrition.getId());
                
                Map<String, Object> nutritionMap = new HashMap<>();
                nutritionMap.put("id", nutrition.getId());
                nutritionMap.put("serving_size_description", nutrition.getServing_size_description());
                nutritionMap.put("serving_size_oz", nutrition.getServing_size_oz());
                nutritionMap.put("serving_size_g", nutrition.getServing_size_g());
                nutritionMap.put("calories", nutrition.getCalories());
                nutritionMap.put("total_fat_g", nutrition.getTotal_fat_g());
                nutritionMap.put("saturated_fat_g", nutrition.getSaturated_fat_g());
                nutritionMap.put("trans_fat_g", nutrition.getTrans_fat_g());
                nutritionMap.put("cholesterol_mg", nutrition.getCholesterol_mg());
                nutritionMap.put("sodium_mg", nutrition.getSodium_mg());
                nutritionMap.put("total_carbs_g", nutrition.getTotal_carbs_g());
                nutritionMap.put("fiber_g", nutrition.getFiber_g());
                nutritionMap.put("total_sugar_g", nutrition.getTotal_sugar_g());
                nutritionMap.put("added_sugar_g", nutrition.getAdded_sugar_g());
                nutritionMap.put("protein_g", nutrition.getProtein_g());
                nutritionMap.put("vitamin_d_mcg", nutrition.getVitamin_d_mcg());
                nutritionMap.put("calcium_mg", nutrition.getCalcium_mg());
                nutritionMap.put("iron_mg", nutrition.getIron_mg());
                nutritionMap.put("potassium_mg", nutrition.getPotassium_mg());
                
                recipeMap.put("nutrition", nutritionMap);
            }
            
            recipesData.add(recipeMap);
        }
        
        // Resolve the file path
        File file = resolveFilePath(filePath);
        
        // Create parent directories if they don't exist
        File parentDir = file.getParentFile();
        if (parentDir != null && !parentDir.exists()) {
            parentDir.mkdirs();
        }
        
        objectMapper.writeValue(file, recipesData);
        
        // Prepare result summary
        Map<String, Object> result = new HashMap<>();
        result.put("totalExported", recipesData.size());
        result.put("filePath", filePath);
        
        return result;
    }
}
