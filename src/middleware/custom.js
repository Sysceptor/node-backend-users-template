import mongoose from "mongoose";
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import ProductModel from "../models/Products.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateProductId = (req, res, next) => {
    try {
        const productId = new mongoose.Types.ObjectId();
        req.productId = productId;
        next();
    } catch (error) {
        console.error("Error generating product ID:", error);
        res.status(500).json({ status:"failed",message: "Failed to generate product ID" });
        next(error); 
    }
};

// export async function generateStaticFiles(req, res, next) {
//     const { categories } = req.query;
//     const { seller } = req.body;
//     console.log(categories, seller);
//     try {
//         if (categories && seller) {
//             const productData = await ProductModel.findOne({ categories, seller }).select('images -_id');
//             console.log(productData);
//             const folder = productData.images[0].split("/")[0];
//             if (folder === "images") {
//                 return express.static(path.join(__dirname, `src/${folder}`));
//             }
//             if (folder === "uploads") {
//                 return express.static(path.join(__dirname, `${folder}`));
//             }
//         } else {
//             console.log("no datafound")
//         }
//         next()
//         // express.static(path.join(__dirname, 'src/images'))
//     } catch (error) {
//         console.log(error);
//     }

// }
