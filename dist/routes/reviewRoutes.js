"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const reviewController_1 = require("../controllers/reviewController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/products/:productId/reviews', reviewController_1.getProductReviews);
router.post('/products/:productId/reviews', auth_1.authenticate, reviewController_1.createReview);
router.get('/products/:productId/reviews/me', auth_1.authenticate, reviewController_1.getUserProductReview);
router.put('/reviews/:reviewId', auth_1.authenticate, reviewController_1.updateReview);
router.delete('/reviews/:reviewId', auth_1.authenticate, reviewController_1.deleteReview);
router.post('/reviews/:reviewId/helpful', auth_1.authenticate, reviewController_1.markReviewHelpful);
exports.default = router;
