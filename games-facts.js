// Fact banks for Science Explorer, GK Master, Treasure Hunt and Match the Pair.
// Question lines: band|question|correct answer|wrong 1|wrong 2|wrong 3
// band a = Class 1-2, b = Class 3-4, c = Class 5-6 (a band is also used one class up and down so no level runs dry).
const lines = (s) => s.trim().split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((x) => x.trim()));

export const SCIENCE = lines(`
a|Which part of a plant takes in water from the soil?|Roots|Leaves|Flowers|Fruits
a|What do plants need to grow?|Water, air and sunlight|Only sugar|Only stones|Plastic
a|Which animal gives us milk?|Cow|Lion|Eagle|Snake
a|Which animal lives in water?|Fish|Cat|Dog|Horse
a|Which part of the body do we use to see?|Eyes|Ears|Nose|Tongue
a|Which part of the body helps us hear?|Ears|Eyes|Nose|Hands
a|Which one gives us light in the day?|The Sun|A stone|A table|A book
a|What do we call a baby dog?|Puppy|Kitten|Calf|Chick
a|Which animal can fly?|Parrot|Cow|Buffalo|Elephant
a|Which season is the hottest?|Summer|Winter|Monsoon|Autumn
a|Which part of the body do we use to smell?|Nose|Hand|Foot|Knee
a|Which of these is a living thing?|Tree|Stone|Chair|Pencil
a|Which animal has a long trunk?|Elephant|Tiger|Deer|Rabbit
a|What falls from the clouds?|Rain|Sand|Leaves|Paper
a|Which animal gives us eggs?|Hen|Cow|Goat|Dog
a|How many legs does a spider have?|8|6|4|10
a|What colour are most leaves?|Green|Red|Blue|Black
a|Which part of the body do we use to taste food?|Tongue|Eyes|Ears|Nose
a|Water in a glass is a|Liquid|Solid|Gas|Plant
a|Ice is water in which form?|Solid|Liquid|Gas|Smoke
a|Which animal is called the king of the jungle?|Lion|Elephant|Deer|Monkey
a|Which bird cannot fly?|Penguin|Crow|Sparrow|Parrot
a|Which animal gives us wool?|Sheep|Cow|Hen|Dog
a|Which of these is a wild animal?|Tiger|Cow|Goat|Hen
a|What do fish use to breathe?|Gills|Lungs|Nose|Wings
a|Which is the biggest animal on land?|Elephant|Cat|Rabbit|Hen
a|The Earth moves around the|Sun|Moon|Cloud|Wind
a|What should we wash our hands with?|Soap and water|Mud|Sand|Oil
a|Which of these is a fruit?|Mango|Potato|Spinach|Onion
a|Which sense do we use our skin for?|Touch|Sight|Hearing|Smell
a|Which one is a pet animal?|Dog|Lion|Wolf|Bear
b|Plants make their food by a process called|Photosynthesis|Digestion|Evaporation|Melting
b|Which gas do we breathe in to stay alive?|Oxygen|Carbon dioxide|Nitrogen|Helium
b|What is the closest star to Earth?|The Sun|The Moon|Mars|Venus
b|Which planet is known as the Red Planet?|Mars|Venus|Jupiter|Saturn
b|Water changing into vapour is called|Evaporation|Condensation|Freezing|Melting
b|Which organ pumps blood in our body?|Heart|Lungs|Stomach|Brain
b|Which organ helps us breathe?|Lungs|Heart|Kidney|Liver
b|Which is the largest planet in our solar system?|Jupiter|Earth|Mars|Venus
b|A habitat is|The home of a plant or animal|A kind of food|A type of weather|A machine
b|Animals that eat only plants are called|Herbivores|Carnivores|Omnivores|Insects
b|Animals that eat both plants and animals are called|Omnivores|Herbivores|Carnivores|Reptiles
b|Which of these is a carnivore?|Lion|Cow|Deer|Goat
b|Which of these is a reptile?|Snake|Frog|Dog|Fish
b|A frog is an|Amphibian|Reptile|Insect|Bird
b|Which material is attracted by a magnet?|Iron|Wood|Plastic|Paper
b|The layer of gases around the Earth is called the|Atmosphere|Ocean|Mountain|Desert
b|Which of these is a good conductor of electricity?|Copper|Rubber|Wood|Plastic
b|All the bones in our body together are called the|Skeleton|Muscles|Skin|Blood
b|Which part of a plant carries water from the roots to the leaves?|Stem|Flower|Fruit|Seed
b|A pattern of stars in the sky is called a|Constellation|Planet|Comet|Cloud
b|Day and night happen because the Earth|Spins on its axis|Moves around the Sun|Is flat|Is hot
b|Which vitamin do we get from sunlight?|Vitamin D|Vitamin A|Vitamin C|Vitamin B
b|Which is the hardest natural substance?|Diamond|Iron|Gold|Glass
b|At what temperature does water boil at sea level?|100 degrees Celsius|50 degrees Celsius|0 degrees Celsius|10 degrees Celsius
b|Which part of the eye lets light in?|Pupil|Eyelash|Eyebrow|Eyelid
b|Which of these is a renewable source of energy?|Solar energy|Coal|Petrol|Natural gas
b|The Moon is a natural satellite of the|Earth|Sun|Mars|Venus
b|Which tool shows very tiny things bigger?|Microscope|Thermometer|Ruler|Balance
b|Which tool measures temperature?|Thermometer|Ruler|Clock|Balance
b|Which of these is NOT a living thing?|Rock|Bird|Tree|Fish
b|What do roots do for a plant?|Absorb water and hold it in the soil|Make seeds|Give colour|Make sound
b|Which planet is closest to the Sun?|Mercury|Earth|Mars|Saturn
b|Which season comes after summer in India?|Monsoon|Winter|Spring|Autumn
c|Which part of a cell contains the genetic material?|Nucleus|Cell wall|Cytoplasm|Vacuole
c|What is the chemical formula of water?|H2O|CO2|O2|NaCl
c|Which gas is the most abundant in Earth's atmosphere?|Nitrogen|Oxygen|Carbon dioxide|Hydrogen
c|Which planet has rings that are easy to see?|Saturn|Mars|Earth|Mercury
c|The force that pulls objects towards the Earth is|Gravity|Friction|Magnetism|Pressure
c|Which blood cells help fight infection?|White blood cells|Red blood cells|Platelets|Plasma
c|Which is the largest organ of the human body?|Skin|Liver|Heart|Brain
c|Which pigment makes leaves green?|Chlorophyll|Haemoglobin|Melanin|Keratin
c|Which gas do plants release during photosynthesis?|Oxygen|Carbon dioxide|Nitrogen|Hydrogen
c|Rocks formed from cooled lava are called|Igneous rocks|Sedimentary rocks|Metamorphic rocks|Soft rocks
c|The SI unit of force is the|Newton|Kilogram|Metre|Second
c|Water vapour changing into liquid water is called|Condensation|Evaporation|Melting|Sublimation
c|About how many days does the Earth take to go around the Sun?|365|30|24|7
c|Which gas do plants take in from the air?|Carbon dioxide|Oxygen|Hydrogen|Helium
c|What is the main job of red blood cells?|Carry oxygen|Fight germs|Clot blood|Digest food
c|Which organ filters the blood and makes urine?|Kidney|Heart|Lungs|Stomach
c|Which of these is a non-renewable resource?|Coal|Wind|Sunlight|Moving water
c|The chemical name of common salt is|Sodium chloride|Calcium carbonate|Potassium nitrate|Sodium hydroxide
c|Where does digestion of food begin?|Mouth|Stomach|Small intestine|Liver
c|What is the smallest unit of life?|Cell|Tissue|Organ|Organism
c|Which gas is needed for burning?|Oxygen|Nitrogen|Carbon dioxide|Helium
c|The Moon shines because it|Reflects sunlight|Makes its own light|Is burning|Is a star
c|A solar eclipse happens when the|Moon comes between the Sun and the Earth|Earth comes between the Sun and the Moon|Sun goes behind Mars|Moon disappears
c|Which scientist is famous for the laws of motion and gravity?|Isaac Newton|Albert Einstein|Thomas Edison|Louis Pasteur
c|Which instrument measures air pressure?|Barometer|Thermometer|Speedometer|Rain gauge
c|The loss of water vapour from the leaves of a plant is called|Transpiration|Digestion|Respiration|Germination
c|Which vitamin prevents the disease scurvy?|Vitamin C|Vitamin A|Vitamin D|Vitamin K
c|Which of these is a greenhouse gas?|Carbon dioxide|Oxygen|Nitrogen|Helium
c|Which layer protects us from the Sun's harmful ultraviolet rays?|Ozone layer|Troposphere|Clouds|Ionosphere
c|What type of energy does a moving car have?|Kinetic energy|Potential energy|Heat only|Sound only
c|Which part of a flower becomes the fruit?|Ovary|Petal|Sepal|Stem
`);

export const GK = lines(`
a|Which colour is at the top of the Indian flag?|Saffron|Green|White|Blue
a|What is the national animal of India?|Tiger|Lion|Elephant|Peacock
a|What is the national bird of India?|Peacock|Parrot|Sparrow|Crow
a|What is the national flower of India?|Lotus|Rose|Marigold|Sunflower
a|What is the national fruit of India?|Mango|Apple|Banana|Orange
a|What is the national tree of India?|Banyan|Mango|Neem|Palm
a|What is the capital of India?|New Delhi|Mumbai|Kolkata|Chennai
a|What is the money of India called?|Rupee|Dollar|Pound|Yen
a|On which date do we celebrate Independence Day?|15 August|26 January|2 October|14 November
a|On which date do we celebrate Republic Day?|26 January|15 August|2 October|5 September
a|Who is called the Father of the Nation in India?|Mahatma Gandhi|Jawaharlal Nehru|Subhas Chandra Bose|Sardar Patel
a|How many days are there in a week?|7|5|6|8
a|How many months are there in a year?|12|10|11|13
a|Which is the first month of the year?|January|March|December|June
a|How many colours are there in a rainbow?|7|5|6|9
a|Which festival is called the festival of lights?|Diwali|Holi|Eid|Christmas
a|Which festival is played with colours?|Holi|Diwali|Eid|Onam
a|What is the fastest land animal?|Cheetah|Lion|Horse|Elephant
a|What is the tallest animal?|Giraffe|Elephant|Camel|Horse
a|What is the national anthem of India?|Jana Gana Mana|Vande Mataram|Saare Jahan Se Accha|Twinkle Twinkle
a|Which city is known as the Pink City?|Jaipur|Delhi|Agra|Kolkata
a|In which city is the Taj Mahal?|Agra|Delhi|Jaipur|Mumbai
a|Which planet do we live on?|Earth|Mars|Venus|Jupiter
a|How many players are in a cricket team?|11|9|7|15
a|Which is the largest mammal in the world?|Blue whale|Elephant|Shark|Giraffe
a|Which is the largest bird in the world?|Ostrich|Eagle|Peacock|Crane
a|Which country has the Eiffel Tower?|France|India|Japan|Brazil
a|Which is the highest mountain in the world?|Mount Everest|Mount Fuji|Kilimanjaro|Mont Blanc
b|Who was the first Prime Minister of India?|Jawaharlal Nehru|Mahatma Gandhi|Sardar Patel|Lal Bahadur Shastri
b|Who was the first President of India?|Dr Rajendra Prasad|Dr S. Radhakrishnan|Dr A. P. J. Abdul Kalam|Zakir Husain
b|Who wrote the national anthem of India?|Rabindranath Tagore|Bankim Chandra Chatterjee|Sarojini Naidu|Premchand
b|In which city is the Gateway of India?|Mumbai|Delhi|Chennai|Kolkata
b|In which city is the Charminar?|Hyderabad|Lucknow|Jaipur|Bhopal
b|In which city is the Red Fort?|Delhi|Agra|Mumbai|Patna
b|Which is the largest state of India by area?|Rajasthan|Uttar Pradesh|Maharashtra|Madhya Pradesh
b|Which is the smallest state of India by area?|Goa|Sikkim|Tripura|Kerala
b|Which state has the largest population in India?|Uttar Pradesh|Bihar|Maharashtra|Tamil Nadu
b|Which is the largest hot desert in India?|Thar Desert|Sahara Desert|Gobi Desert|Kalahari Desert
b|Which mountain range lies in the north of India?|Himalayas|Alps|Andes|Rockies
b|Which city is known as the City of Joy?|Kolkata|Mumbai|Delhi|Chennai
b|Which Indian city is called the Silicon Valley of India?|Bengaluru|Hyderabad|Pune|Chennai
b|Which Indian state is called God's Own Country?|Kerala|Goa|Assam|Punjab
b|Which is the largest continent?|Asia|Africa|Europe|Australia
b|Which is the smallest continent?|Australia|Europe|Africa|Antarctica
b|Which is the largest ocean?|Pacific Ocean|Atlantic Ocean|Indian Ocean|Arctic Ocean
b|How many continents are there?|7|5|6|8
b|Which is the biggest country in the world by area?|Russia|China|India|Canada
b|Which country is called the Land of the Rising Sun?|Japan|China|Korea|India
b|The Statue of Liberty is in which country?|USA|UK|France|Canada
b|The Great Wall is in which country?|China|India|Japan|Egypt
b|The famous pyramids of Giza are in which country?|Egypt|India|Japan|Brazil
b|Who was the first man to walk on the Moon?|Neil Armstrong|Yuri Gagarin|Rakesh Sharma|Buzz Lightyear
b|Who is known as the Missile Man of India?|Dr A. P. J. Abdul Kalam|Homi Bhabha|C. V. Raman|Vikram Sarabhai
b|What is the name of India's space agency?|ISRO|NASA|ESA|DRDO
b|How many states are there in India?|28|25|30|32
b|Which is the national aquatic animal of India?|Ganges river dolphin|Blue whale|Shark|Crocodile
b|Who is traditionally said to have written the Ramayana?|Valmiki|Ved Vyasa|Tulsidas|Kalidas
b|Who is traditionally said to have written the Mahabharata?|Ved Vyasa|Valmiki|Tulsidas|Kalidas
b|How many rings are there in the Olympic symbol?|5|4|6|7
b|Wimbledon is a famous tournament of which sport?|Tennis|Cricket|Football|Hockey
c|In which year did India become independent?|1947|1950|1942|1935
c|In which year did the Constitution of India come into effect?|1950|1947|1952|1949
c|Who was the first Indian to travel in space?|Rakesh Sharma|Kalpana Chawla|Sunita Williams|Vikram Sarabhai
c|Who is called the Iron Man of India?|Sardar Vallabhbhai Patel|Jawaharlal Nehru|Subhas Chandra Bose|Lala Lajpat Rai
c|Which is the highest civilian award of India?|Bharat Ratna|Padma Shri|Arjuna Award|Param Vir Chakra
c|Chandrayaan-3 landed near which pole of the Moon?|South pole|North pole|Equator|East pole
c|What is the currency of the USA?|US dollar|Pound|Euro|Yen
c|What is the currency of the United Kingdom?|Pound sterling|Dollar|Euro|Rupee
c|Which river is called the holiest river in India?|Ganga|Godavari|Narmada|Krishna
c|Which is the national song of India?|Vande Mataram|Jana Gana Mana|Sare Jahan Se Accha|Raghupati Raghav
c|Who wrote the book Discovery of India?|Jawaharlal Nehru|Mahatma Gandhi|B. R. Ambedkar|Rabindranath Tagore
c|Who is known as the Father of the Indian Constitution?|Dr B. R. Ambedkar|Mahatma Gandhi|Jawaharlal Nehru|Rajendra Prasad
c|Which is the largest hot desert in the world?|Sahara Desert|Thar Desert|Gobi Desert|Arabian Desert
c|Which ocean lies to the south of India?|Indian Ocean|Pacific Ocean|Atlantic Ocean|Arctic Ocean
c|Who painted the Mona Lisa?|Leonardo da Vinci|Michelangelo|Picasso|Van Gogh
c|Which is the smallest country in the world by area?|Vatican City|Monaco|Nepal|Malta
c|What is the capital of the United States of America?|Washington, D.C.|New York|Los Angeles|Chicago
c|Which gas is called laughing gas?|Nitrous oxide|Oxygen|Helium|Carbon dioxide
`);

// state | capital  (27 states with a clearly settled capital)
export const STATE_CAPITALS = lines(`
Arunachal Pradesh|Itanagar
Assam|Dispur
Bihar|Patna
Chhattisgarh|Raipur
Goa|Panaji
Gujarat|Gandhinagar
Haryana|Chandigarh
Himachal Pradesh|Shimla
Jharkhand|Ranchi
Karnataka|Bengaluru
Kerala|Thiruvananthapuram
Madhya Pradesh|Bhopal
Maharashtra|Mumbai
Manipur|Imphal
Meghalaya|Shillong
Mizoram|Aizawl
Nagaland|Kohima
Odisha|Bhubaneswar
Punjab|Chandigarh
Rajasthan|Jaipur
Sikkim|Gangtok
Tamil Nadu|Chennai
Telangana|Hyderabad
Tripura|Agartala
Uttar Pradesh|Lucknow
Uttarakhand|Dehradun
West Bengal|Kolkata
`);

// country | capital
export const COUNTRY_CAPITALS = lines(`
India|New Delhi
Japan|Tokyo
China|Beijing
USA|Washington, D.C.
United Kingdom|London
France|Paris
Germany|Berlin
Italy|Rome
Australia|Canberra
Canada|Ottawa
Russia|Moscow
Egypt|Cairo
Nepal|Kathmandu
Bangladesh|Dhaka
Pakistan|Islamabad
Bhutan|Thimphu
Brazil|Brasilia
Spain|Madrid
Kenya|Nairobi
Argentina|Buenos Aires
Thailand|Bangkok
South Korea|Seoul
Afghanistan|Kabul
Greece|Athens
Turkey|Ankara
`);

// Treasure Hunt riddles: band|riddle|answer|wrong 1|wrong 2|wrong 3
export const RIDDLES = lines(`
a|I have a long trunk and big ears. Who am I?|Elephant|Lion|Monkey|Deer
a|I give milk and say moo. Who am I?|Cow|Dog|Cat|Hen
a|I am yellow, I shine in the sky in the day. What am I?|The Sun|The Moon|A star|A cloud
a|I have two wheels and you pedal me. What am I?|Bicycle|Bus|Train|Boat
a|I have a shell and I walk very slowly. Who am I?|Tortoise|Rabbit|Horse|Fish
a|You use me to write on paper. What am I?|Pencil|Spoon|Comb|Shoe
a|I have petals and smell sweet. What am I?|Flower|Stone|Book|Chair
a|I swim in water and have fins. Who am I?|Fish|Cat|Parrot|Goat
a|I tell the time. What am I?|Clock|Bag|Cup|Pen
a|I fall from the sky when it is cloudy. What am I?|Rain|Sand|Leaf|Paper
a|I have four legs, a back and you sit on me. What am I?|Chair|Cloud|Fish|Kite
a|I roar loudly and live in the jungle. Who am I?|Lion|Rabbit|Duck|Cow
b|I have keys but cannot open a door. What am I?|A keyboard|A lock|A box|A bag
b|I have pages and a cover. You read me. What am I?|A book|A plate|A shoe|A ball
b|I have hands but cannot clap. What am I?|A clock|A glove|A tree|A fish
b|The more you take away from me, the bigger I get. What am I?|A hole|A cake|A balloon|A river
b|I shine at night and change shape every few days. What am I?|The Moon|The Sun|A lamp|A cloud
b|I run but never walk. I have a bed but never sleep. What am I?|A river|A horse|A clock|A road
b|I have a face and two hands but no arms or legs. What am I?|A clock|A doll|A mirror|A coin
b|I am a bird that cannot fly but can run very fast. What am I?|Ostrich|Sparrow|Crow|Parrot
b|I have teeth but cannot bite. What am I?|A comb|A dog|A tree|A rope
b|I am full of holes but still hold water. What am I?|A sponge|A bucket|A cup|A bottle
b|I am the ship of the desert. What am I?|Camel|Horse|Elephant|Donkey
b|I have eyes but cannot see. What am I?|A potato|A cat|A fish|A bird
c|I speak without a mouth and hear without ears. What am I?|An echo|A radio|A phone|A bell
c|I am always in front of you but cannot be seen. What am I?|The future|A wall|The air|A shadow
c|I have cities but no houses and rivers but no water. What am I?|A map|A book|A dream|A toy
c|I get wetter the more I dry. What am I?|A towel|A sponge|A cloud|A river
c|I am tall when I am young and short when I am old. What am I?|A candle|A tree|A boy|A tower
c|I have a neck but no head. What am I?|A bottle|A shirt|A road|A river
c|I can travel around the world while staying in a corner. What am I?|A stamp|A bird|A ship|A plane
`);

// Match the Pair sets. Each set is a title and rows of "left|right". Left or right may be an emoji or a shape id.
export const MATCH_SETS = {
  fruits: { title: "Fruits", min: 1, max: 6, rows: lines(`
🍎|apple
🍌|banana
🍇|grapes
🍊|orange
🍓|strawberry
🍉|watermelon
🍍|pineapple
🥭|mango
🍒|cherries
🍋|lemon
🥥|coconut
🍑|peach
🍐|pear
🥝|kiwi
`) },
  animals: { title: "Animals", min: 1, max: 6, rows: lines(`
🐶|dog
🐱|cat
🐘|elephant
🦁|lion
🐯|tiger
🐒|monkey
🐄|cow
🐑|sheep
🐇|rabbit
🐢|tortoise
🐴|horse
🦒|giraffe
🐻|bear
🦓|zebra
🐊|crocodile
🐧|penguin
`) },
  vehicles: { title: "Vehicles", min: 1, max: 4, rows: lines(`
🚗|car
🚌|bus
🚲|bicycle
✈️|aeroplane
🚂|train
🚢|ship
🚁|helicopter
🚜|tractor
🚀|rocket
🛵|scooter
`) },
  shapes: { title: "Shapes", min: 1, max: 4, rows: lines(`
shape:circle|circle
shape:square|square
shape:triangle|triangle
shape:rectangle|rectangle
shape:star|star
shape:heart|heart
shape:diamond|diamond
shape:pentagon|pentagon
shape:hexagon|hexagon
shape:oval|oval
`) },
  numbers: { title: "Numbers", min: 1, max: 3, rows: lines(`
1|one
2|two
3|three
4|four
5|five
6|six
7|seven
8|eight
9|nine
10|ten
11|eleven
12|twelve
13|thirteen
14|fourteen
15|fifteen
16|sixteen
17|seventeen
18|eighteen
19|nineteen
20|twenty
`) },
  tens: { title: "Big numbers", min: 3, max: 5, rows: lines(`
30|thirty
40|forty
50|fifty
60|sixty
70|seventy
80|eighty
90|ninety
100|one hundred
500|five hundred
1000|one thousand
`) },
  opposites: { title: "Opposites", min: 2, max: 6, rows: lines(`
hot|cold
big|small
up|down
day|night
happy|sad
fast|slow
open|close
full|empty
hard|soft
old|new
in|out
heavy|light
`) },
  states: { title: "States and capitals", min: 4, max: 6, rows: lines(`
Bihar|Patna
Gujarat|Gandhinagar
Kerala|Thiruvananthapuram
Rajasthan|Jaipur
Tamil Nadu|Chennai
Uttar Pradesh|Lucknow
West Bengal|Kolkata
Karnataka|Bengaluru
Maharashtra|Mumbai
Punjab|Chandigarh
Odisha|Bhubaneswar
Assam|Dispur
`) },
  world: { title: "Countries and capitals", min: 5, max: 6, rows: lines(`
Japan|Tokyo
France|Paris
Egypt|Cairo
Italy|Rome
Nepal|Kathmandu
Canada|Ottawa
Germany|Berlin
Australia|Canberra
Russia|Moscow
China|Beijing
`) },
  body: { title: "Body parts and jobs", min: 3, max: 6, rows: lines(`
Heart|pumps blood
Lungs|help us breathe
Eyes|help us see
Ears|help us hear
Brain|controls the body
Stomach|digests food
Skin|covers the body
Bones|hold the body up
`) },
  tools: { title: "Tools and uses", min: 3, max: 6, rows: lines(`
Thermometer|measures temperature
Ruler|measures length
Clock|tells the time
Microscope|shows tiny things
Telescope|shows faraway stars
Scissors|cuts paper
Magnet|attracts iron
Calculator|does sums
`) },
  symbols: { title: "National symbols", min: 3, max: 6, rows: lines(`
Tiger|national animal
Peacock|national bird
Lotus|national flower
Mango|national fruit
Banyan|national tree
Rupee|national currency
Ganga|national river
Jana Gana Mana|national anthem
`) }
};
