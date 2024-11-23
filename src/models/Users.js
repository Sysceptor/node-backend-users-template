import mongoose from "mongoose";
import { genHashedPassword, compareHasedPassword } from "../config/authentication.js";
import DB from "../config/db.js";

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: function (v) {
                    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
                },
                message: props => `${props.value} is not a valid email address!`
            }
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
            lowercase: true,
            minlength: [3, 'Username must be at least 3 characters long'],
            maxlength: [30, 'Username cannot exceed 30 characters']
        },
        firstname: {
            type: String,
            required: [true, 'firstname is required'],
            trim: true,
            lowercase: true,
            minlength: [3, 'firstname must be at least 3 characters long'],
            maxlength: [30, 'firstname cannot exceed 30 characters']
        },
        lastname: {
            type: String,
            trim: true,
            lowercase: true,
            minlength: [3, 'lastname must be at least 3 characters long'],
            maxlength: [30, 'lastname cannot exceed 30 characters']
        },
        password: {
            type: String,
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true
        },
        deleted: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: false },
        avatar: { type: String },
        role: {
            type: String,
            required: [true, 'Role is required'],
            default: "user",
            enum: ["user", "admin", "superadmin"]
        },
        verificationToken: { type: String },
    },
    {
        timestamps: true
    }
);

// Pre-save hook to hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await genHashedPassword(this.password);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = function (password) {
    return compareHasedPassword(password, this.password);
};

// Create and export the user model
const UserModel = DB.MDB.model("User", userSchema);
export default UserModel;
