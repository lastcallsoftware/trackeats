PRODUCT DESCRIPTION
-------------------
The purpose of the application is to track the nutrition information of the food a person comsumes, especially the stuff you want to limit: sodium, cholesterol, saturated fat, carbs, and of course, calories.  The idea is that if you actually see the data, you're more likely to adhere to the recommended daily limits, and therefore eat more healthily -- maybe even lose weight!

I have firsthand experience of this and can attest to its persuasive power: I lost over 20 pounds in just a couple months when I logged my daily consumption in a spreadsheet, but then slowly gained it back when I stopped doing it.  And the reason I stopped had nothing to do with any dietary cravings -- it was because updating a spreadsheet every day is a pain in the butt and I got tired of it!  So the primary objective of this app's design is to make it easy to use, while still providing detailed, accurate information -- possibly even incorporating a voice interface.


FUNCTIONAL DESIGN
-----------------
Visuals
-------
The application has three main "layers", which maps nicely into three main UI views:

    1. INGREDIENTS
    This layer records the nutrition information of "low-level" foods: basically, whatever you might buy in a grocery store.  This could range from simple table salt to complex prepared meals, but every food listed in this layer MUST provide nutrition information, supplied by either the manufacturer, the vendor, or reliable third parties like the USDA.  The focus is on foods that are typically used as ingredients in cooking recipes.

    The nutrition information provided is basically what you see in the government-mandated nutrition label for any food product sold in the US, and optionally the item's price.  Nutrition info is specific to a particular product from a particular brand, so if you buy canned tomatoes made by two different companies, that's two different entries in the list, even if they are otherwise exactly identical.

    We can provide some default data for this list for some "raw" foods like fresh fruit and vegetables... maybe meat and cheese... but for the most part it will be up to the user to enter the data for the foods they purchase.

    2. MEALS
    This layer tracks the nutrition information of meals which are composed of INGREDIENTS in the proper proportions, and thus provides composite nutrition information.  For example, a "PBJ" meal might consist of two servings of whole wheat bread, two servings of chunky peanut butter, and two servings of blueberry preserves; the resultant nutrition for the meal info would be calculated as the sum of the nutrition data for those ingredients.  If the user entered price data for all the ingredients, we can also show a per-serving cost for the meal, which is very interesting when comparing to restaurant prices.

    The exact composition of any meal is at the discretion of the user, but it MUST consist of items in the INGREDIENTS list.  Because that depends on the exact brands and varieties available, there is no "universal" meal recipe, even for simple meals.  For example, the exact PBJ recipe would depend on what type and brand of bread, peanut butter, and jam a user purchases.  The differences are not trivial; in fact I would argue that seeing the huge nutritional differences between the "standard" recipe for a given meal, and a recipe with carefully chosen healthy ingredients, is the entire point of this app!

    Again, we can provide a few simple meals as examples, but to be accurate the list really has to be entered by the user based on their own ingredient purchases and what meals they actually eat!

    3. DAILY LOG
    This layer tracks daily consumption of food as a number of servings of MEALS.  And again, as a result it tracks the same composite nutrition data.  Daily consumption data can be color-coded according to its relation to the USDA limits.  For example, if you've consumed too much salt in a day, your daily log's "sodium" column might be color-coded as red.  Users will be able to alter their daily logs at will, as some entries might be "hypothetical", to see what the data might show for a number of different possible meal plans.

Other views include:

    4. INGREDIENT ENTRY
    A form for inputting/editing an INGREDIENT record.  I thought about letting the user edit the records in the table inline, but that would be a nightmare to code.  MAYBE LATER!  Basically, every column on the INGREDIENT list needs an input field on this form.

    5. MEAL ENTRY
    A form for inputting/editing a MEAL record.  A lot of the fields in the MEALS list are calculated, so there aren't as many fields on this form.  The main difficulty is having a way to pick the INGREDIENTS in the proper proportions.  I envision a scrolling listbox of the INGREDIENT names and total/serving sizes.  Next to the list we'll have a button to add the selected INGREDIENT, and an edit box for the number of servings.  It's crucial that this be a number, because the meal data is calculated as sum of ingredient data.  For example, the serving size for sugar is 1 tbsp, and its nutrition info is for that quantity; so if you're adding sugar to a meal, it has to be a multiple of 1 tbsp.  If a meal only needs 2 tsp of sugar, that's 0.67 "sugars".

    6. RECIPES
    The MEALS layer only lists a meal's components, not how to put them together.  A RECIPE lists the steps needed to make a particular MEAL.  This step is entirely optional.  It's just a convenient place to store recipes.

Later on we can add additional views with cool data visualization, like bar charts or pie charts.

Most of the data in the app will be the INGREDIENTS list (my Excel spreadsheet has about 500 INGREDIENTS, 200 MEALS, and 100 DAILY LOGS).  It will admittedly be onerous to set up the INGREDIENTS and MEALS lists at first, but in practice, people don't actually vary their diet and food purchases all that much, and as time goes on the user will need to add new items to the lists less and less often.

Ultimately, updating the DAILY LOG will constitute the majority of the effort in using the app.  But even if users don't want to bother with the DAILY LOG, just the data provided by the MEALS layer is still invaluable, as it gives a great deal of insight into what's really "good to eat".  I can tell you that I learned a lot of surprising things from this data!

[Now... I realize that in reality, a typical user will be far too lazy to enter all this data, even if we make this the easiest-to-use app in the world.  The app probably isn't practical for mass consumption.  But I'm not looking to sell it!  I'm just interested in (a) using it for myself (which I already do with the spreadsheet version of this app); (b) getting practice using the relevant development technologies; and (c) having a decent-looking portfolio app that I can show off in an interview.]


Search/Filter
-------------
The nav bar will contain a search/filter widget which is present in the INGREDIENTS and MEALS views:
-These views will have two modes: Search Mode and Filter Mode.  Search Mode scrolls the list to the next match and highlights the row.  Filter Mode removes from the list every row that doesn't match the filter.  Both operations target ONLY the table's Name and Description columns.  Now, it's true that search and filter aren't necessarily mutually exclusive operations, but this app's dataset is small enough that if you've applied a filter there will only be a few rows left anyway, so there wouldn't really be a need to search as well.  Plus, having one control for both simplifies the UI.
- To the left of the widget is a switch which toggles between Search Mode and Filter Mode.  Small icons to either side of the toggle will indicate the two modes (an hourglass for search and a funnel for filter).
- The center of the widget is a textbox for the search/filter text.  When not empty, the edit box has a small "x" button to the right (inside the box) to clear its contents.  Search/filter takes place when the user leaves the edit box (i.e., on "blur"), presses Enter, or clears the box.  We could do it more dynamically -- i.e., on every keystroke as they type in the edit box -- but I think that puts too much of a computational burden on the app.
- To the right of the widget are small up/down arrows, used to proceed to the previous/next match when in search mode. The arrows will be disabled when in filter mode.


Add/Edit/Remove
---------------
To the right of the Search/Filter widget are three circular buttons: an Add Button containing a + icon, an Edit Button containing a pencil icon, and a Remove Button containing a - icon.  These will be used to add, edit, and remove records from the currently-displayed list.  (We'll reuse these widgets on the Recipe page as well.)  The user will be required to confirm any deletes.


No Undo
-------
The app will not have any undo/redo functionality.  Too hard (for now).


Sort
----
The user may click on column headers to sort the data in a table.  Each column has three possible states: no sort (the default), ascending, and descending, which will be indicated in the column header by nothing (an empty space), an up arrow, and a down arrow, respectively.  If the data is sorted by one column and a second column is clicked, the first column will automatically revert to unsorted.  We could in theory have primary and secondary (and tertiary, etc.) sorts, but let's not get too cute here.  The dataset isn't really big enough to warrant that anyway.

Sorting is independent of filtering: you may do either or both at the same time.  Because we have the entire dataset in the browser (see "Data Model" below), all searching, sorting and filtering will be done entirely on the front end.


Single-page App (SPA)
---------------------
The app will be a single-page app based on React.  This means that instead of loading new web pages when you click on internal links, the app instead keeps the same webpage loaded all the time and only replaces UI components when you navigate around.  This gives it a snappier feel and makes it run better on mobile devices.  This is achieved via an add-on library called React Router, which is trivially simple to use -- literally just a few lines of JSX to add it to the app.

The app's "main" page will be the header/navigation bar, with links (possibly visually styled as tabs?) to the INGREDIENTS, MEALS, and DAILY LOG pages.  (I've been going back and forth on the names of these tabs: maybe FOODS instead of INGREDIENTS (for brevity), and maybe DISHES instead of MEALS (for accuracy).)  A fourth view (RECIPE) will be accessible from the MEALS page.  Plus we may wish to add other views later, such as an ABOUT page and maybe some pages for visualizatizing the data.

Each of the three main views will basically be a table, and they will show much the same data: nutrition info for each table entry.  I've thought about whether to use a third-party React component for the table, or to write our own table code.  The former would obviously be quicker and easier, but that would also defeat one of the main purposes of the app, which is to exercise our coding skills.  Plus I'm always biased towards a "roll your own" solution because it gives you more control over its behavior and appearance.  We'll see when we get there (which should actually be pretty soon!).


Responsive Design
-----------------
Resposive Design is the practice of styling and designing the UI such that it dynamically reconfigures itself to fit "nicely" on whatever device it's used on.  For example, a view that has two columns of text side-by-side in a browser window on a PC might automatically reconfigure to one column on a smartphone.  Menus that were horizonal on a brower might be vertical on a mobile device.

This is achieved mostly in CSS, through the use of "media queries" (CSS styles that "query" the window for its current size), modern display styles like flexboxes and grids which reconfigure themselves when necessary, and margins and other size specifications that are relative (e.g., proportional to the window's current font size) rather than absolute (e.g., a specific number of pixels).

I have to admit that I botched the responsive design in my Front End Capstone project, so I'd like another crack at it here!  It really makes a huge difference when you do it right.  It's the difference between an app that looks professional versus one that lookes like it was hacked together by a teenager over a long weekend.


TECHNICAL DESIGN
----------------
The main objective of the technical design is to use a representative set of technologies across the entire spectrum of application development, with a preference for the most popular techs in use today -- especially the free/open source ones!  This includes not only the techs used IN the app, but also the techs used to MAKE the app.

The bonus is that once you demonstrate a familiarity with a certain TYPE of tech/tool, it's easy to make the argument (e.g., in an interview) that using any other tech/tool of that type is just a matter of superficial detail, which you can easily look up on the Internet.


Back end and container services
-------------------------------
AWS/Kubernetes/Docker/??? (research needed)
Apache Web Server
MySQL
Django/Python
Jenkins/Git Actions

I want to go with the LAMP stack: Linux, Apache Web Server, MySQL, and Python.  That doesn't include orchestration, container, or deployment tools, though, so those techs would be in addition to that stack.

One way or another this app will be running on an AWS server.  I actually do have some relatively recent experience with AWS -- I had a Minecraft server running on AWS for a couple years -- so that will help, but deploying a web app with back end code and database support is substantially more complicated, so we'll see.

Since I was last in the game, "orchestration" products like Kubernetes have emerged.  These products take a declarative syntax (i.e., something like a JSON or HTML file) and use that to automatically manage all the container setup and deployment for you.  So to set up the app environment you wouldn't need to know all the cryptic details of AWS, you'd just need to know all the cryptic details of Kubernetes. :P  Seriously though, the advantage is that once you set it up, you never (or at least rarely) have to deal with it again, even if you blow up your deployment and rebuild it from scratch, plus you reduce the potential for human error.

This also ties into continuous integration.  CI is actually massive overkill for a tiny project with only a couple contributors, but I want to get experience with it.  Jenkins is probably the product to use here, though Git Labs/Git Actions is another option, and I'm guessing it's more accessible.  In any case, we can't have an automated deployment system until we actually have an environment to deploy to, so this is something to add later, time permitting.

The back end business logic, which will consist of little more than fetching data from the database and shipping it off to the front end, will be done using Python.  Since Python is an interpreted language we need a runtime environment, and that's where Django comes in.  Django also is described as a Python "framework" and may have additional features like you'd get from an app server.  I've got a whole course on Django ahead of me so that will be useful.

Back in the day, Java (my specialty) would have been the unquestioned choice for the back end business logic, but it barely gets a mention anymore.  Sadge.


Front end
---------
HTML
CSS
JavaScript/Typescript
React
Chakra UI? possibly other React libraries?
NPM/NodeJS

One of React's main advantages is that thanks to its component-based design, there are LOADS of free/open source libraries for it that provide all kinds of visual widgets.  You just install them via npm (which is just one command line), import them in the appropriate .js file (one line of JS), and voila, off you go!  But as noted above, while using third-party UI libraries will certainly make development faster and easier, that also defeats one of the main purposes of writing this app in the first place, which is to learn to code!  So we'll have to see how we're going before we decide on this.


Design and development tools
----------------------------
Git - version control
Slack - chat/video conferencing/screen sharing
diagrams.net (formerly known as draw.io) - tech diagrams including database schemas, flowcharts, and UML diagrams
Figma - drawing tool specializing in UI design and mockups (i.e., wireframes and prototypes)
Jira/Git? - bug/issue tracking
VS Code - code editor and its plentiful plugins
ES Lint - JS linter
Stylelint - CSS linter
Prettier - auto code formatter
Vite - local app server & JS bundling tool

If you don't know what a linter is, it's an editor plugin that detects stylistic and formatting deficiecies that aren't actually code errors.  For example, a very common no-no is declaring a variable and then never using it.  That's technically legal, but still bad practice, and a linter will detect and highlight it in the editor.  Apparently ES Lint is targeted mainly at JavaScript code and Stylelint at CSS, so it's typical to use them both together.

Along these lines, there's also the Prettier plugin, which automatically formats your code when you check it in -- things like converting tabs to spaces, and putting open and close brackets in the right place.  Personally I'm not a big fan of formatters -- if I add a line of whitespace, I MEANT to put there, dammit! -- but it is a widely adopted tool, so it might be worth gritting our teeth and getting used to it.

As far as editors go, every programmer has their own preferences, but I'd strongly suggest VS Code.  It's free, lightweight, and easy to use, yet 100% full-featured.  Most importantly is that it has super-easy-to-use built-in support for "extensions", like the linters mentioned above.  I was surprised to see that I've already got over 30 extensions running already!  I can give some suggestions on those if you like.

We're poised to use Jira as a bug/issue tracking tool, though Git apparently also has such features.  Git is probably the easier choice since we're already using it, but I may want to use Jira anyway just for the practice.  But in either case, it may be overkill for this project, and we're short on time.  It's not so much setting up one of these tools, as taking the time to use it.  It's not really necessary for the initial coding, which is quite straightforward, though it may be useful afterwards, during the maintenance/upgrading phase -- but by then the main motivation for this project will hopefully have disappeared!


Branching Strategy
------------------
There are many possible strategies to follow for managing branches in a version control system.  The modern concensus for agile development is to follow one of two strategies:

1. Feature branches.  Create branches for small, encapsulated units of work -- "features" -- generally worked on by just one developer or a few at most.  When the feature is completed, optimally within a few days, it is merged back into the main branch.  Along the way, the developer frequently (up to several times a day but at least daily) commits and pushes changes to the development branch from their local system.  At the same time, they frequently pull changes from the main branch into their development branch and resolve any conflicts.

This reduces the potential for problems when the development branch is merged back into the main branch.  In fact the merge should be almost trivial, as there should be NO new conflicts.  This is opposed to the old days when branches often contained huge amounts of changes (e.g., an entire "version 2.0" branch) developed over a long time, maybe months, and any changes that were made to the main branch (e.g., bug fixes) were not pulled in along the way.

2. No branches.  Don't use other branches at all and just always commit to main.  This is of course what you'd normally do on a project where you're the only developer.  I think it's probably also fine when there's just the two of us.

I think we'll start with strategy #2, and if there are issues we can go back to strategy #1.


DEVELOPMENT METHODOLOGIES
-------------------------
Agile
-----
We will use an agile development process, which once the back end is available will (if practical!) include continuous integration/delivery/deployment and  auto-testing.  The emphasis here is not just on short development cycles (and I mean SHORT -- like one day MAX), but in being... well... agile!  The initial design will undoubtedly contain a lot of holes and flaws, but we'll figure them out and fill them in as we go.  New input and ideas are not just welcome, but necessary.


Pair programming?  Code reviews?
--------------------------------
I would undoubtedly use these techniques on any real team I managed, but it's just the two of us, and we are VERY, VERY strapped for time, so I don't think we can squeeze in luxuries like this.  We'll try if we have time, though, as the benefits are potentially enormous.


OTHER
-----
Mobile Support
--------------
I want to look into React Native eventually, but that will have to wait until later.  React Native is a framework that allows you to write an app once and compile the same source to run on both PC and handheld devices natively.  When written in normal React, the app will run in a *browser window* on mobile devices, just like on a PC.  This is acceptable as long as we adhere to styling guidelines that account for window size.  But as a React Native app, it would be a bona-fide android app you would get in the app store.

I've already verified that React Native works with Typescript and that converting a vanilla React app to React Native isn't too hard, so incorporating it later shouldn't be too painful.  This could be a fun little exercise for later on.  Wouldn't it be cool to have our own app on the Google App Store?


Data Model
----------
Despite my earlier hand-wringing about data entry, the actual physical size of the data involved in this app is actually quite small: currently my entire food dataset in Excel is less than 200 MB.  Even if we double that, we're well within what can comfortably run in a browser window or handheld device.  So it's entirely plausible to retrieve the ENTIRE dataset from the back end, ship it to the front end, and store the whole thing in memory while the app is being used.

If we REALLY wanted to future-proof this thing, we could paginate the data, but that would make operations like searching, sorting and filtering much more problematic.  Plus... I don't know how to do that yet, lol!  So for now I say we go with the simpler brute-force approach.  If we ever want to refactor to incorporate pagination, it will probably be a bit of a nightmare, but we'll cross that bridge when we come to it.

The data will live in a little MySQL database on the server.  I've used MySQL before, most recently in a little toy app I wrote a couple years ago to solve the daily New York Times Spelling Bee puzzle. :P  The only challenge in this regard, I think, will be in figuring out how to talk to it from the back end app.

As for how to ship the data back and forth between the back end and the front end... well, that's another thing I hope to learn in the next couple of weeks in my back end course, but I expect it will be some kind of web service.  I actually have a lot of experience with web services, although that experience is, like the rest of it, VERY old and rusty.  The biggest challenge there, I think, will be the next item on the list...


Security and Authentication
---------------------------
I'm actually a bit worried about this subject.  Since the app will be running free out the the wild (i.e., it will be on an AWS server exposed to the Internet), solid security is an absolute must, even for a piddly little app like this, and that is something I have very little experience with.  Again, this is a subject in the back end course I'm taking, but based on what I've seen from this course so far, I'm worried that what they're teaching will be too abstract and high-level to give adequate guidance for an actual implemenation.  We'll see!
