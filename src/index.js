import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
//need to uninstall the user-agent;
import useragent from "express-useragent";

//kickstarter
import startServer from "./config/startServer.js";
// Routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from './routes/userRoutes.js';

import { logIpForUser } from "./controllers/ipController.js";

const app = express();
const PORT = 3300;

const corsOptions = {
    origin: 'http://localhost:5173',  
    credentials: true, 
  };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", true);

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(useragent.express());
app.enable('trust proxy');

//Routes
app.use('/auth', authRoutes);
app.use('/admin', userRoutes);

app.get('/',(req, res) => {
   const uAgent = req.useragent;
   let result = {};
   for(let [key,value] of Object.entries(uAgent)){
    if(value===true || ["os", "browser", "version", "platform", "source"].includes(key)){
        result[key] = value;
    }

   }
   result["ip"]=req.ip
    res.send(result);
});

const staticFile = folderPath => express.static(path.join(__dirname, folderPath));
app.use('/images', staticFile('src/images'));
app.use('/uploads', staticFile('public/uploads'));

app.get('/cdn/companylogo', (req, res) => {
    res.sendFile(path.join(__dirname, 'images', 'ecom-x.svg'));
});

app.get('/:imageName', (req, res) => {
    const imageName = req.params.imageName; 
    const imagePath = path.join(__dirname, 'images', imageName);

    res.sendFile(imagePath, (err) => {
        if (err) {
            res.status(404).send('Image not found');
        }
    });
});


const newIpLog = {
    address: '8.8.8.8',
    region: 'California',
    country: 'US',
    timezone: 'America/Los_Angeles',
    org: 'Google',
    createdat: new Date() 
};


logIpForUser('user123', newIpLog);

startServer(app, PORT);

