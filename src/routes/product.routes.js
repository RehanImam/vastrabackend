
import { Router } from "express";
import {
  getUploadSignature,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { verifyJWT, requireAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/upload-signature", verifyJWT, requireAdmin, getUploadSignature);
router.route("/products").get(getAllProducts).post(verifyJWT, requireAdmin, createProduct);
router.route("/products/:productId").get(getProductById).patch(verifyJWT, requireAdmin, updateProduct).delete(verifyJWT, requireAdmin, deleteProduct);

export default router;