import mongoose from "mongoose";
const { MD_URL, MDI_URL } = process.env;

const DB = {}; 

export const mongoDBConnect = (url, databaseName, conncetionName) => {
    try {
        const connection = mongoose.createConnection(url, {
            dbName: databaseName,
        });

        DB[conncetionName] = connection;
        console.log(`Connected to MongoDB database: ${databaseName} successfully`);
        
    } catch (e) {
        console.error(`Error connecting to database ${databaseName}: ${e.message}`);
        process.exit(1); 
    }
};


mongoDBConnect(MD_URL, "ecomx", "MDB");
mongoDBConnect(MDI_URL, "geoaccess", "DB1");

export default DB; 
