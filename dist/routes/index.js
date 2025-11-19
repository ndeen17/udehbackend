"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const categories_1 = __importDefault(require("./categories"));
const products_1 = __importDefault(require("./products"));
const cart_1 = __importDefault(require("./cart"));
const orders_1 = __importDefault(require("./orders"));
const users_1 = __importDefault(require("./users"));
const admin_1 = __importDefault(require("./admin"));
const router = (0, express_1.Router)();
router.use('/auth', auth_1.default);
router.use('/categories', categories_1.default);
router.use('/products', products_1.default);
router.use('/cart', cart_1.default);
router.use('/orders', orders_1.default);
router.use('/users', users_1.default);
router.use('/admin', admin_1.default);
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'UDEH GLOBAL API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
exports.default = router;
