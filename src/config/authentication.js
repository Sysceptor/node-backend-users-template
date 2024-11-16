import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const {ACCESS_TOKEN_SECRET_KEY,JWT_TOKEN_LIFE} = process.env;

export async function genHashedPassword(pwd,rounds = 10) {
    try {
        const salt = await bcrypt.genSalt(rounds);
        const genHashed = await bcrypt.hash(pwd,salt);
        return genHashed;

    } catch (e) {
        console.error("Error generating hashed password",e);
        throw e;
    }
}

export async function compareHasedPassword(pwd,storedPwd){
    try{
        const compare = await bcrypt.compare(pwd,storedPwd);
        console.log("compared Hashed Password");
        return compare;
    }catch(e){
        console.log("Error comparing hashed password",e);
        throw e;
    }
}

export const genJwtToken = (payload,SECRET_KEY=ACCESS_TOKEN_SECRET_KEY,expiresIn=JWT_TOKEN_LIFE) => jwt.sign(payload,SECRET_KEY,{ expiresIn });
export const jwtVerifier = (token,SECRET_KEY=ACCESS_TOKEN_SECRET_KEY) => jwt.verify(token,SECRET_KEY);
export const jwtDecoder = (token) => jwt.decode(token);

export function isJWTExpired(token,SECRET_KEY){
    try{
        const jwtv = jwtVerifier(token,SECRET_KEY);
        return {
            status:false,
            exp: jwtv.exp
        }; 
    }catch(e){
        
        if(e.name === "TokenExpiredError"){ 
            return {
                status:true,
                exp:jwtDecoder(token).exp
            }; 
        } 
        return {[e.name]:e.message };
    }
}