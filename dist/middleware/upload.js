"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProductImages = exports.uploadMultiple = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
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
exports.default = upload;
