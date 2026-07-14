using System.Data;
using MyApp.ServiceModel;
using ServiceStack;
using ServiceStack.OrmLite;
using ServiceStack.Text;

public static class Usernames
{
    public static List<string> Prefixes => GetPrefixes();
    public static List<string> Suffixes => GetSuffixes();

    public static List<string> GetPrefixes()
    {
        return prefixes.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }

    public static List<string> GetSuffixes()
    {
        return suffixes.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
    }

    public static async Task<List<string>> GetUnusedUsernames(this IDbConnection db, List<string> candidates)
    {
        if (candidates == null || candidates.Count == 0)
            return new List<string>();

        var sqlParams = string.Join(",", candidates.Select((x, i) => "(@p" + i + ")"));
        var sql = $"""
        SELECT proposed.username
        FROM (VALUES
                {sqlParams}
            ) AS proposed(username)
                LEFT JOIN "AspNetUsers" u ON u."UserName" ILIKE proposed.username
        WHERE u."UserName" IS NULL
        """;

        var dict = new Dictionary<string, string>();
        for (int i = 0; i < candidates.Count; i++)
        {
            dict.Add("p" + i, candidates[i]);
        }

        return await db.ColumnAsync<string>(sql, dict);
    }

    public static async Task<List<string>> GenerateUnusedCandidateUsernames(this IDbConnection db, int count=10, string? partialUserName=null)
    {
        var candidates = GenerateCandidateUsernames(count + Math.Min(count, 10), partialUserName);
        return (await GetUnusedUsernames(db, candidates)).Take(count).ToList();
    }

    public static List<string> GenerateCandidateUsernames(int count=10, string? partialUserName=null)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var prefixes = Prefixes;
        var suffixes = Suffixes;

        if (prefixes.Count == 0 || suffixes.Count == 0)
            return new List<string>();

        var prefixesByLetter = prefixes
            .GroupBy(p => char.ToUpper(p[0]))
            .ToDictionary(g => g.Key, g => g.ToList());

        var suffixesByLetter = suffixes
            .GroupBy(s => char.ToUpper(s[0]))
            .ToDictionary(g => g.Key, g => g.ToList());

        var commonLetters = prefixesByLetter.Keys
            .Intersect(suffixesByLetter.Keys)
            .ToList();

        char? targetLetter = null;
        if (!string.IsNullOrWhiteSpace(partialUserName) && char.IsLetter(partialUserName[0]))
        {
            var firstChar = char.ToUpper(partialUserName[0]);
            if (prefixesByLetter.ContainsKey(firstChar))
            {
                targetLetter = firstChar;
            }
        }

        var random = new Random();
        int attempts = 0;
        int maxAttempts = count * 100;

        var usedPrefixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var usedSuffixes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        while (result.Count < count && attempts < maxAttempts)
        {
            attempts++;
            string username;

            char letter = '\0';
            bool matchLetters = false;

            if (targetLetter.HasValue)
            {
                letter = targetLetter.Value;
                // Bias: 50% chance to match the starting letter of prefix and suffix
                matchLetters = suffixesByLetter.ContainsKey(letter) && (random.Next(100) < 50);
            }
            else
            {
                // Bias: 50% chance to match the starting letter of prefix and suffix
                matchLetters = commonLetters.Count > 0 && (random.Next(100) < 50);
                if (matchLetters)
                {
                    letter = commonLetters[random.Next(commonLetters.Count)];
                }
            }

            if (matchLetters && letter != '\0')
            {
                var letterPrefixes = prefixesByLetter[letter];
                var letterSuffixes = suffixesByLetter[letter];

                string prefix = null;
                for (int i = 0; i < 10; i++)
                {
                    var p = letterPrefixes[random.Next(letterPrefixes.Count)];
                    if (prefix == null || !usedPrefixes.Contains(p))
                    {
                        prefix = p;
                        if (!usedPrefixes.Contains(p)) break;
                    }
                }

                string suffix = null;
                for (int i = 0; i < 10; i++)
                {
                    var s = letterSuffixes[random.Next(letterSuffixes.Count)];
                    if (suffix == null || !usedSuffixes.Contains(s))
                    {
                        suffix = s;
                        if (!usedSuffixes.Contains(s)) break;
                    }
                }

                username = prefix + suffix;
                if (!result.Contains(username))
                {
                    usedPrefixes.Add(prefix);
                    usedSuffixes.Add(suffix);
                    result.Add(username);
                }
            }
            else if (targetLetter.HasValue)
            {
                var letterPrefixes = prefixesByLetter[targetLetter.Value];
                string prefix = null;
                for (int i = 0; i < 10; i++)
                {
                    var p = letterPrefixes[random.Next(letterPrefixes.Count)];
                    if (prefix == null || !usedPrefixes.Contains(p))
                    {
                        prefix = p;
                        if (!usedPrefixes.Contains(p)) break;
                    }
                }

                string suffix = null;
                for (int i = 0; i < 10; i++)
                {
                    var s = suffixes[random.Next(suffixes.Count)];
                    if (suffix == null || !usedSuffixes.Contains(s))
                    {
                        suffix = s;
                        if (!usedSuffixes.Contains(s)) break;
                    }
                }

                username = prefix + suffix;
                if (!result.Contains(username))
                {
                    usedPrefixes.Add(prefix);
                    usedSuffixes.Add(suffix);
                    result.Add(username);
                }
            }
            else
            {
                string prefix = null;
                for (int i = 0; i < 10; i++)
                {
                    var p = prefixes[random.Next(prefixes.Count)];
                    if (prefix == null || !usedPrefixes.Contains(p))
                    {
                        prefix = p;
                        if (!usedPrefixes.Contains(p)) break;
                    }
                }

                string suffix = null;
                for (int i = 0; i < 10; i++)
                {
                    var s = suffixes[random.Next(suffixes.Count)];
                    if (suffix == null || !usedSuffixes.Contains(s))
                    {
                        suffix = s;
                        if (!usedSuffixes.Contains(s)) break;
                    }
                }

                username = prefix + suffix;
                if (!result.Contains(username))
                {
                    usedPrefixes.Add(prefix);
                    usedSuffixes.Add(suffix);
                    result.Add(username);
                }
            }
        }

        return result.ToList();
    }


private const string prefixes = 
"""
Acorn
Adorable
Affable
Affectionate
African
Agile
Agreeable
Alert
Alice
Amiable
Angelic
Angora
Antique
Aqua
Aquamarine
Arctic
Athletic
Attentive
Azure
Baby
Ballad
Bao
Basil
Bay
Beacon
Beautiful
Beige
Bell
Beneficial
Betta
Bing
Black
Blanche
Blaze
Blazing
Blissful
Blizzard
Bloom
Blue
Blush
Bold
Bountiful
Brave
Brawny
Breeze
Brisk
Brown
Brush
Bubbly
Bugs
Buoyant
Burly
Burlywood
Buzz
Calm
Cape
Captain
Caramel
Cat
Charming
Chartreuse
Cheeky
Cheshire
Chocolate
Chubby
Colossal
Comet
Commanding
Compassionate
Considerate
Convivial
Coral
Cordial
Cornflower
Cornsilk
Courageous
Cove
Cozy
Crepe
Crescent
Crimson
Cruella
Crumble
Cuddly
Cumulus
Curious
Cyan
Daffy
Dainty
Damp
Dapper
Dark
Darling
Deep
Delightful
Dependable
Dim
Dimpled
Dizzy
Docile
Dodger
Downy
Dreamy
Dusk
Dynamic
Easygoing
Ebullient
Echo
Eclipse
Effervescent
Elegant
Elf
Empathetic
Enchanting
Endearing
Enjoyable
Enormous
Enthusiastic
Explosive
Exuberant
Faithful
Fearless
Fennec
Feral
Fierce
Firebrick
Fizzy
Fjord
Fleet
Floral
Fluffy
Flying
Flynn
Foggy
Forest
Forgiving
Formidable
Fozzie
Frisky
Frosted
Fuchsia
Fudge
Fuzzy
Gainsboro
Genial
Gentle
Glowing
Gold
Golden
Goldenrod
Goody
Graceful
Gracious
Gray
Great
Green
Gregarious
Grey
Grizzly
Happy
Harbor
Hardy
Harmless
Harpy
Harvest
Hazelnut
Hearty
Heavenly
Helpful
Highland
Holland
Honey
Hospitable
Hot
Huggable
Hulking
Idyllic
Imposing
IndianRed
Indigo
Indomitable
Ink
Innocent
Inquisitive
Invincible
Inviting
Ironclad
Irresistible
Ivory
Jade
Jaded
Jagged
Jarring
Jaunty
Java
Jazzy
Jeweled
Jinxed
Johnny
Jolly
Jovial
Joyful
Just
Kaleid
Karmic
Keen
Keen-eyed
Kelp
Khaki
Kimchi
Kind
Kinetic
King
Knightly
Knowing
Koi
Kooky
Kryptic
Lavender
Lemon
Lime
Linen
Little
Lively
Lord
Lovable
Lovely
Loyal
Luna
Lyrical
Mad
Magenta
Maine
Mantis
Maple
Marigold
Marina
Maroon
Massive
Meadow
Mellow
Merry
Meteoric
Midnight
Mighty
Miniature
Mint
Mirthful
Mischievous
Miss
Misty
Moccasin
Mochi
Mrs
Muscular
Navajo
Navy
Neighborly
Neon
Nifty
Nimble
Nimbus
Nippy
Noble
Nocturnal
Noir
Nonchalant
Nordic
Notorious
Numinous
Obscure
Obsidian
Odd
Ode
Oldlace
Olive
Ominous
Omniscient
Onyx
Opaque
Optimistic
Oracle
Orange
Orbital
Orchid
Outlaw
Pale
Palm
Pancake
Papayawhip
Park
Pastel
Patient
Peaceful
Peach
Pebble
Peppy
Perky
Perry
Persian
Peru
Petite
Pika
Piney
Pink
Pinkie
Pita
Playful
Pleasant
Plum
Plump
Poem
Polar
Poppy
Porcelain
Porch
Porky
Positive
Potent
Powder
Powerful
Precious
Pretty
Pretzel
Prickly
Puddle
Pudgy
Pulsar
Purple
Radiant
Rainbow
Rainy
Rapid
Red
Reliable
Resilient
Resolute
Rhapsody
Rhythm
Ridge
Robin
Robust
Rose
Rosebud
Rosy
Royal
Rugged
Sage
Salmon
Salty
Sandy
Santa
Satin
Scooby
Serene
Shere
Shetland
Shiba
Shih
Siamese
Siberian
Sienna
Silver
Silverback
Sky
Slate
Sleek
Sleepy
Slim
Slinky
Snazzy
Snow
Snuggly
Sociable
Soft
Solstice
Sparkle
Sparkly
Speedy
Spiffy
Sprightly
Spring
Springer
Sprinkle
Sprite
Stalwart
Steel
Stitched
Sturdy
Sugar
Sunny
Sweet
Swift
Swirl
Swooping
Taffy
Tai
Tan
Teal
Tenacious
Tender
The
Tickle
Tinker
Tiny
Tolerant
Tomato
Tough
Tranquil
Trusty
Turquoise
Twilight
Twinkly
Ultima
Ultra
Ultraviolet
Umbra
Umbral
Unbreakable
Uni
Unruly
Unstoppable
Unwavering
Unyielding
Urbane
Ux
Vague
Valiant
Vast
Velvet
Velvety
Venom
Verse
Vexed
Vibrant
Vigilant
Vigorous
Violet
Vivid
Void
Volatile
Wall
Warm
Water
Welcoming
Whisper
White
Wholesome
Wiggly
Wild
Wile
Winnie
Winsome
Winter
Wish
Wobbly
Wonder
Wonton
Woody
Xalted
Xanthic
Xar
Xcel
Xclusive
Xen
Xenial
Xeno
Xeric
Xerik
Xero
Xerus
Xiled
Xotic
Xpanse
Xpedient
Xpired
Xplosive
Xquisite
Xtinct
Xtraordinary
Xtreme
Xultant
Yare
Yawning
Yax
Yearning
Yellow
Yen
Yev
Yielding
Yokai
Yonder
Yor
Yore
Yoru
Young
Youthful
Zany
Zar
Zax
Zazu
Zeal
Zebu
Zel
Zeno
Zero
Zev
Zippy
Zoo
Zyke
""";

private const string suffixes = 
"""
Abu
Aladdin
Alex
Alice
Alligator
Alpaca
Alps
Amaterasu
Anaconda
Anger
Anna
Applejack
Ariel
Axolotl
Babar
Badger
Bagheera
Baloo
Bambi
Bandit
Bat
Beagle
Bear
Beast
Beaver
Belle
Beluga
Bengal
Bilby
Bingo
Birman
Bison
Bisque
Bistro
Bluey
Bolt
Bong
Box
Bravo
Brontosaurus
Bubblegum
Bucephalus
Buckbeak
Budgerigar
Budgie
Buffalo
Bull
Bunny
Butterfly
Byte
Cadet
Calf
Canary
Canyon
Capybara
Caribou
Cat
Cavapoo
Chameleon
Chaos
Charizard
Cheetah
Chick
Chicken
Chiffon
Chihiro
Chinchilla
Chipmunk
Civet
Clifford
Clover
Cobra
Cockatiel
Cockatoo
Cogsworth
Collie
Condor
Coon
Copper
Corgi
Corn
Courage
Cow
Coyote
Crab
Craft
Cream
Crocodile
Crush
Cub
Dalmatian
Dalmond
Dane
Dash
Dev
DeVil
Dexter
Dingo
Discord
Dog
Dolphin
Donkey
Doo
Dory
Dove
Drab
Dragon
Duck
Duckling
Dug
Dumbo
Eagle
Echidna
ECoyote
Eevee
Eeyore
Elephant
Elk
Elsa
Emile
Emu
EVE
Fable
Fae
Fairy
Falcon
Falkor
Fawkes
Fawn
Fennec
Fern
Ferret
Finch
Fish
Flamingo
Flounder
Flower
Fluttershy
Foal
Fox
Frog
Frosty
Garfield
Gaston
Gecko
Gelato
Genie
George
Ghost
Giant
Giza
Glider
Gloria
Goat
Goldfish
Gonzo
Gorilla
Green
Groot
Guinea
Hamster
Hamtaro
Hare
Hatter
Hawk
Hedgehog
Heidi
Heron
Hippo
Hood
Hook
Horse
Hummingbird
Humpback
Husky
Hyena
Iago
Ibex
Ibis
Icon
Idol
Ignite
Iliad
Imp
Inkwell
Inu
Ion
Iris
Iron
Isle
Ivory
Ivy
Jackal
Jafar
Jaguar
Jake
Javelin
Jay
Jerry
Jet
Jigglypuff
Jinx
Joey
John
Joker
Journey
Joy
Jubilee
Judge
Julien
Jungle
Jupiter
Kaa
Kermit
Kettle
Khaki
Khan
Kitten
Knuckles
Koala
Koi
Komodo
Kong
Kristoff
Kronk
Kuzco
Kyoto
Labrador
Ladybug
Lagoon
Lamb
Lantern
Lassie
Lawn
Legend
Lemur
Leopard
Lightyear
Lilo
Linguini
Lion
LittleHelper
Lizard
Llama
Lobster
Lop
Louie
Lovebird
Lucky
Lumiere
Lung
Lynx
Macaw
Magenta
Maltese
Mammoth
Manatee
Mantis
Markhor
Marlin
Marmoset
Marmot
Marty
Max
Maximus
Meerkat
Melman
Meteor
Mewtwo
Mike
Mole
Monitor
Moose
Mountain
Mouse
Mufasa
Mushu
Mustang
Nala
Nebula
Nemesis
Nemo
Newt
Nexus
Night
Nimbus
Noodle
Norbert
Nougat
Nova
Nox
Null
Numbat
Nymph
Oak
Oaken
Oasis
Obsidian
Odie
Olaf
Omen
Oogway
Oracle
Orbit
Orca
Orchid
Origin
Orion
Osprey
Otter
Outlaw
Overture
Owl
Pacha
Paddington
Pan
Panda
Pangolin
Panther
Parakeet
Pascal
Patch
Peacock
Peak
Penguin
Perdita
Phantom
Pheasant
Pie
Pig
Pigeon
Piggy
Piglet
Pika
Pikachu
Pink
Pistachio
Pixie
Platypus
Po
Pomeranian
Pongo
Pony
Ponyo
Porcupine
Potts
Pterodactyl
Puff
Puffin
Pumbaa
Puppy
Purple
Pygmy
Quail
Quark
Quartz
Quest
Queue
Quill
Quilt
Quiver
Quokka
Quota
Quotient
Rabbit
Raccoon
Rafiki
Ragdoll
Rajah
Rapunzel
Rarity
Ratatouille
Raven
Red
Remy
Ren
Retriever
Rex
Rhino
Riddle
Rider
Road
Robin
Rocket
Roo
Rooftop
Rudolph
Runner
Russell
Saber
Saddle
Sadness
Sahara
Sailfish
Salamander
Salmon
Samoyed
Scar
Sea
Seaglass
Seal
Seashell
SeaSlug
Sebastian
Serval
Shadow
Shadowfax
Shaggy
Shark
Sheep
Shen
Shifu
Shrimp
Silk
Simba
Skipper
Sloth
Smoke
Snail
Snake
Snoopy
Snowball
Sonic
Sorbet
Spaniel
Sparkle
Sparrow
Sphinx
Spider
Spike
Spinosaurus
Squid
Squirrel
Squirt
Stallion
Starfish
Stegosaurus
Stella
Stimpy
Stingray
Stitch
Stork
Sully
Sundae
Sushi
Sven
Swan
Sylvester
Taco
Tails
Tamarin
Tarsier
Teacup
Tern
Thistle
Thumper
Tiger
Tigger
Tigress
Timon
Tiramisu
Tod
Toffee
ToothedTiger
Toothless
Tornado
Tortoise
Toto
Totoro
Toucan
Tree
TRex
Triceratops
Tulip
Turtle
Tweety
Twig
Tzu
Ululation
Umami
Umbra
Underworld
Ungulate
Unix
Upwelling
Uranium
Uroboros
Ursa
Ursid
Ursula
Ursus
Utgard
Valor
Vanguard
Vault
Vector
Veil
Velociraptor
Venom
Venture
Vertex
Vesper
Vex
Viking
Viper
Vixey
Void
Vole
Vortex
Vulcan
Waffle
Wallaby
WallE
Walrus
Wazowski
Weaver
Wendy
Whale
Whisper
Willow
Wolf
Wolverine
Wombat
Woodstock
Worm
Xanadu
Xandria
Xanthe
Xcalibur
Xebec
Xenolith
Xenon
Xerxes
Xibalba
Xiphos
Xochitl
Xyster
Yak
Yeti
Yew
Yggdrasil
Yield
Ymir
Yonder
Yonic
Yore
Yosemite
Yukon
Yule
Yzma
Zebra
Zenith
Zephyr
Zeus
Zigzag
Zinc
Zodiac
Zone
Zonic
Zoom
Zorn
Zorro
""";
}