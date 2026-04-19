/*
  seeds a demo `churches` row in Supabase with a bcrypt-hashed password.
  Usage (locally):
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... DEMO_PASSWORD=MyPass npm run seed

  Notes:
  - This script requires a Supabase project and the `churches` table already created.
  - It upserts a single row with id 'CBC'. Change `id` variable below as needed.
  - Do NOT commit your `SUPABASE_SERVICE_KEY` to source control.
*/

const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || process.env.DEV_DEMO_PASSWORD || 'ChangeMe123!'

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Export them and retry.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seed() {
  try {
    const id = 'CBC'
    const location = 'Canterbury, Victoria, Australia'
    const songs = [
      'King of Love',
      'Living Hope',
      'Build My Life',
      'Amazing Grace',
    ]

    const hash = bcrypt.hashSync(DEMO_PASSWORD, 10)

    console.log(`Upserting demo church row id=${id} (password hashed).`)
    const { data, error } = await supabase.from('churches').upsert({ id, password: hash, location, songs })
    if (error) {
      console.error('Upsert error:', error)
      process.exit(2)
    }

    console.log('Seed completed:', data)
    process.exit(0)
  } catch (err) {
    console.error('Seed failed:', err)
    process.exit(3)
  }
}

seed()
