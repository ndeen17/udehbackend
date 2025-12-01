"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Category_1 = require("../models/Category");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const fixShoesIcon = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://nurudeeny17:Rich4ever@cluster0.gkcwpna.mongodb.net/udehglobal';
        await mongoose_1.default.connect(uri);
        console.log('✅ MongoDB Connected');
        const shoesCategory = await Category_1.Category.findOne({ slug: 'shoes' });
        if (!shoesCategory) {
            console.log('❌ Shoes category not found');
            process.exit(1);
        }
        console.log('📍 Current shoes category:');
        console.log(`   Name: ${shoesCategory.name}`);
        console.log(`   Icon: ${shoesCategory.iconName}`);
        shoesCategory.iconName = 'Footprints';
        await shoesCategory.save();
        console.log('✅ Updated shoes category icon to: Footprints');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};
fixShoesIcon();
