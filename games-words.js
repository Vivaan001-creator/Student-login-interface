// Word banks for Word Master, Spelling Bee, Word Scramble and Hindi Varnamala.
// Each line is "item|item|..." and the first number (when present) is the lowest class it suits.
const lines = (s) => s.trim().split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.split("|").map((x) => x.trim()));

// word | opposite | lowest class
export const ANTONYMS = lines(`
hot|cold|1
big|small|1
tall|short|1
up|down|1
day|night|1
happy|sad|1
fast|slow|1
hard|soft|1
open|close|1
old|new|1
full|empty|1
heavy|light|1
in|out|1
good|bad|1
wet|dry|1
clean|dirty|1
early|late|2
long|short|2
rich|poor|2
strong|weak|2
thick|thin|2
near|far|2
young|old|2
bright|dark|2
love|hate|2
brave|cowardly|3
ancient|modern|4
victory|defeat|4
generous|selfish|4
increase|decrease|3
accept|refuse|3
arrival|departure|4
permanent|temporary|5
vertical|horizontal|5
urban|rural|5
expand|shrink|5
polite|rude|3
noisy|quiet|2
sweet|sour|2
smooth|rough|3
deep|shallow|3
buy|sell|2
laugh|cry|2
always|never|3
asleep|awake|2
borrow|lend|4
include|exclude|5
success|failure|4
optimist|pessimist|6
senior|junior|5
fiction|fact|6
`);

// word | synonym | lowest class
export const SYNONYMS = lines(`
big|large|1
small|tiny|1
happy|glad|1
fast|quick|1
begin|start|2
smart|clever|2
pretty|beautiful|2
shut|close|2
buy|purchase|3
rich|wealthy|3
house|home|1
end|finish|2
brave|courageous|4
huge|enormous|3
silent|quiet|2
strange|odd|3
difficult|hard|3
simple|easy|2
correct|right|2
kind|gentle|3
tired|weary|4
angry|furious|4
sad|unhappy|2
shiny|bright|3
speak|talk|2
look|see|2
jump|leap|3
cold|chilly|3
tasty|delicious|3
lazy|idle|4
wise|sensible|4
friend|companion|5
help|assist|4
reply|answer|3
journey|trip|4
danger|peril|6
ancient|old|4
enough|sufficient|5
rapid|swift|5
courage|bravery|5
`);

// noun / verb / adjective practice sentences: sentence | the word to ask about | its kind | lowest class
export const WORD_KINDS = lines(`
The boy runs fast.|runs|verb|1
A big dog barked loudly.|dog|noun|1
She sings a sweet song.|sings|verb|1
The red ball is on the table.|table|noun|1
Birds fly in the sky.|fly|verb|1
We eat rice for lunch.|eat|verb|1
My mother cooks tasty food.|mother|noun|2
The children play in the garden.|garden|noun|2
The tall man jumped over the wall.|jumped|verb|2
Ravi drinks a glass of milk.|milk|noun|2
The cat sleeps on the sofa.|sleeps|verb|2
The little girl wrote a letter.|wrote|verb|3
Delhi is a big city.|Delhi|noun|3
The teacher explained the lesson.|teacher|noun|3
Rain fell on the green fields.|fell|verb|3
The brave soldier protected the village.|protected|verb|4
Honesty is the best policy.|Honesty|noun|4
She quickly climbed the hill.|climbed|verb|4
The river flows towards the sea.|river|noun|4
The scientist discovered a new planet.|discovered|verb|5
Happiness comes from kindness.|Happiness|noun|5
The students listened carefully to the story.|listened|verb|5
The exhausted traveller reached the village.|reached|verb|6
Freedom is precious to everyone.|Freedom|noun|6
`);
// adjective items (word asked is an adjective): sentence | word | lowest class
export const ADJECTIVES = lines(`
The tall tree gives shade.|tall|1
She wore a red dress.|red|1
We saw a huge elephant.|huge|2
It was a cold winter morning.|cold|2
The clever fox tricked the crow.|clever|3
He gave me a delicious mango.|delicious|3
The brave firefighter saved the child.|brave|4
A gentle breeze was blowing.|gentle|4
`);

// right spelling | wrong 1 | wrong 2 | lowest class (for Word Master)
export const SPELLINGS = lines(`
friend|freind|frend|1
school|scool|skool|1
because|becouse|becuase|2
orange|orenge|oringe|1
yellow|yelow|yello|1
teacher|teecher|techer|1
elephant|elefant|elephent|2
mountain|mountian|mountin|3
beautiful|beutiful|beatiful|3
different|diffrent|diferent|3
library|libary|liberry|3
tomorrow|tommorow|tomorow|3
believe|beleive|belive|4
receive|recieve|receve|4
separate|seperate|separete|5
language|langauge|languege|4
Wednesday|Wensday|Wednesdey|3
knowledge|knowlege|nolege|5
island|iland|islend|3
answer|anser|ansver|2
bicycle|bycicle|bicicle|3
calendar|calender|calandar|4
chocolate|choclate|chocolat|3
daughter|dawter|daugter|3
doctor|docter|doktor|2
enough|enuf|enogh|3
grammar|grammer|gramar|4
holiday|holyday|holidey|2
kitchen|kitchin|kitchan|2
laughter|lafter|laughtar|3
medicine|medicin|medisine|3
neighbour|nieghbour|neibour|5
ocean|oshan|ocian|2
people|peple|peeple|2
science|scence|sience|3
Thursday|Thirsday|Thursdey|3
umbrella|umbrela|umbrelia|2
vegetable|vegtable|vegetible|3
weather|wether|wheather|3
yesterday|yesturday|yestarday|3
necessary|neccessary|necesary|6
environment|enviroment|envirnment|6
government|goverment|govenment|6
library|libraray|librery|3
festival|festivel|fesival|3
building|bilding|builting|3
purple|perple|purpel|2
tiger|tigar|tigre|1
flower|flowar|flouer|2
bottle|botle|bottel|2
`);

// Spelling Bee: word | clue | lowest class
export const BEE_WORDS = lines(`
cat|A small furry pet that says meow.|1
dog|A pet that barks.|1
sun|It shines in the sky in the day.|1
book|We read it.|1
tree|It has leaves and a trunk.|1
fish|It swims in water.|1
milk|A white drink from cows.|1
ball|Children kick or throw it.|1
bird|It has wings and can fly.|1
star|It twinkles at night.|1
rain|Water that falls from clouds.|1
moon|It shines at night.|1
hand|We have five fingers on it.|1
door|You open it to go in.|1
cake|A sweet food on a birthday.|1
apple|A red or green fruit.|1
chair|You sit on it.|1
house|A place where a family lives.|1
water|We drink it.|1
green|The colour of grass.|1
smile|You do this when you are happy.|2
bread|We eat it with butter.|2
plant|Trees and flowers are this.|2
clock|It tells us the time.|2
train|It runs on rails.|2
sheep|Wool comes from this animal.|2
shirt|You wear it on your body.|2
horse|An animal you can ride.|2
school|A place where we learn.|2
friend|A person you like and play with.|2
mother|Your mum.|2
father|Your dad.|2
garden|A place with flowers and plants.|2
window|Glass in a wall that lets light in.|3
family|Parents, children and grandparents.|3
animal|A cat, a cow or a lion is one.|3
orange|A juicy fruit and also a colour.|3
yellow|The colour of a banana.|3
monkey|It climbs trees and eats bananas.|3
pencil|You write with it.|3
basket|You carry fruits in it.|3
bridge|It helps us cross a river.|3
cloud|It floats in the sky and gives rain.|3
dinner|The last meal of the day.|3
forest|A large area full of trees.|3
island|Land with water all around it.|4
journey|A long trip.|4
kitchen|The room where food is cooked.|4
library|A place full of books.|4
morning|The early part of the day.|4
neighbour|A person who lives next door.|4
picture|A drawing or a photo.|4
question|You ask it to get an answer.|4
rainbow|Seven colours in the sky after rain.|4
season|Summer, winter and rainy are each one.|4
teacher|A person who teaches in school.|4
village|A small place in the countryside.|4
beautiful|Very pretty.|5
calendar|It shows dates and months.|5
chocolate|A sweet brown treat.|5
elephant|The biggest land animal.|5
festival|Diwali and Eid are each one.|5
mountain|A very high hill.|5
medicine|You take it when you are ill.|5
vegetable|Carrot and potato are examples.|5
yesterday|The day before today.|5
umbrella|It keeps you dry in the rain.|5
knowledge|What you know from learning.|6
environment|The nature around us.|6
electricity|It makes lights and fans work.|6
government|The people who run a country.|6
temperature|How hot or cold something is.|6
necessary|Something you must have.|6
independence|Freedom of a country.|6
adventure|An exciting journey.|6
`);

// Word Scramble: word | clue | emoji picture (or -) | lowest class
export const SCRAMBLE_WORDS = lines(`
cat|A pet that says meow|🐱|1
dog|A pet that barks|🐶|1
sun|It shines in the day|☀️|1
fish|It lives in water|🐟|1
bird|It can fly|🐦|1
tree|It has green leaves|🌳|1
book|You read it|📖|1
milk|A white drink|🥛|1
cake|A birthday treat|🎂|1
moon|It shines at night|🌙|1
star|It twinkles|⭐|1
rain|Water from clouds|🌧️|1
ball|You can kick it|⚽|1
bus|A big vehicle|🚌|1
car|It has four wheels|🚗|1
hen|It lays eggs|🐔|1
cow|It gives milk|🐄|1
pen|You write with it|🖊️|1
apple|A red fruit|🍎|2
mango|The king of fruits|🥭|2
grape|A small round fruit|🍇|2
lemon|A sour yellow fruit|🍋|2
horse|You can ride it|🐴|2
tiger|A striped big cat|🐯|2
zebra|A striped horse-like animal|🦓|2
water|We drink it|💧|2
house|People live in it|🏠|2
train|It runs on rails|🚂|2
chair|You sit on it|🪑|2
clock|It shows time|🕐|2
plane|It flies in the sky|✈️|2
green|The colour of grass|-|2
bread|A baked food|🍞|2
sheep|It gives wool|🐑|2
monkey|It loves bananas|🐒|3
rabbit|It has long ears|🐇|3
flower|It smells nice|🌸|3
school|A place to learn|🏫|3
pencil|You write with it|✏️|3
basket|You carry things in it|🧺|3
bridge|It goes over a river|-|3
cloud|It floats in the sky|☁️|3
garden|Plants grow here|-|3
orange|A juicy fruit|🍊|3
yellow|The colour of a banana|-|3
banana|A yellow fruit|🍌|3
tomato|A red vegetable|🍅|3
carrot|An orange vegetable|🥕|3
candle|It gives light when lit|🕯️|3
planet|Earth is one|🪐|4
rocket|It goes into space|🚀|4
doctor|Helps sick people|-|4
teacher|Teaches in school|-|4
window|Glass in a wall|-|4
winter|The coldest season|-|4
summer|The hottest season|-|4
forest|Many trees together|-|4
island|Land with water around|-|4
rainbow|Seven colours in the sky|🌈|4
library|A place with many books|-|4
journey|A long trip|-|4
morning|Early in the day|-|4
bicycle|It has two wheels|🚲|4
elephant|It has a long trunk|🐘|5
mountain|A very high hill|⛰️|5
calendar|It shows dates|📅|5
festival|Diwali is one|-|5
umbrella|It keeps you dry|☂️|5
medicine|You take it when sick|-|5
dinosaur|An animal from long ago|🦕|5
triangle|A shape with three sides|-|5
beautiful|Very pretty|-|5
vegetable|Carrot is one|-|5
yesterday|The day before today|-|5
telescope|It shows faraway stars|🔭|6
electricity|It lights our homes|-|6
environment|Nature around us|-|6
government|It runs the country|-|6
adventure|An exciting journey|-|6
temperature|How hot or cold|-|6
volcano|A mountain that erupts|🌋|6
astronaut|A person who goes to space|🧑‍🚀|6
architect|A person who designs buildings|-|6
`);

// Hindi Varnamala: letter | example word | meaning in English | kind | emoji (or -)
export const HINDI_VOWELS = lines(`
अ|अनार|pomegranate|vowel|-
आ|आम|mango|vowel|🥭
इ|इमली|tamarind|vowel|-
ई|ईख|sugarcane|vowel|-
उ|उल्लू|owl|vowel|🦉
ऊ|ऊन|wool|vowel|-
ए|एक|one|vowel|-
ऐ|ऐनक|spectacles|vowel|👓
ओ|ओखली|mortar|vowel|-
औ|औजार|tools|vowel|🔧
`);
export const HINDI_CONSONANTS = lines(`
क|कमल|lotus|consonant|🪷
ख|खरगोश|rabbit|consonant|🐇
ग|गमला|flower pot|consonant|🪴
घ|घर|house|consonant|🏠
च|चम्मच|spoon|consonant|🥄
छ|छतरी|umbrella|consonant|☂️
ज|जहाज|ship|consonant|🚢
झ|झंडा|flag|consonant|🚩
ट|टमाटर|tomato|consonant|🍅
ठ|ठेला|cart|consonant|-
ड|डमरू|small drum|consonant|-
ढ|ढोल|drum|consonant|🥁
त|तरबूज|watermelon|consonant|🍉
थ|थाली|plate|consonant|-
द|दरवाजा|door|consonant|🚪
ध|धनुष|bow|consonant|🏹
न|नल|tap|consonant|🚰
प|पतंग|kite|consonant|🪁
फ|फल|fruit|consonant|🍎
ब|बतख|duck|consonant|🦆
भ|भालू|bear|consonant|🐻
म|मछली|fish|consonant|🐟
र|रस्सी|rope|consonant|-
ल|लड्डू|laddu|consonant|-
व|वन|forest|consonant|🌳
श|शेर|lion|consonant|🦁
स|सेब|apple|consonant|🍎
ह|हाथी|elephant|consonant|🐘
`);
