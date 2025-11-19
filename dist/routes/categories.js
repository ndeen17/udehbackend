"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const router = (0, express_1.Router)();
router.get('/', categoryController_1.categoryController.getAllCategories);
router.get('/:slug', categoryController_1.categoryController.getCategoryBySlug);
router.get('/:slug/products', categoryController_1.categoryController.getProductsByCategory);
exports.default = router;
