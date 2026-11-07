import { Router } from "express";
import {
    createOrder,
    getOrderHistory,
    getOrderById,
    cancelOrder,
} from "../controllers/order.controller.js";
import {
    createAddress,
    getAddresses,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
} from "../controllers/order.controller.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// --- Order Routes (Protected) ---
router.route("/orders").post(verifyJWT, createOrder);
router.route("/orders").get(verifyJWT, getOrderHistory);
router.route("/orders/:orderId").get(verifyJWT, getOrderById);
router.route("/orders/:orderId/cancel").patch(verifyJWT, cancelOrder);

// --- Address Routes (Protected) ---
router.route("/addresses").post(verifyJWT, createAddress);
router.route("/addresses").get(verifyJWT, getAddresses);
router.route("/addresses/:addressId").patch(verifyJWT, updateAddress);
router.route("/addresses/:addressId").delete(verifyJWT, deleteAddress);
router.route("/addresses/:addressId/set-default").patch(verifyJWT, setDefaultAddress);

export default router;
