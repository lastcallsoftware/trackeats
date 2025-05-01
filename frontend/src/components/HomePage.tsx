import React from 'react';

const HomePage: React.FC = () => {
    return (
        <div className="home-page">
            <section className="home-content">
            <section className="new-guests">
                    <p>A NOTE FOR NEW GUESTS: Trackeats is my portfolio app, intended to showcase my tech
                        skills.</p>
                        <br/>
                        <p>To use the app you can Register your own new account, but it's a lot more
                        interesting to log on with an account that already has a lot of data.
                        To do that, log on using these credentials:</p>
                        <p style={{textIndent: "30px"}}><code>Username: guest</code></p>
                        <p style={{textIndent: "30px"}}><code>Password: Guest*123</code></p>
                        <br/>
                        <p>Feel free to play around -- all the data (including user accounts) is reset to 
                        a snapshot regularly.  Also note that Trackeats is more of a technology demo than 
                        a real application, so flashy user interface design was not stressed.</p>
                </section>
                <h1>Welcome to TrackEats</h1>
                <p className="centered-text">Your ultimate app for tracking recipes, meals, and nutrition!</p>
                <ul className="feature-list">
                    <li>
                        <h2>Monitor Nutrition</h2>
                        <p>Keep track of your daily nutritional intake with ease.</p>
                    </li>
                    <li>
                        <h2>Track Recipes</h2>
                        <p>Organize and manage your favorite recipes in one place.</p>
                    </li>
                    <li>
                        <h2>Plan Meals</h2>
                        <p>Create meal plans that fit your lifestyle and goals.</p>
                    </li>
                </ul>
                <p>TrackEats has a two-tier system: Foods make up Recipes.</p>
                <p>To start, think of a meal you like to make, and then enter the nutritional data
                    for all the ingredients that are used to make that meal on the Foods page.
                    This is basically the data on each item's nutrition label when you buy it at
                    the store.</p>
                <p>Then go to the Recipes page and create a new Recipe using those Foods as its
                    ingredients.</p>
                <p>Once that's all entered, you'll be able to see the complete per-serving nutrition 
                    data for that meal on the Recipes page.  If you've entered price data for the Foods,
                    you'll even be able to see the per-serving cost of each Recipe.  It's sometimes
                    surprising to see how much (or how little) some meals actually cost to make yourself!</p>
                <p className="journey-text centered-text">Start your culinary journey with TrackEats today!</p>
                <br/>
            </section>
        </div>
    );
};

export default HomePage;