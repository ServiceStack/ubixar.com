import { fromXsdDuration, humanize, omit, toDate } from "@servicestack/client"

export const AllRatings = {
    "PG": "Safe for work, family friendly PG-rated content, some action, no violence, no suggestive content",
    "PG13": "Teen appropriate PG-13 content, mildly suggestive, minimal violence or strong language",
    "M": "Mature content, strong language, suggestive content, violence, restricted",
    "R": "R-rated adult themes, strong language, suggestive sexual content, partial nudity, violence",
    "X": "NSFW, Explicit sexual X-rated adults only content, graphic nudity",
    "XXX": "NSFW, Extreme explicit content, XXX-rated hardcore pornography, graphic violence",
}

// From ./data/categories-list.json
export const AllCategories = [ 
    "woman", "clothing", "anime", "outdoors", "comics", "photography", "costume", "man", "animal", "armor", 
    "transportation", "architecture", "city", "cartoon", "car", "food", "astronomy", "modern art", "cat", "robot", 
    "landscape", "dog", "latex clothing", "dragon", "fantasy", "sports car", "post apocalyptic", "photorealistic", 
    "game character", "sci-fi"
]
export const AudioCategories = [
    "music","electronica","soundtrack","guitar","video game","sound effect","piano","organ","classical"
]

export const BadgeClasses = [
    'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
    'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200',
    'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
    'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200',
    'bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200',
    'bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200',
    'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200',
    'bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200',
    'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    'bg-fuchsia-100 dark:bg-fuchsia-900 text-fuchsia-800 dark:text-fuchsia-200',
    'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200',
    'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200',
    'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200',
    'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
    'bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200',
    'bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200',
    'bg-stone-100 dark:bg-stone-900 text-stone-800 dark:text-stone-200',
]
export const ModelFolders = [
    'checkpoints',
    'clip',
    'clip_vision',
    'controlnet',
    'diffusers',
    'diffusion_models',
    'embeddings',
    'gligen',
    'hypernetworks',
    'loras',
    'photomaker',
    'style_models',
    'upscale_models',
    'vae',
    'vae_approx',
]

const excludeCategories = [
    'text_encoders', // duplicate category of 'clip'
    'unet',          // duplicate category of 'diffusion_models'
    'configs',       // Not a model folder
    'nsfw',          // Core folder required by ComfyAgent
    'classifiers',   // Core folder required by ComfyAgent
]

export const KeyCodes = {
    Escape : 27,
    Space  : 32,
    Left   : 37,
    Up     : 38,
    Right  : 39,
    Down   : 40,
}

export const PriorityLevels = {
    'Warp Drive':        ['🚀',   10_000], // Premium Tier 2 / Admins
    'Lightspeed':        ['⚡',     5_000], // Premium Tier 1
    'Bullet Train':      ['🚅',    2_500], // User with device in Pool
    'Turbo Boost':       ['💨',        0],
    'Cruise Control':    ['🚗',     -500],  
    'Pedal Power':       ['🚴️',   -2_500],
    'Snails Pace':       ['🐌',   -5_000],
    'Glacial Crawl':     ['🧊',  -10_000],
}

export function getPriorityLevel(credits) {
    for (const [name, [emoji, min]] of Object.entries(PriorityLevels)) {
        if (credits >= min) {
            return { name, emoji }
        }
    }
    return { name: 'Glacial Crawl', emoji: '🧊' }
}

export const rule1 = {
    entering: {
        cls: 'transition ease-out duration-100',
        from: 'transform opacity-0 scale-95',
        to: 'transform opacity-100 scale-100'
    },
    leaving: {
        cls: 'transition ease-in duration-75',
        from: 'transform opacity-100 scale-100',
        to: 'transform opacity-0 scale-95 translate-y-0 hidden'
    }
}

export function createModelCategories(device) {
    function sortFiles(files) {
        return files.sort((a, b) => {
            // If filename has a '/' sort first, otherwise by filename
            if (a.includes('/') && !b.includes('/')) return -1
            if (!a.includes('/') && b.includes('/')) return 1
            return a.localeCompare(b)
        })
    }

    return Object.keys(device.models ?? {}).filter(x => !excludeCategories.includes(x))
        .map((category, i) => ({
            key: category,
            name: humanize(category),
            models: sortFiles(device.models[category] || []),
            badgeClass: BadgeClasses[i % BadgeClasses.length]
        }))
}

// Extract filename from full path
export function getFileName(filePath) {
    if (!filePath) return ''
    // Handle both forward and backward slashes
    return filePath.replace(/\/|\\/g, ' / ')
}

export const WorkflowGroups = [
    {
        name: 'Image',
        categories: [
            'Text to Image', 
            'Image to Image', 
            // 'Image to Text',
        ]
    },
    {
        name: 'Audio',
        categories: ['Audio to Text', 'Text to Audio', 'Audio to Audio']
    },
    {
        name: 'Video',
        categories: [
            'Image to Video', 
            // 'Video to Text'
        ]
    }
]

const reactionEmojis = ["👍","❤","😂","😢"]
export function reactionCounts(reactions, emojis=null) {
    const ret = {}
    emojis ??= reactionEmojis
    emojis.forEach(emoji => {
        ret[emoji] = reactions[emoji] || 0
    })
    return ret
}

export function isUserName(userName) {
    return userName && userName.length !== 36
}

export function threadQuery(query) {
    return omit(query, ['new'])
}

export function humanifyNumber(n) {
    if (n < 0)
        return '-' + humanifyNumber(-n)
    if (n >= 1_000_000_000)
        return (n / 1_000_000_000).toFixed(1) + "b";
    if (n >= 1_000_000)
        return (n / 1_000_000).toFixed(1) + "m";
    if (n >= 1_000)
        return (n / 1_000).toFixed(1) + "k";
    return n.toLocaleString();
}

export function formatDuration(xsdDuration) {
    const totalSeconds = fromXsdDuration(xsdDuration)
    const wholeSeconds = Math.floor(totalSeconds);
    const hours = Math.floor(wholeSeconds / 3600)
    const minutes = Math.floor((wholeSeconds % 3600) / 60)
    const seconds = wholeSeconds % 60
    const milliseconds = Math.round((totalSeconds - wholeSeconds) * 1000);
    const duration = {
        seconds,
    }
    if (hours > 0) duration.hours = hours
    else duration.milliseconds = milliseconds
    if (minutes > 0) duration.minutes = minutes
    return new Intl.DurationFormat("en", { style:"narrow" }).format(duration)
}

export function formatDate(date) {
    const d = toDate(date)
    return d.getDate() + ' ' + d.toLocaleString('en-US', {month: 'short'}) + ' at '
        + `${d.getHours()}`.padStart(2, '0') + ':' + `${d.getMinutes()}`.padStart(2, '0')
}

export function formatRating(rating) {
    return rating?.replace('PG13', 'PG-13')
}

export function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRatingDisplay(artifact) {
    // Check for direct rating first, then predicted rating
    if (artifact.rating) {
        // Convert rating enum value to string
        const ratingMap = { 1: 'PG', 2: 'PG13', 4: 'M', 8: 'R', 16: 'X', 32: 'XXX' }
        const ret = ratingMap[artifact.rating] || artifact.rating.toString()
        return ret === 'PG13' ? 'PG-13' : ret
    }
    return artifact.ratings?.predictedRating || null
}

export function isAdultRating(rating) {
    return ['R', 'X', 'XXX'].includes(rating)
}

export function getRatingColorClass(rating) {
    if (['R', 'X', 'XXX'].includes(rating)) {
        // Adult ratings - Red
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 ring-red-600/40 dark:ring-red-400/50'
    } else if (rating === 'M') {
        // Mature rating - Orange/Amber
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 ring-amber-600/40 dark:ring-amber-400/50'
    } else {
        // Safe ratings (PG, PG13) - Green
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 ring-green-600/40 dark:ring-green-400/50'
    }
}

export function getRatingDescription(rating) {
    const descriptions = {
        'PG': 'Safe for work, family friendly content',
        'PG13': 'Teen appropriate content, mildly suggestive',
        'M': 'Mature content, strong language, suggestive content',
        'R': 'R-rated adult themes, strong language, partial nudity',
        'X': 'NSFW, Explicit sexual content, graphic nudity',
        'XXX': 'NSFW, Extreme explicit content, hardcore pornography'
    }
    return descriptions[rating] || 'Content rating'
}

export function wordList(items) {
    if (!items || !items.length) return ''
    if (typeof items == 'string') {
        items = items.split(',')
    }
    if (!Array.isArray(items)) return ''
    if (items.length === 1) return items[0]
    return items.slice(0, -1).join(', ') + ' or ' + items[items.length - 1]
}

export function toArtifacts(assets, selectedFn) {
    return assets?.map(x => ({
        width: x.width,
        height: x.height,
        url: x.url,
        filePath: x.url.substring(x.url.indexOf('/artifacts')),
        rating: x.rating,
        selected: selectedFn ? selectedFn(x) : false,
    })) ?? []
}

export function toJsonArray(json) {
    try {
        return json ? JSON.parse(json) : []
    } catch (e) {
        return []
    }
}

export function toJsonObject(json) {
    try {
        return json ? JSON.parse(json) : null
    } catch (e) {
        return null
    }
}

export function storageArray(key) {
    return toJsonArray(localStorage.getItem(key)) ?? []
}

export function storageObject(key) {
    return toJsonObject(localStorage.getItem(key)) ?? {}
}

export function sortByCreatedDesc(rows) {
    rows.sort((a, b) => ('' + b.createdDate).localeCompare(a.createdDate))
    return rows
}
export function sortByModifiedDesc(rows) {
    rows.sort((a, b) => ('' + b.modifiedDate).localeCompare(a.modifiedDate))
    return rows
}
export function sortByCreatedAsc(rows) {
    rows.sort((a, b) => ('' + a.createdDate).localeCompare(b.createdDate))
    return rows
}
export function sortByModifiedAsc(rows) {
    rows.sort((a, b) => ('' + a.modifiedDate).localeCompare(b.modifiedDate))
    return rows
}

export function validUrl(url) {
    if (!url) return false
    try {
        new URL(url)
        return true
    } catch (e) {
        return false
    }
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function pluralize(word, count) {
    return count === 1 ? word : word + 's'
}

export const acceptedImages = `${wordList('WEBP,JPG,PNG,GIF,BMP,TIFF')} (max 5MB)`
export const acceptedVideos = `${wordList('MP4,MOV,WEBM,MKV,AVI,WMV,OGG')} (max 50MB)`
export const acceptedAudios = `${wordList('MP3,M4A,AAC,FLAC,WAV,WMA')} (max 10MB)`

export function getResolutionClass(width, height) {
    // Calculate total pixels
    const totalPixels = width * height;

    // Define resolution thresholds (in millions of pixels)
    const resolutionMap = [
        { threshold: 33, label: '8K' },    // 7680×4320 = ~33M pixels
        { threshold: 24, label: '6K' },    // 6144×3456 = ~21M pixels  
        { threshold: 14, label: '5K' },    // 5120×2880 = ~15M pixels
        { threshold: 8, label: '4K' },     // 3840×2160 = ~8M pixels
        { threshold: 4, label: '2K' },     // 2560×1440 = ~4M pixels
        { threshold: 2, label: '1080p' },  // 1920×1080 = ~2M pixels
        { threshold: 1, label: '720p' },   // 1280×720 = ~1M pixels
        { threshold: 0, label: '480p' }    // 854×480 = ~0.4M pixels
    ];

    const pixelsInMillions = totalPixels / 1000000;

    // Find the appropriate classification
    for (const resolution of resolutionMap) {
        if (pixelsInMillions >= resolution.threshold) {
            return resolution.label;
        }
    }

    return '480p'; // fallback for very low resolutions
}

export function getHDClass(width, height) {
    if (!width || !height) return ''
    const resolution = getResolutionClass(width, height)
    return resolution.endsWith('K')
        ? resolution
        : ''
}
