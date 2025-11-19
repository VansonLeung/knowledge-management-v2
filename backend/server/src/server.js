require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const ragService = require('./services/rag');

const PORT = process.env.PORT || 16001;

async function startServer() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Initialize RAG Service (Elasticsearch)
    await ragService.initialize('elasticsearch', {
      node: process.env.ELASTICSEARCH_NODE,
      username: process.env.ELASTICSEARCH_USERNAME,
      password: process.env.ELASTICSEARCH_PASSWORD
    });
    console.log('RAG Service (Elasticsearch) initialized.');

    // Sync models (use { force: true } only for dev/reset)
    // await sequelize.sync({ alter: true }); 
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database or RAG service:', error);
  }
}

startServer();
