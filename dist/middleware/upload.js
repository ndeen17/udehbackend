"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImageFile = exports.getImageUrl = exports.uploadProductImages = exports.uploadMultiple = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadDir = path_1.default.join(process.cwd(), 'public', 'uploads', 'products');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        const filename = `${timestamp}-${random}${extension}`;
        cb(null, filename);
    }
});
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'), false);
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10
    },
    fileFilter: fileFilter
});
exports.uploadSingle = upload.single('image');
exports.uploadMultiple = upload.array('images', 10);
exports.uploadProductImages = upload.fields([
    { name: 'primaryImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 9 }
]);
const getImageUrl = (filename) => {
    return `/uploads/products/${filename}`;
};
exports.getImageUrl = getImageUrl;
const deleteImageFile = (filename) => {
    try {
        const filePath = path_1.default.join(uploadDir, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error('Error deleting image file:', error);
    }
};
exports.deleteImageFile = deleteImageFile;
exports.default = upload;
