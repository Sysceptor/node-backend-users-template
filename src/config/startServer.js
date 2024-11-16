import DB from "./db.js";

function startServer(app, PORT) {
  try {
    for (const key in DB) {
      if (DB.hasOwnProperty(key)) {
        DB[key];
      }
    }
    
    app.listen(PORT, () => console.log(`Server running on port http://localhost:${PORT}/`));
  } catch (error) {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1); 
  }
}

export default startServer;