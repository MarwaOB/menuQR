const express = require("express")
const app = express()
const cors = require("cors")

app.use(cors());
require('dotenv').config();

app.use(express.json());

require('dotenv').config();

app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

// running the server 
const host =  'http://localhost';
app.listen(process.env.PORT, () => {
  console.log(`server running on ${host}:${process.env.PORT}`);
})

// Route imports
/*const { router: authRoutes, authenticateToken } = require('./routes/authroutes');
app.use('/api/auth', authRoutes); */







