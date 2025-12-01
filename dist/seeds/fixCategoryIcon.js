"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Category_1 = require("../models/Category");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fixCategoryIcon = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://nurudeeny17:Rich4ever@cluster0.gkcwpna.mongodb.net/udehglobal';
        await mongoose_1.default.connect(uri);
        console.log('✅ MongoDB Connected');
        const result = await Category_1.Category.updateOne({ slug: 'shoes' }, { $set: { iconName: 'Footprints' } });
        if (result.modifiedCount > 0) {
            console.log('✅ Updated Shoes category icon to Footprints');
        }
        else {
            console.log('ℹ️  Shoes category already has the correct icon or was not found');
        }
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};
fixCategoryIcon();
