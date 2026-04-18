// CBC Church Song Database
export const CBC_SONGS = [
  'King of Love',
  'Living Hope',
  'King of Kings',
  'No Place Better',
  'It was Finished Upon th Cross',
  'God with us',
  'Build My Life',
  'Great Things',
  'Only a Holy God',
  'I will trust my savior Jesus',
  'Yet not I but through Chirst in me',
  'Amazing Grace',
  'Blessed Assurance'
]

// Mock CCLI numbers and additional metadata
export const SONG_METADATA: Record<string, {
  ccli?: string
  artist?: string
  tempo: 'slow' | 'medium' | 'fast'
  bandRequirements: string
  youtubeUrl?: string
  isHymn?: boolean
}> = {
  'King of Love': {
    ccli: '7123204',
    artist: 'I Am They',
    tempo: 'medium',
    bandRequirements: 'Full band with vocals',
    youtubeUrl: 'https://www.youtube.com/watch?v=example1'
  },
  'Living Hope': {
    ccli: '7134991',
    artist: 'Phil Wickham',
    tempo: 'medium',
    bandRequirements: 'Full band',
    youtubeUrl: 'https://www.youtube.com/watch?v=example2'
  },
  'King of Kings': {
    ccli: '7127647',
    artist: 'Hillsong Worship',
    tempo: 'fast',
    bandRequirements: 'Full band with strong drums',
    youtubeUrl: 'https://www.youtube.com/watch?v=example3'
  },
  'No Place Better': {
    ccli: '7180085',
    artist: 'Tasha Layton',
    tempo: 'medium',
    bandRequirements: 'Piano and vocals',
    youtubeUrl: 'https://www.youtube.com/watch?v=example4'
  },
  'It was Finished Upon th Cross': {
    ccli: '7170104',
    artist: 'CityAlight',
    tempo: 'slow',
    bandRequirements: 'Acoustic guitar and vocals',
    youtubeUrl: 'https://www.youtube.com/watch?v=example5'
  },
  'God with us': {
    ccli: '7081384',
    artist: 'All Sons & Daughters',
    tempo: 'medium',
    bandRequirements: 'Full band',
    youtubeUrl: 'https://www.youtube.com/watch?v=example6'
  },
  'Build My Life': {
    ccli: '7070345',
    artist: 'Pat Barrett',
    tempo: 'medium',
    bandRequirements: 'Full band',
    youtubeUrl: 'https://www.youtube.com/watch?v=example7'
  },
  'Great Things': {
    ccli: '6460220',
    artist: 'Phil Wickham',
    tempo: 'fast',
    bandRequirements: 'Full band with energy',
    youtubeUrl: 'https://www.youtube.com/watch?v=example8'
  },
  'Only a Holy God': {
    ccli: '7137613',
    artist: 'CityAlight',
    tempo: 'slow',
    bandRequirements: 'Piano and vocals',
    youtubeUrl: 'https://www.youtube.com/watch?v=example9'
  },
  'I will trust my savior Jesus': {
    ccli: '7197557',
    artist: 'CityAlight',
    tempo: 'medium',
    bandRequirements: 'Acoustic guitar',
    youtubeUrl: 'https://www.youtube.com/watch?v=example10'
  },
  'Yet not I but through Chirst in me': {
    ccli: '7124807',
    artist: 'CityAlight',
    tempo: 'slow',
    bandRequirements: 'Piano and vocals',
    youtubeUrl: 'https://www.youtube.com/watch?v=example11'
  }
}

// Add a common hymn fallback so the generator can suggest at least one hymn
SONG_METADATA['Amazing Grace'] = {
  ccli: undefined,
  artist: 'Traditional',
  tempo: 'slow',
  bandRequirements: 'Hymn',
  youtubeUrl: undefined,
  // mark as hymn to allow client logic to ensure hymns are suggested
  isHymn: true,
}

SONG_METADATA['Blessed Assurance'] = {
  ccli: undefined,
  artist: 'Fanny Crosby',
  tempo: 'slow',
  bandRequirements: 'Hymn',
  youtubeUrl: undefined,
  isHymn: true,
}

// User authentication (temporary - will be replaced with proper auth)
export const USERS = {
  'CBC': {
    password: 'John3:16',
    songs: CBC_SONGS,
    location: 'Canterbury, Victoria, Australia'
  }
}