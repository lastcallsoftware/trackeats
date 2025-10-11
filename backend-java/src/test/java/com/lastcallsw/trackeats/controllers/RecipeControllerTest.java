package com.lastcallsw.trackeats.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lastcallsw.trackeats.entities.Recipe;
import com.lastcallsw.trackeats.entities.Nutrition;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@WithMockUser(username = "testuser", roles = {"USER", "ADMIN"})
@ExtendWith(MockitoExtension.class)
public class RecipeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Recipe testRecipe;
    private Nutrition testNutrition;

    @BeforeEach
    public void setup() {
        // Clear all recipes before each test
        recipeRepository.deleteAll();
        
        // Create test nutrition
        testNutrition = new Nutrition();
        testNutrition.setServing_size_description("1 slice");
        testNutrition.setServing_size_oz(4.5f);
        testNutrition.setServing_size_g(128);
        testNutrition.setCalories(320);
        testNutrition.setTotal_fat_g(14.0f);
        testNutrition.setSaturated_fat_g(5.0f);
        testNutrition.setTrans_fat_g(0);
        testNutrition.setCholesterol_mg(0);
        testNutrition.setSodium_mg(170);
        testNutrition.setTotal_carbs_g(46);
        testNutrition.setFiber_g(2);
        testNutrition.setTotal_sugar_g(24);
        testNutrition.setAdded_sugar_g(20);
        testNutrition.setProtein_g(3);
        testNutrition.setVitamin_d_mcg(0);
        testNutrition.setCalcium_mg(10);
        testNutrition.setIron_mg(1.0f);
        testNutrition.setPotassium_mg(100);
        
        // Create test recipe
        testRecipe = new Recipe();
        testRecipe.setName("Test Apple Pie");
        testRecipe.setCuisine("American");
        testRecipe.setTotalYield("1 pie");
        testRecipe.setServings(8.0f);
        testRecipe.setNutrition(testNutrition);
        testRecipe.setPrice(12.99f);
        testRecipe.setIngredients(new ArrayList<>()); // Empty list of ingredients
    }

    @Test
    public void testGetAllRecipes() throws Exception {
        // Save a test recipe to the repository
        Recipe savedRecipe = recipeRepository.save(testRecipe);
        
        // Test getting all recipes
        mockMvc.perform(get("/api/recipes")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(savedRecipe.getId()))
                .andExpect(jsonPath("$[0].name").value("Test Apple Pie"))
                .andExpect(jsonPath("$[0].cuisine").value("American"))
                .andExpect(jsonPath("$[0].totalYield").value("1 pie"));
    }

    @Test
    public void testGetRecipeById() throws Exception {
        // Save a test recipe to the repository
        Recipe savedRecipe = recipeRepository.save(testRecipe);
        
        // Test getting recipe by ID
        mockMvc.perform(get("/api/recipes/" + savedRecipe.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedRecipe.getId()))
                .andExpect(jsonPath("$.name").value("Test Apple Pie"))
                .andExpect(jsonPath("$.cuisine").value("American"))
                .andExpect(jsonPath("$.totalYield").value("1 pie"));
    }

    @Test
    public void testGetRecipeByIdNotFound() throws Exception {
        // Test getting non-existent recipe
        mockMvc.perform(get("/api/recipes/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testAddRecipe() throws Exception {
        // Convert recipe object to JSON
        String recipeJson = objectMapper.writeValueAsString(testRecipe);
        
        // Test adding a new recipe
        MvcResult result = mockMvc.perform(post("/api/recipes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(recipeJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Test Apple Pie"))
                .andExpect(jsonPath("$.cuisine").value("American"))
                .andExpect(jsonPath("$.totalYield").value("1 pie"))
                .andReturn();
        
        // Verify recipe was added to the database
        String responseJson = result.getResponse().getContentAsString();
        Recipe createdRecipe = objectMapper.readValue(responseJson, Recipe.class);
        
        Optional<Recipe> storedRecipe = recipeRepository.findById(createdRecipe.getId());
        assertTrue(storedRecipe.isPresent());
        assertEquals("Test Apple Pie", storedRecipe.get().getName());
    }

    @Test
    public void testUpdateRecipe() throws Exception {
        // Save a test recipe to the repository
        Recipe savedRecipe = recipeRepository.save(testRecipe);
        
        // Modify the recipe
        savedRecipe.setName("Updated Apple Pie");
        savedRecipe.setCuisine("French");
        savedRecipe.setPrice(15.99f);
        
        // Convert updated recipe to JSON
        String updatedRecipeJson = objectMapper.writeValueAsString(savedRecipe);
        
        // Test updating the recipe
        mockMvc.perform(put("/api/recipes/" + savedRecipe.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(updatedRecipeJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(savedRecipe.getId()))
                .andExpect(jsonPath("$.name").value("Updated Apple Pie"))
                .andExpect(jsonPath("$.cuisine").value("French"))
                .andExpect(jsonPath("$.price").value(15.99));
        
        // Verify recipe was updated in the database
        Optional<Recipe> storedRecipe = recipeRepository.findById(savedRecipe.getId());
        assertTrue(storedRecipe.isPresent());
        assertEquals("Updated Apple Pie", storedRecipe.get().getName());
        assertEquals("French", storedRecipe.get().getCuisine());
        assertEquals(15.99f, storedRecipe.get().getPrice());
    }

    @Test
    public void testUpdateRecipeNotFound() throws Exception {
        // Convert recipe object to JSON
        String recipeJson = objectMapper.writeValueAsString(testRecipe);
        
        // Test updating non-existent recipe
        mockMvc.perform(put("/api/recipes/999")
                .contentType(MediaType.APPLICATION_JSON)
                .content(recipeJson))
                .andExpect(status().isNotFound());
    }

    @Test
    public void testDeleteRecipe() throws Exception {
        // Save a test recipe to the repository
        Recipe savedRecipe = recipeRepository.save(testRecipe);
        
        // Test deleting the recipe
        mockMvc.perform(delete("/api/recipes/" + savedRecipe.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
        
        // Verify recipe was deleted from the database
        Optional<Recipe> storedRecipe = recipeRepository.findById(savedRecipe.getId());
        assertFalse(storedRecipe.isPresent());
    }

    @Test
    public void testDeleteRecipeNotFound() throws Exception {
        // Test deleting non-existent recipe
        mockMvc.perform(delete("/api/recipes/999")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }
}
