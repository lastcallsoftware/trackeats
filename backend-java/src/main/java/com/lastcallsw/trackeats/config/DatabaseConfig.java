package com.lastcallsw.trackeats.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
//import java.util.HashMap;
//import java.util.Map;

@Configuration
@Profile("!test")
public class DatabaseConfig {

    @Autowired
    private Environment env;

    @Bean
    @Primary
    public DataSource dataSource() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        
        // Configure MySQL connection
        dataSource.setDriverClassName("com.mysql.cj.jdbc.Driver");
        
        // Process environment variables in the URL
        String url = env.getProperty("spring.datasource.url");
        if (url != null && url.contains("$DB_HOSTNAME")) {
            String dbHostname = env.getProperty("DB_HOSTNAME", "localhost");
            url = url.replace("$DB_HOSTNAME", dbHostname);
        }
        
        dataSource.setUrl(url);
        dataSource.setUsername(env.getProperty("spring.datasource.username"));
        dataSource.setPassword(env.getProperty("spring.datasource.password"));
        
        System.out.println("Configured MySQL database connection");
        return dataSource;
    }

    @Bean
    @Primary
    public LocalContainerEntityManagerFactoryBean entityManagerFactory() {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource());
        em.setPackagesToScan("com.lastcallsw.trackeats.entities");
        
        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        em.setJpaVendorAdapter(vendorAdapter);
        
        //Map<String, Object> properties = new HashMap<>();
        //properties.put("hibernate.hbm2ddl.auto", "validate");
        //properties.put("hibernate.show_sql", "false");
        //properties.put("hibernate.format_sql", "false");
        //em.setJpaPropertyMap(properties);
        
        return em;
    }

    @Bean
    public PlatformTransactionManager transactionManager() {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory().getObject());
        return transactionManager;
    }
}
