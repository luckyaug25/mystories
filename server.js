const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
const STORIES_PER_PAGE = 20;

// Set up CORS
app.use(cors());

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set view engine
app.set('view engine', 'ejs');

// PostgreSQL connection
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:6wCe2sAFmcXZ@ep-wild-river-a544rpkd.us-east-2.aws.neon.tech/neondb?sslmode=require',
});

// Create the table if not exists (you can run this separately as well)
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query);
};

// Call table creation
createTable();

// Home Route (Display all stories)
app.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Get the current page from the query string or default to 1
  
    try {
      // Fetch the total number of stories
      const totalCountResult = await pool.query('SELECT COUNT(*) FROM stories');
      const totalStories = parseInt(totalCountResult.rows[0].count);
  
      // Calculate offset for pagination
      const offset = (page - 1) * STORIES_PER_PAGE;
  
      // Fetch the stories for the current page
      const result = await pool.query(
        'SELECT id, title FROM stories ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [STORIES_PER_PAGE, offset]
      );
  
      const stories = result.rows;
  
      // Calculate total pages
      const totalPages = Math.ceil(totalStories / STORIES_PER_PAGE);
  
      // Render the homepage with stories and pagination information
      res.render('index', {
        stories,
        currentPage: page,
        totalPages,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving stories');
    }
  });
// Write Story Route (Render Write Page)
app.get('/write', (req, res) => {
  res.render('write');
});

// Create a New Story (POST)
app.post('/write', async (req, res) => {
  const { title, content } = req.body;
  try {
    await pool.query('INSERT INTO stories (title, content) VALUES ($1, $2)', [title, content]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving story');
  }
});

// Read Story Route (Display full story)
app.get('/read/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM stories WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.render('read', { story: result.rows[0] });
    } else {
      res.status(404).send('Story not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching story');
  }
});

// Update Story Route (Render Update Page)
app.get('/update/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM stories WHERE id = $1', [id]);
    if (result.rows.length > 0) {
      res.render('update', { story: result.rows[0] });
    } else {
      res.status(404).send('Story not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching story');
  }
});
// Update Story (POST)
app.post('/update/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  try {
    await pool.query('UPDATE stories SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [title, content, id]);
    res.redirect(`/read/${id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating story');
  }
});

// Delete Story (DELETE)
app.get('/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM stories WHERE id = $1', [id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting story');
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on port http://localhost:3000');
});
