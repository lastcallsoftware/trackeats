package com.lastcallsw.trackeats.controllers;

import com.lastcallsw.trackeats.repositories.FoodRepository;
import com.lastcallsw.trackeats.repositories.IngredientRepository;
import com.lastcallsw.trackeats.repositories.RecipeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@ExtendWith(MockitoExtension.class)
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
public class DbLoadControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FoodRepository foodRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    @Autowired
    private RecipeRepository recipeRepository;


    private final String TEST_FOODS_FILE = "src/test/resources/test-foods.json";
    private final String TEST_INGREDIENTS_FILE = "src/test/resources/test-ingredients.json";
    private final String TEST_RECIPES_FILE = "src/test/resources/test-recipes.json";
    private final String EXPORT_FOODS_FILE = "src/test/resources/export-foods.json";
    private final String EXPORT_INGREDIENTS_FILE = "src/test/resources/export-ingredients.json";
    private final String EXPORT_RECIPES_FILE = "src/test/resources/export-recipes.json";

    @BeforeEach
    public void setup() {
        // Clear all repositories before each test
        ingredientRepository.deleteAll();
        foodRepository.deleteAll();
        recipeRepository.deleteAll();
        
        // Delete any existing export files
        deleteFileIfExists(EXPORT_FOODS_FILE);
        deleteFileIfExists(EXPORT_INGREDIENTS_FILE);
        deleteFileIfExists(EXPORT_RECIPES_FILE);
    }
    
    private void deleteFileIfExists(String filePath) {
        try {
            Files.deleteIfExists(Paths.get(filePath));
        } catch (IOException e) {
            // Ignore exceptions
        }
    }

    @Test
    public void testLoadFoods() throws Exception {
        // Test loading foods
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").exists())
                .andReturn();
        
        // Verify foods were loaded into the database
        long foodCount = foodRepository.count();
        assertTrue(foodCount > 0, "Foods should be loaded into the database");
    }

    @Test
    public void testLoadIngredients() throws Exception {
        // First load some foods and recipes that ingredients will reference
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        mockMvc.perform(post("/api/db/load/recipes")
                .param("filePath", TEST_RECIPES_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        // Test loading ingredients
        mockMvc.perform(post("/api/db/load/ingredients")
                .param("filePath", TEST_INGREDIENTS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").exists())
                .andReturn();
        
        // Verify ingredients were loaded into the database
        long ingredientCount = ingredientRepository.count();
        assertTrue(ingredientCount > 0, "Ingredients should be loaded into the database");
    }

    @Test
    public void testLoadRecipes() throws Exception {
        // Test loading recipes
        mockMvc.perform(post("/api/db/load/recipes")
                .param("filePath", TEST_RECIPES_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").exists())
                .andReturn();
        
        // Verify recipes were loaded into the database
        long recipeCount = recipeRepository.count();
        assertTrue(recipeCount > 0, "Recipes should be loaded into the database");
    }

    @Test
    public void testExportFoods() throws Exception {
        // First load some foods
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        // Test exporting foods
        mockMvc.perform(post("/api/db/export/foods")
                .param("filePath", EXPORT_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExported").exists())
                .andReturn();
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_FOODS_FILE);
        assertTrue(exportFile.exists(), "Export file should be created");
        assertTrue(exportFile.length() > 0, "Export file should not be empty");
    }

    @Test
    public void testExportIngredients() throws Exception {
        // First load some foods, recipes, and ingredients
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        mockMvc.perform(post("/api/db/load/recipes")
                .param("filePath", TEST_RECIPES_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        mockMvc.perform(post("/api/db/load/ingredients")
                .param("filePath", TEST_INGREDIENTS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        // Test exporting ingredients
        mockMvc.perform(post("/api/db/export/ingredients")
                .param("filePath", EXPORT_INGREDIENTS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExported").exists())
                .andReturn();
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_INGREDIENTS_FILE);
        assertTrue(exportFile.exists(), "Export file should be created");
        assertTrue(exportFile.length() > 0, "Export file should not be empty");
    }

    @Test
    public void testExportRecipes() throws Exception {
        // First load some recipes
        mockMvc.perform(post("/api/db/load/recipes")
                .param("filePath", TEST_RECIPES_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        // Test exporting recipes
        mockMvc.perform(post("/api/db/export/recipes")
                .param("filePath", EXPORT_RECIPES_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExported").exists())
                .andReturn();
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_RECIPES_FILE);
        assertTrue(exportFile.exists(), "Export file should be created");
        assertTrue(exportFile.length() > 0, "Export file should not be empty");
    }

    @Test
    public void testGeneralLoadEndpoint() throws Exception {
        // Test loading foods using the general endpoint
        mockMvc.perform(post("/api/db/load")
                .param("type", "foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.successCount").exists())
                .andReturn();
        
        // Verify foods were loaded into the database
        long foodCount = foodRepository.count();
        assertTrue(foodCount > 0, "Foods should be loaded into the database");
    }

    @Test
    public void testGeneralExportEndpoint() throws Exception {
        // First load some foods
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        // Test exporting foods using the general endpoint
        mockMvc.perform(post("/api/db/export")
                .param("type", "foods")
                .param("filePath", EXPORT_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalExported").exists())
                .andReturn();
        
        // Verify the export file was created
        File exportFile = new File(EXPORT_FOODS_FILE);
        assertTrue(exportFile.exists(), "Export file should be created");
        assertTrue(exportFile.length() > 0, "Export file should not be empty");
    }

    @Test
    public void testInvalidDataType() throws Exception {
        // Test with an invalid data type
        mockMvc.perform(post("/api/db/load")
                .param("type", "invalid")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andReturn();
    }

    @Test
    public void testNonExistentFile() throws Exception {
        // Test with a non-existent file
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", "non-existent-file.json")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists())
                .andReturn();
    }

    @Test
    public void testTruncateBeforeLoad() throws Exception {
        // Load foods twice to verify truncation
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        long firstCount = foodRepository.count();
        
        mockMvc.perform(post("/api/db/load/foods")
                .param("filePath", TEST_FOODS_FILE)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        
        long secondCount = foodRepository.count();
        
        // Counts should be the same if truncation worked
        assertEquals(firstCount, secondCount, "Table should be truncated before loading");
    }
}
