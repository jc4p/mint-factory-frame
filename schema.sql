-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(128) NOT NULL UNIQUE,
  fid NUMERIC NOT NULL,
  creator_address VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  collection_name VARCHAR(255) NOT NULL,
  price VARCHAR(255) NOT NULL DEFAULT '0',
  max_mints INTEGER,
  image_url TEXT NOT NULL,
  frame_image_url TEXT,
  contract_address VARCHAR(42),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index for faster lookup by hash
CREATE INDEX IF NOT EXISTS idx_collections_hash ON collections(hash);

-- Create an index for faster lookup by fid
CREATE INDEX IF NOT EXISTS idx_collections_fid ON collections(fid);

-- Create an index for faster lookup by creator_address
CREATE INDEX IF NOT EXISTS idx_collections_creator_address ON collections(creator_address);